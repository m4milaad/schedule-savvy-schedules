from __future__ import annotations

import logging
import re
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

SEED_URLS = [
    "https://www.cukashmir.ac.in/#/publiczone",
    "https://www.cukashmir.ac.in/admission",
    "https://www.cukashmir.ac.in/notices",
    "https://www.cukashmir.ac.in/examination",
    # "https://www.ugc.gov.in",
    "https://www.cukashmir.ac.in/#/notifications?type=General%20Notices",
    "https://www.cukashmir.ac.in/#/departlist;id=AED760BD-36B6-4D11-AC94-44D136088505",
    "https://www.cukashmir.ac.in/#/departlist;id=397295BC-B6BD-4D3F-8CFF-80A6327410C7",
    "https://www.cukashmir.ac.in/#/departlist;id=6B31D492-45D6-433B-9637-C4CD70E41B64",
    "https://www.cukashmir.ac.in/#/departlist;id=148B93D4-8BDC-47A2-AD7A-7DD50D670469",
    "https://www.cukashmir.ac.in/#/departlist;id=4B5ACB21-03C4-4944-9F4E-5B041A977EB1",
    "https://www.cukashmir.ac.in/#/departlist;id=EDC30EE7-D2C8-49CB-ADD3-B2DD0ECE8374",
    "https://www.cukashmir.ac.in/#/departlist;id=8E88C6B7-3749-4271-9384-6336FA7C4C9A",
    "https://cukashmir.in/",
    "https://cukashmir.in/pages/about/cu-kashmir",
    "https://cukashmir.in/pages/about/vision",
    "https://cukashmir.in/pages/about/objectives",
    "https://cukashmir.in/pages/about/logo",
    "https://cukashmir.in/pages/about/acts-ordinances-etc",
    "https://cukashmir.in/pages/about/statutory-bodies",
    "https://cukashmir.in/pages/about/organogram",
    "https://cukashmir.in/pages/about/how-to-reach",
    "https://cukashmir.in/pages/campuses/main-campus",
    "https://cukashmir.in/pages/campuses/green-campus",
    "https://cukashmir.in/pages/campuses/science-campus",
    "https://cukashmir.in/pages/campuses/arts-campus",
    "https://cukashmir.in/pages/academics/dean-academics-affairs",
    "https://cukashmir.in/pages/academics/schools-of-study",
    "https://cukashmir.in/pages/academics/deans",
    "https://cukashmir.in/pages/academics/departments",
    "https://cukashmir.in/pages/academics/university-centres",
    "https://cukashmir.in/pages/academics/heads-coordinators",
    "https://cukashmir.in/pages/academics/programmes-offered",
    "https://cukashmir.in/pages/academics/mdc-aec-vbc-sec",
    "https://cukashmir.in/pages/research/directorate-of-rd",
    "https://cukashmir.in/pages/research/research-programmes-offered",
    "https://cukashmir.in/pages/research/knowledge-creativity-zone",
    "https://cukashmir.in/pages/contact",
    "https://www.cukashmir.ac.in/#/departlist;id=ACED671E-26F3-49BA-A365-A61C540D645F",
    "https://www.cukashmir.ac.in/#/departlist;id=51C71663-4297-4866-AC49-22D2DDD4D4DC",
]

ALLOWED_HOSTS = {"www.cukashmir.ac.in", "cukashmir.ac.in", "www.ugc.gov.in", "ugc.gov.in"}
MAX_PAGES = 120

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("scrape_cuk")

# Reject regex matches that look like asset filenames, not mailboxes
_BOGUS_EMAIL_SUFFIXES = (
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".js",
    ".css",
    ".ico",
    ".pdf",
)

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b"
)
# Indian mobiles, +91, optional separators; landline-style clusters (e.g. 0194-xxx-xxxx)
PHONE_PATTERNS = [
    re.compile(
        r"(?:\+91|0091)[\s.\-]?(?:\(?0?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,6}|[6-9]\d{9})"
    ),
    re.compile(r"(?<!\d)0\d{2,4}[\s.\-/]\d{3,4}[\s.\-/]\d{3,6}(?!\d)"),
    re.compile(r"(?<!\d)(?:\+91[\s.\-]*)?[6-9]\d{9}(?!\d)"),
]


