"""Inventory every page on www.cukashmir.ac.in through its JSON API (cukapi.disgenweb.in).

The site is an Angular SPA: page bodies come from POST calls, and many menu items have no href,
so a link-following browser crawler misses them. This walks every content tree from the API,
follows `#/route;id=...` links found inside page bodies, pulls the flat lists (notices, results, ...),
and scores each page so you can see which ones hold real information.

Usage: python scripts/api_crawl.py [--out data/api_crawl] [--reclassify] [--docs]
Writes pages.jsonl (one record per page, with full text) and inventory.csv (one row per page, no text).
--docs then downloads the PDFs linked from keep/follow pages into docs/ (named by doc_filename) for ingest.py.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = "https://cukapi.disgenweb.in/"
SITE = "https://www.cukashmir.ac.in/#/"
HEADERS = {"Content-Type": "application/json", "Accept": "application/json", "langtype": "1", "User-Agent": "cuk-rag-crawler"}
DELAY_S = 0.2  # be polite: the API has no documented rate limit

GUID = r"[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}"
ROUTE_LINK_RE = re.compile(rf"#/([A-Za-z-]+);id=({GUID})(?:;menuid=({GUID}))?")
# Files live under /p/<module>/ and their names contain spaces, so match up to the extension.
DOC_RE = re.compile(r"https?://cukapi\.disgenweb\.in/p/[^\"'<>]+?\.(?:pdf|docx?|xlsx?|pptx?)", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?\b\d{10}\b|\b0\d{2,4}[\s-]\d{6,8}\b")

# Route in the site URL -> "ById" endpoint that returns [node, *children]. Found in the site's JS bundles.
TREE_ENDPOINTS = {
    "departlist": "headercategory/headercategoryListById",  # top-menu content pages
    "content": "headercategory/headercategoryListById",
    "administration": "administrative/administrativeListById",
    "administrative-list": "administrative/administrativeListById",
    "departmentList": "department/departmentListById",
    "studentzone": "studentzone/studentzoneListById",
}

# Flat lists: every item is one page/notice. Body {langType: 1} unless the endpoint is GET.
FLAT_LISTS = [
    "noticeboard/getGeneralNoticesForWebSite",
    "pressrelease/getAllPressReleasesForWebSite",
    "whatnew/getAllWhatNewForWebSite",
    "admission/all",
    "examdatesheet/ExamDateSheetList",
    "examinationresult/ExaminationResultListForWebSite",
    "scholarresults/ScholarExaminationResultListForWebSite",
    "examnotification/getAllNotificationForWebSite",
    "itandservices/ItAndServicesNotificationListForWebSite",
    "tender/getalltender",
    "employments/allemploymentsforwebsite",
    "event/getallupcomingeventsforwebsite",
    "universitydoc/selectforwebsite",
    "universityinitiatives/selectinitforwebsite",
    "implink/selectimplinksforwebsite",
    "policy/selectpolicyforwebsite",
    "messages/allmessagesforwebsite",
    "promotions/getPromotionsForPublic",
    "howtoreachcuk/gethowtoreachcuk",
    "moe/getAllPressReleasesForWebSite",
]

DETAIL_ENDPOINTS = {"noticeboard", "pressrelease", "moe"}  # items with ContentType "Page" keep their body behind {module}/selectbyid
PAGE_SIZE = 200  # list endpoints page with {seen, next}; the site itself asks for 20

STRUCTURED_NAMES =re.compile(r"faculty|staff|head of|hod|gallery|photo|employee|officers?\b", re.I)


class Api:
    def __init__(self) -> None:
        self.calls = 0
        self.errors: Counter[str] = Counter()

    def call(self, endpoint: str, body: dict | None = None):
        time.sleep(DELAY_S)
        self.calls += 1
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(API + endpoint, data=data, headers=HEADERS, method="POST" if data else "GET")
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=40) as res:
                    raw = res.read().decode("utf-8", errors="replace").strip()
                return json.loads(raw) if raw else []
            except urllib.error.HTTPError as exc:  # a 4xx/5xx will not fix itself on retry
                self.errors[f"{endpoint}: HTTP {exc.code}"] += 1
                return None
            except Exception as exc:  # one bad endpoint must not stop the inventory
                if attempt:
                    self.errors[f"{endpoint}: {type(exc).__name__}"] += 1
                    return None
                time.sleep(3)
        return None


def fetch_list(api: Api, endpoint: str) -> list[dict]:
    items: list[dict] = []
    while True:
        page = api.call(endpoint, {"langType": 1, "seen": len(items), "next": PAGE_SIZE})
        if page is None and not items:
            page = api.call(endpoint)  # a few list endpoints are GET
        if isinstance(page, dict):
            page = next((v for v in page.values() if isinstance(v, list)), [page])
        if isinstance(page, list) and page and isinstance(page[0], list):  # e.g. tender/getalltender returns [[...]]
            page = page[0]
        page = [p for p in page or [] if isinstance(p, dict)]
        fresh = [p for p in page if p not in items]
        items.extend(fresh)
        total = int(page[0].get("TotalRecords") or 0) if page else 0
        # Stop when a page is short, repeats itself (endpoint ignores paging), or the total is reached.
        if len(page) < PAGE_SIZE or not fresh or (total and len(items) >= total):
            return items


def html_to_text(raw: str) -> str:
    raw = re.sub(r"(?i)Powered by Froala Editor", " ", raw or "")
    raw = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)<br\s*/?>|</(p|div|li|tr|h\d)>", "\n", raw)
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return "\n".join(" ".join(line.split()) for line in text.splitlines() if line.strip())


def field(row: dict, suffix: str) -> str:
    """Rows use a per-section prefix (DepartmentName, AdministrativeName, ...): match on the suffix."""
    for key, value in row.items():
        if key.endswith(suffix) and not key.startswith("Parent"):
            return "" if value is None else str(value)
    return ""


def dup_key(rec: dict) -> str:
    # Same text with different files is not a duplicate (e.g. PhD result notices share one title).
    return rec["text_hash"] + "|" + "|".join(rec["documents"]) if rec["text_hash"] else ""


def classify(rec: dict, seen_keys: set[str]) -> tuple[str, str]:
    chars, docs = rec["chars"], rec["doc_count"]
    facts = rec["emails"] + rec["phones"]
    if chars > 0 and dup_key(rec) in seen_keys:
        return "drop", "duplicate text"
    if chars < 50 and STRUCTURED_NAMES.search(rec["title"]) and rec["kind"] == "tree":
        return "reroute", "content comes from a structured endpoint"
    if chars >= 300 or facts > 0 or rec["table_rows"] >= 3:
        return "keep", "substantive text or facts"
    if docs > 0:
        return "follow", "short page pointing at documents"
    if rec["external_url"]:
        return "drop", "external link only"
    return "drop", "empty" if chars == 0 else "too short"


def make_record(kind: str, section: str, url: str, title: str, raw_html: str, updated: str, external_url: str = "") -> dict:
    text = html_to_text(raw_html)
    docs = sorted(set(DOC_RE.findall(raw_html or "")))
    return {
        "kind": kind,
        "section": section,
        "url": url,
        "title": " ".join(title.split()),
        "updated": (updated or "")[:10],
        "external_url": external_url.strip(),
        "chars": len(text),
        "doc_count": len(docs),
        "emails": len(set(EMAIL_RE.findall(text))),
        "phones": len(set(PHONE_RE.findall(text))),
        "table_rows": (raw_html or "").lower().count("<tr"),
        "text_hash": hashlib.sha1(text.encode()).hexdigest()[:16] if text else "",
        "documents": docs,
        "text": text,
    }


def crawl() -> tuple[list[dict], Api]:
    api = Api()
    records: list[dict] = []
    queue: deque[tuple[str, str, str]] = deque()  # (route, node_id, root_id)
    visited: set[tuple[str, str]] = set()

    def discover(blob: str) -> None:
        for route, rid, menuid in ROUTE_LINK_RE.findall(blob or ""):
            if route in TREE_ENDPOINTS:
                queue.append((route, menuid or rid, rid))

    # 1. Top menu
    menu = api.call("headercategory/headercategoryList") or []
    for item in menu:
        ext = (item.get("ExternalLinkUrl") or "").strip()
        if ext:
            discover(ext)
        elif not item.get("IsExternalLink"):
            queue.append(("departlist", item["HeaderCategoryMasterId"], item["HeaderCategoryMasterId"]))

    # 2. Schools -> departments
    schools = api.call("school/schoolList") or []
    dept_roots: list[str] = []
    for school in schools:
        sid = school.get("SchoolMasterId")
        for dept in api.call("department/getMappedDepartmentListBySchoolMasterId", {"SchoolMasterId": sid}) or []:
            mid = dept.get("DepartmentMasterId")
            if mid:
                queue.append(("departmentList", mid, mid))
                dept_roots.append(mid)

    faculty_done: set[str] = set()

    def walk_trees() -> None:
        while queue:
            route, node_id, root_id = queue.popleft()
            key = (TREE_ENDPOINTS[route], node_id.upper())
            if key in visited:
                continue
            visited.add(key)
            body = {"Id": node_id, "LangType": 1}
            rows = api.call(TREE_ENDPOINTS[route], body)
            if not isinstance(rows, list) or not rows:
                continue
            node, children = rows[0], rows[1:]
            raw = field(node, "Description")
            discover(raw)
            url = f"{SITE}{route};id={root_id}" + (f";menuid={node_id}" if node_id.upper() != root_id.upper() else "")
            records.append(make_record("tree", route, url, field(node, "Name"), raw, node.get("UpdatedOn", ""), node.get("ExternalLinkUrl") or ""))
            for child in children:
                cid = field(child, "MasterId")
                ext = (child.get("ExternalLinkUrl") or "").strip()
                if ext:
                    discover(ext)
                if cid and not (child.get("IsExternalLink") and ext):
                    queue.append((route, cid, root_id))

            # Structured content that the tree page itself leaves empty
            if route == "departmentList" and node_id.upper() == root_id.upper():
                inner = node.get("DepartmentId")
                if inner and inner not in faculty_done:
                    faculty_done.add(inner)
                    for f in api.call("faculty/getallforwebsite", {"DepartmentId": inner, "langType": 1}) or []:
                        name = f"{f.get('FirstName') or ''} {f.get('LasttName') or ''}".strip()
                        raw_f = "<br>".join(str(f.get(k) or "") for k in ("Designation", "Email", "MobileNo", "OfficeAddress", "Details"))
                        records.append(make_record("faculty", "faculty", url, f"{name} - {field(node, 'Name')}", raw_f, f.get("UpdatedOn", "")))
            if route in ("administration", "administrative-list") and STRUCTURED_NAMES.search(field(node, "Name")):
                for e in api.call("employeeprofile/getallforwebsite", {"langType": 1, "SectionId": node_id}) or []:
                    raw_e = "<br>".join(str(v) for v in e.values() if isinstance(v, str))
                    records.append(make_record("staff", "administration", url, str(e.get("Name") or e.get("FirstName") or "staff"), raw_e, e.get("UpdatedOn", "")))

    # 3. Flat lists first, so links found in them join the tree walk
    for endpoint in FLAT_LISTS:
        module = endpoint.split("/")[0]
        for item in fetch_list(api, endpoint):
            blob = json.dumps(item, ensure_ascii=False)
            discover(blob)
            title = next(
                (str(item[k]) for k in sorted(item, key=lambda k: "title" not in k.lower()) if re.search(r"title|^name$|subject|heading", k, re.I) and item[k]),
                endpoint,
            )
            raw = str(item.get("Description") or item.get("Descrition") or item.get("Result_Description") or "")  # "Descrition": API typo on policy
            if item.get("ContentType") == "Page" and module in DETAIL_ENDPOINTS and item.get("uniqueId"):
                detail = api.call(f"{module}/selectbyid", {"langType": 1, "Id": item["uniqueId"]})
                if isinstance(detail, list) and detail:
                    raw = str(detail[0].get("Description") or raw)
            rec = make_record("list", module, f"{SITE}notifications", title, f"{title}<br>{raw}", str(item.get("UpdatedOn") or item.get("CreatedOn") or ""))
            file_url = str(item.get("HttpPath") or "")
            rec["documents"] = sorted(set(rec["documents"]) | set(DOC_RE.findall(blob)) | ({file_url} if file_url.startswith("http") else set()))
            rec["doc_count"] = len(rec["documents"])
            records.append(rec)

    # 4. Walk every tree, following links found in page bodies and lists

    walk_trees()

    classify_all(records)
    return records, api


def doc_filename(url: str) -> str:
    """Stable local name for a document URL; ingest.py uses the same rule to find it."""
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + ".pdf"


def download_docs(records: list[dict], out: Path) -> None:
    # shortcut: PDFs only (2,826 of 2,835 links); the 6 .docx would need python-docx in ingest.
    urls = sorted({d for r in records if r["group"] in ("keep", "follow") for d in r["documents"] if d.lower().endswith(".pdf")})
    folder = out / "docs"
    folder.mkdir(exist_ok=True)
    todo = [u for u in urls if not (folder / doc_filename(u)).exists()]
    failures: list[str] = []

    def fetch(url: str) -> None:
        req = urllib.request.Request(urllib.parse.quote(url, safe=":/%"), headers={"User-Agent": HEADERS["User-Agent"]})
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                body = res.read()
        except Exception as exc:
            failures.append(f"{url}: {exc}")
            return
        if not body.startswith(b"%PDF"):
            failures.append(f"{url}: not a PDF")
            return
        dest = folder / doc_filename(url)
        tmp = dest.with_suffix(".part")
        tmp.write_bytes(body)
        tmp.replace(dest)  # never leave a half file that a rerun would skip

    # The file host is slow per connection (~100 KB/s), so a few downloads run at once.
    with ThreadPoolExecutor(max_workers=6) as pool:
        for i, _ in enumerate(pool.map(fetch, todo), 1):
            if i % 100 == 0:
                print(f"  {i}/{len(todo)} documents", flush=True)
    for line in failures:
        print("  failed", line)
    got, skipped, failed = len(todo) - len(failures), len(urls) - len(todo), len(failures)
    print(f"Documents: {len(urls)} PDFs, {got} downloaded, {skipped} already present, {failed} failed")


def classify_all(records: list[dict]) -> None:
    seen: set[str] = set()
    for rec in records:
        rec["group"], rec["reason"] = classify(rec, seen)
        if rec["text_hash"]:
            seen.add(dup_key(rec))


def _selftest() -> None:
    assert doc_filename("https://x/a.pdf") != doc_filename("https://x/b.pdf")
    doc = "https://cukapi.disgenweb.in/p/noticeboard/1794491480914-advertisement EOI Website (2).pdf"
    assert DOC_RE.findall(f'<a href="{doc}">x</a>') == [doc]
    assert html_to_text("<p>Hi&nbsp;there</p><p>Powered by Froala Editor</p>") == "Hi there"
    seen: set[str] = set()
    long = make_record("tree", "s", "u", "Intro", "x" * 400, "")
    assert classify(long, seen) == ("keep", "substantive text or facts")
    assert classify(long, {dup_key(long)})[0] == "drop"
    a = make_record("list", "s", "u", "PhD result", f'<a href="{doc}">r</a>', "")
    b = make_record("list", "s", "u", "PhD result", f'<a href="{doc.replace("(2)", "(3)")}">r</a>', "")
    assert classify(b, {dup_key(a)})[0] == "follow"  # same text, different file: not a duplicate
    assert classify(make_record("tree", "s", "u", "Faculty", "", ""), seen)[0] == "reroute"
    assert classify(make_record("list", "s", "u", "Notice", f'<a href="{doc}">n</a>', ""), seen)[0] == "follow"
    assert classify(make_record("tree", "s", "u", "Vision", "Updation under process", ""), seen) == ("drop", "too short")


def main() -> None:
    _selftest()
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/api_crawl")
    ap.add_argument("--reclassify", action="store_true", help="re-run grouping on the saved pages.jsonl, no network")
    ap.add_argument("--docs", action="store_true", help="also download PDFs linked from keep/follow pages (resumable)")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    if args.reclassify:
        records = [json.loads(line) for line in (out / "pages.jsonl").open(encoding="utf-8")]
        classify_all(records)
        api = Api()
    else:
        records, api = crawl()

    with (out / "pages.jsonl").open("w", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    cols = ["group", "reason", "kind", "section", "title", "chars", "doc_count", "emails", "phones", "table_rows", "updated", "url"]
    with (out / "inventory.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols + ["preview"], extrasaction="ignore")
        w.writeheader()
        for rec in records:
            w.writerow({**rec, "preview": rec["text"][:160].replace("\n", " ")})

    docs = {d for r in records for d in r["documents"]}
    print(f"API calls: {api.calls} in {int(time.time() - t0)}s")
    print(f"Records: {len(records)}  unique documents linked: {len(docs)}")
    print("By kind:", dict(Counter(r["kind"] for r in records)))
    print("By section:", dict(Counter(r["section"] for r in records)))
    print("By group:", dict(Counter(r["group"] for r in records)))
    print("Drop reasons:", dict(Counter(r["reason"] for r in records if r["group"] == "drop")))
    if api.errors:
        print("Errors:", dict(api.errors))
    if args.docs:
        download_docs(records, out)


if __name__ == "__main__":
    main()
