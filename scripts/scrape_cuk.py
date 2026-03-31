from __future__ import annotations

import logging
import re
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

SEED_URLS = [
    "https://www.cukashmir.ac.in",
    "https://www.cukashmir.ac.in/admission",
    "https://www.cukashmir.ac.in/notices",
    "https://www.cukashmir.ac.in/examination",
    "https://www.ugc.gov.in",
]

ALLOWED_HOSTS = {"www.cukashmir.ac.in", "cukashmir.ac.in", "www.ugc.gov.in", "ugc.gov.in"}
MAX_PAGES = 120

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("scrape_cuk")


def _safe_name(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/") or "home"
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", f"{parsed.netloc}_{path}")[:120].strip("_")
    return f"{slug}.txt"


def _extract_text(soup: BeautifulSoup) -> str:
    for bad in soup(["script", "style", "noscript"]):
        bad.decompose()
    return "\n".join(line.strip() for line in soup.get_text("\n").splitlines() if line.strip())


def _is_pagination_link(url: str) -> bool:
    return any(key in url.lower() for key in ["page=", "/page/", "next", "older"])


def _is_pdf(url: str) -> bool:
    return url.lower().split("?")[0].endswith(".pdf")


def _same_domain(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host in ALLOWED_HOSTS


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

            soup = BeautifulSoup(res.text, "html.parser")
            page_title = soup.title.get_text(strip=True) if soup.title else "Untitled"
            body_text = _extract_text(soup)
            now = datetime.now(timezone.utc).isoformat()

            txt_path = DATA_DIR / _safe_name(url)
            txt_path.write_text(
                f"Source URL: {url}\nPage Title: {page_title}\nDate Scraped: {now}\n\n{body_text}",
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
                if _is_pagination_link(abs_url) or any(seed in abs_url for seed in ["/admission", "/notice", "/notices", "/exam", "/examination"]):
                    queue.append(abs_url)

    logger.info("Crawl finished. Pages saved: %d, PDFs queued: %d", pages_done, len(pdf_seen))


if __name__ == "__main__":
    crawl()