def _plausible_email(addr: str) -> bool:
    addr = addr.lower().strip()
    if "@" not in addr:
        return False
    domain = addr.rsplit("@", 1)[-1]
    return not any(domain.endswith(sfx) for sfx in _BOGUS_EMAIL_SUFFIXES)


def _safe_name(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/") or "home"
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", f"{parsed.netloc}_{path}")[:120].strip("_")
    return f"{slug}.txt"


def _extract_text(soup: BeautifulSoup) -> str:
    for bad in soup(["script", "style", "noscript"]):
        bad.decompose()
    return "\n".join(line.strip() for line in soup.get_text("\n").splitlines() if line.strip())


def _decode_obfuscated_email(fragment: str) -> str | None:
    """Handle common 'user [at] domain [dot] com' patterns in text."""
    t = fragment.strip()
    if not t:
        return None
    t = re.sub(r"\s*\[\s*at\s*\]\s*", "@", t, flags=re.I)
    t = re.sub(r"\s*\(\s*at\s*\)\s*", "@", t, flags=re.I)
    t = re.sub(r"\s*\[\s*dot\s*\]\s*", ".", t, flags=re.I)
    t = re.sub(r"\s*\(\s*dot\s*\)\s*", ".", t, flags=re.I)
    if "@" in t and "." in t.split("@", 1)[-1]:
        m = EMAIL_PATTERN.search(t.replace(" ", ""))
        return m.group(0) if m else None
    return None


def _emails_from_mailto(href: str) -> list[str]:
    href = href.strip()
    if not href.lower().startswith("mailto:"):
        return []
    rest = href[7:].split("?", 1)[0].strip()
    if not rest:
        return []
    # mailto:a@b.com,c@d.com
    out: list[str] = []
    for part in rest.split(","):
        part = unquote(part.strip())
        if EMAIL_PATTERN.fullmatch(part) and _plausible_email(part):
            out.append(part.lower())
        elif m := EMAIL_PATTERN.search(part):
            e = m.group(0)
            if _plausible_email(e):
                out.append(e.lower())
    return out


def _phones_from_tel(href: str) -> list[str]:
    href = href.strip()
    if not href.lower().startswith("tel:"):
        return []
    raw = href[4:].split(";", 1)[0].strip()
    if not raw:
        return []
    # Keep a readable form; strip only obvious URL noise
    cleaned = re.sub(r"[\s]+", " ", raw)
    return [cleaned] if any(ch.isdigit() for ch in cleaned) else []


def _clean_label(s: str, max_len: int = 140) -> str:
    s = re.sub(r"\s+", " ", s).strip(" -:–—|•\t")
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


def _looks_like_phone_or_email_only(text: str) -> bool:
    t = text.strip()
    if not t:
        return True
    if EMAIL_PATTERN.fullmatch(t) and _plausible_email(t.lower()):
        return True
    digits = sum(ch.isdigit() for ch in t)
    if digits >= 7 and digits / max(len(t), 1) > 0.5:
        return True
    return False


def _label_for_anchor(tag: Tag) -> str:
    for attr in ("aria-label", "title"):
        v = tag.get(attr)
        if v and str(v).strip():
            return _clean_label(str(v)) or "General contact"

    link_txt = tag.get_text(" ", strip=True)
    if link_txt and not _looks_like_phone_or_email_only(link_txt):
        return _clean_label(link_txt) or "General contact"

    cell = tag.find_parent("td") or tag.find_parent("th")
    if cell:
        row = cell.find_parent("tr")
        if row:
            cells = row.find_all(["td", "th"], recursive=False)
            try:
                idx = cells.index(cell)
                if idx > 0:
                    prev_lab = cells[idx - 1].get_text(" ", strip=True)
                    if prev_lab and not _looks_like_phone_or_email_only(prev_lab):
                        return _clean_label(prev_lab) or "General contact"
            except ValueError:
                pass

    dd = tag.find_parent("dd")
    if dd:
        dt = dd.find_previous_sibling("dt")
        if dt:
            t = dt.get_text(" ", strip=True)
            if t:
                return _clean_label(t) or "General contact"

    prev_h = tag.find_previous(["h1", "h2", "h3", "h4", "h5"])
    if prev_h:
        t = prev_h.get_text(" ", strip=True)
        if t:
            return _clean_label(t) or "General contact"

    prev_em = tag.find_previous(["strong", "b"])
    if prev_em:
        t = prev_em.get_text(" ", strip=True)
        if t and len(t) < 160:
            return _clean_label(t) or "General contact"

    return "General contact"


def _label_from_line_prefix(line: str, match_start: int) -> str:
    prefix = line[:match_start].strip()
    prefix = re.sub(
        r"(?i)\b(?:tel|telephone|phone|mobile|fax|email|e-?mail|contact|helpline)\s*[:.\-–—]?\s*$",
        "",
        prefix,
    ).strip()
    if len(prefix) >= 3:
        return _clean_label(prefix) or "From page text"
    return "From page text"


def _label_specificity(label: str) -> tuple[int, int]:
    """Higher is better: prefer real section names over generic fallbacks."""
    generic = {"general contact", "from page text"}
    lab = label.lower()
    if lab in generic:
        return (0, len(label))
    return (1, len(label))


def _merge_contacts_by_value(entries: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    """One row per (kind, value), keeping the most specific label."""
    best_label: dict[tuple[str, str], str] = {}
    for kind, lab, val in entries:
        key = (kind, val.lower())
        if key not in best_label or _label_specificity(lab) > _label_specificity(best_label[key]):
            best_label[key] = lab
    out: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()
    for kind, lab, val in entries:
        key = (kind, val.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append((kind, best_label[key], val))
    return out


def _format_contact_lines(entries: list[tuple[str, str, str]]) -> str:
    """entries: (kind, label, value) kind is 'Email' or 'Phone'."""
    if not entries:
        return ""
    lines = [
        "--- Extracted contact details (who to contact — use these labels when answering) ---",
        "Each line ties a department or role to an email or phone number from this page.",
    ]
    for kind, label, value in entries:
        lines.append(f"{kind} — {label}: {value}")
    lines.append("--- End extracted contact details ---")
    return "\n".join(lines) + "\n\n"


def _extract_emails_and_phones(soup: BeautifulSoup, body_text: str, page_title: str) -> str:
    """Collect labeled emails and phones (mailto/tel, table cells, headings, line context)."""
    # (kind, label, value) — value normalized for dedupe
    seen: set[tuple[str, str, str]] = set()
    ordered: list[tuple[str, str, str]] = []

    def add(kind: str, label: str, value: str) -> None:
        value = value.strip()
        if not value:
            return
        lab = _clean_label(label) or "General contact"
        key = (kind, lab.lower(), value.lower())
        if key in seen:
            return
        seen.add(key)
        ordered.append((kind, lab, value))

    for tag in soup.find_all("a", href=True):
        if not isinstance(tag, Tag):
            continue
        href = tag.get("href") or ""
        lab = _label_for_anchor(tag)
        for e in _emails_from_mailto(href):
            add("Email", lab, e)
        for p in _phones_from_tel(href):
            add("Phone", lab, p)

        link_txt = tag.get_text(" ", strip=True)
        if link_txt:
            for m in EMAIL_PATTERN.finditer(link_txt):
                e = m.group(0).lower()
                if _plausible_email(e):
                    add("Email", lab, e)
            for pat in PHONE_PATTERNS:
                for m in pat.finditer(link_txt):
                    add("Phone", lab, m.group(0).strip())

    scan_lines = [page_title, *body_text.splitlines()]
    for line in scan_lines:
        line = line.strip()
        if not line:
            continue
        for m in EMAIL_PATTERN.finditer(line):
            e = m.group(0).lower()
            if not _plausible_email(e):
                continue
            add("Email", _label_from_line_prefix(line, m.start()), e)

        for pat in PHONE_PATTERNS:
            for m in pat.finditer(line):
                add("Phone", _label_from_line_prefix(line, m.start()), m.group(0).strip())

    for line in body_text.splitlines():
        if "[at]" in line.lower() or "(at)" in line.lower():
            if dec := _decode_obfuscated_email(line):
                if _plausible_email(dec):
                    low = line.lower()
                    pos = low.find("[at]")
                    if pos < 0:
                        pos = low.find("(at)")
                    if pos < 0:
                        pos = 0
                    add("Email", _label_from_line_prefix(line, pos), dec.lower())

    return _format_contact_lines(_merge_contacts_by_value(ordered))


def _is_pagination_link(url: str) -> bool:
    return any(key in url.lower() for key in ["page=", "/page/", "next", "older"])


def _is_pdf(url: str) -> bool:
    return url.lower().split("?")[0].endswith(".pdf")


def _same_domain(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host in ALLOWED_HOSTS


def _is_cuk(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return "cukashmir.ac.in" in host


CUK_KEYWORDS = [
    "/admission",
    "/admissions",
    "/notice",
    "/notices",
    "/exam",
    "/examination",
    "/result",
    "/results",
    "/department",
    "/school",
    "/faculty",
    "/program",
    "/programme",
    "/course",
    "/syllabus",
    "/contact",
    "/about",
]


def crawl() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    visited: set[str] = set()
    queue = deque(SEED_URLS)
    pdf_seen: set[str] = set()

    with httpx.Client(timeout=20, follow_redirects=True, headers={"User-Agent": "CUK-RAG-Bot/1.0"}) as client:
        pages_done = 0
        while queue and pages_done < MAX_PAGES:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            try:
                res = client.get(url)
                if res.status_code >= 400:
                    logger.warning("Skipping %s (%s)", url, res.status_code)
                    continue
            except Exception as exc:
                logger.warning("Request failed for %s: %s", url, exc)
                continue

            if _is_pdf(url):
                pdf_name = _safe_name(url).replace(".txt", ".pdf")
                pdf_path = DATA_DIR / pdf_name
                try:
                    pdf_path.write_bytes(res.content)
                    logger.info("Saved PDF: %s", pdf_name)
                except Exception as exc:
                    logger.warning("Failed to save PDF %s: %s", url, exc)
                continue

            raw_html = res.text
            soup = BeautifulSoup(raw_html, "html.parser")
            page_title = soup.title.get_text(strip=True) if soup.title else "Untitled"
            body_text = _extract_text(soup)
            contact_block = _extract_emails_and_phones(soup, body_text, page_title)
            now = datetime.now(timezone.utc).isoformat()

            txt_path = DATA_DIR / _safe_name(url)
            txt_path.write_text(
                f"Source URL: {url}\nPage Title: {page_title}\nDate Scraped: {now}\n\n"
                f"{contact_block}{body_text}",
                encoding="utf-8",
            )
            pages_done += 1
            logger.info("Saved page %d: %s", pages_done, url)

            for link in soup.find_all("a", href=True):
                href = link.get("href", "").strip()
                if not href:
                    continue
                abs_url = urljoin(url, href)
                abs_url = abs_url.split("#")[0]
                if not abs_url.startswith("http"):
                    continue
                if _is_pdf(abs_url):
                    if abs_url not in pdf_seen:
                        pdf_seen.add(abs_url)
                        queue.append(abs_url)
                    continue
                if not _same_domain(abs_url):
                    continue
                if abs_url in visited:
                    continue
                if _is_cuk(abs_url):
                    # For CUK, follow a richer set of paths (admissions, departments, exams, contact, etc.)
                    if _is_pagination_link(abs_url) or any(key in abs_url.lower() for key in CUK_KEYWORDS):
                        queue.append(abs_url)
                else:
                    # For UGC (or other allowed hosts), keep to the stricter notices/admissions/exam filters.
                    if _is_pagination_link(abs_url) or any(
                        key in abs_url.lower() for key in ["/admission", "/notice", "/notices", "/exam", "/examination"]
                    ):
                        queue.append(abs_url)

    logger.info("Crawl finished. Pages saved: %d, PDFs queued: %d", pages_done, len(pdf_seen))


if __name__ == "__main__":
    crawl()
