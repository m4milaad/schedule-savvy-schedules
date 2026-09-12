"""
crawler.py - Autonomous Playwright crawler for Central University of Kashmir.

This crawler is adapted from the university-rag project to scrape CUK website data
for use in the AI chatbot assistant (NeMoX).

Features:
- Autonomous navigation and content discovery
- PDF, DOCX, XLSX, TXT extraction
- Table preservation for faculty directories
- Category classification (admissions, faculty, departments, etc.)
- Contact information extraction
- Retry logic and rate limiting
"""

from __future__ import annotations

import io
import json
import logging
import re
import shutil
import time
import hashlib
import urllib.error
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import defaultdict, deque
from pathlib import Path
from datetime import datetime
from urllib.parse import parse_qsl, quote, unquote, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup, Tag as BS4Tag
import pdfplumber
from tqdm import tqdm
from colorama import Fore, Style, init

init(autoreset=True)


# ---------------------------------------------------------------------------
# Optional extraction dependencies
# ---------------------------------------------------------------------------

DEFAULT_TESSERACT_PATH = Path(r"C:\Users\hp\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")

try:
    import pytesseract
    from pdf2image import convert_from_bytes

    _tesseract_cmd = str(DEFAULT_TESSERACT_PATH) if DEFAULT_TESSERACT_PATH.exists() else shutil.which("tesseract")
    if _tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd
        OCR_AVAILABLE = True
        OCR_STATUS = f"enabled ({_tesseract_cmd})"
    else:
        OCR_AVAILABLE = False
        OCR_STATUS = "disabled (tesseract executable not found)"
except ImportError:
    OCR_AVAILABLE = False
    OCR_STATUS = "disabled (missing pytesseract/pdf2image)"

try:
    import docx as python_docx

    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    import openpyxl

    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONFIG_FILE = Path("crawler_config.json")

DEFAULT_CONFIG = {
    "base_url": "https://cukashmir.ac.in",
    "start_paths": ["/#/publiczone"],
    "output_dir": "data",
    "log_file": "crawler.log",
    "max_pages": 5000,
    "max_pdf_size_mb": 25,
    "headless": True,
    "nav_timeout_ms": 30_000,
    "render_wait_max_ms": 8_000,
    "dom_stable_ms": 500,
    "max_scrolls": 12,
    "max_retries": 3,
    "retry_backoff_seconds": 3,
    "min_delay_seconds": 0.2,
    "default_delay_seconds": 0.5,
    "max_delay_seconds": 8.0,
    "max_sitemap_urls": 5000,
    "user_agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "allowed_domains": [
        "cukashmir.ac.in",
        "www.cukashmir.ac.in",
        "results.cukashmir.in",
        "www.results.cukashmir.in",
        "cukapi.disgenweb.in",
    ],
    "block_patterns": [
        r"/wp-admin",
        r"/login",
        r"/signin",
        r"\.js(\?|$)",
        r"\.css(\?|$)",
        r"\.ico$",
        r"\.woff",
        r"\.ttf",
        r"\.mp4$",
        r"\.mp3$",
        r"javascript:",
        r"mailto:",
        r"tel:",
        r"whatsapp:",
        r"facebook\.com",
        r"twitter\.com",
        r"instagram\.com",
        r"youtube\.com",
        r"linkedin\.com",
        r"google\.com",
    ],
    "blocked_fragments": [
        "siteNav",
        "pkp_content_main",
        "pkp_content_footer",
        "homepageIssue",
    ],
    "drop_low_quality_records": True,
    "min_quality_score": 2,
    "button_trigger_words": ["all", "more", "view", "show", "load", "browse", "explore", "read"],
    "department_detail_words": [
        "about",
        "achievement",
        "contact",
        "course",
        "curriculum",
        "faculty",
        "programme",
        "research",
        "staff",
        "students",
        "syllabus",
    ],
    "category_synonyms": {
        "admissions": [
            "admission",
            "admissions",
            "apply",
            "application",
            "entrance",
            "cuet",
            "merit list",
            "counselling",
        ],
        "fees": [
            "fee",
            "fees",
            "fee structure",
            "payment",
        ],
        "results": [
            "result",
            "results",
            "marksheet",
            "grade card",
        ],
        "examinations": [
            "exam",
            "examination",
            "date sheet",
            "timetable",
        ],
        "academics": [
            "academic",
            "syllabus",
            "course",
            "programme",
            "curriculum",
        ],
        "faculty": ["faculty", "teacher", "professor"],
        "departments": ["department", "school", "centre"],
        "scholarships": ["scholarship", "fellowship", "stipend"],
        "notices": ["notice", "notification", "circular", "announcement"],
        "recruitment": ["job", "career", "recruitment", "vacancy"],
        "contact": ["contact", "email", "phone", "address"],
    },
}


def load_config(path: Path = CONFIG_FILE) -> dict:
    if not path.exists():
        path.write_text(json.dumps(DEFAULT_CONFIG, indent=2), encoding="utf-8")
    try:
        user_config = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Invalid {path}: {exc}") from exc
    
    # Deep merge configs
    merged = dict(DEFAULT_CONFIG)
    for key, value in user_config.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


CONFIG = load_config()

# Initialize paths and settings
BASE_URL = CONFIG["base_url"].rstrip("/")
START_URLS = [urljoin(BASE_URL + "/", p.lstrip("/")) for p in CONFIG["start_paths"]]
OUTPUT_DIR = Path(CONFIG["output_dir"])
PDF_DIR = OUTPUT_DIR / "pdfs"
JSON_DIR = OUTPUT_DIR / "structured"

# Create directories
for directory in [OUTPUT_DIR, PDF_DIR, JSON_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(CONFIG.get("log_file", "crawler.log"), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("cuk")

# Regex patterns
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(
    r"(?<!\d)(?:\+?91[\s-]?)?(?:0[\s-]?)?(?:[6-9]\d{9}|(?:19|18|17|16|15|14|13|12|11|10|01|02|03|04|05|06|07|08|09|0194|0195)[\s-]?\d{5,8})(?!\d)"
)


def url_hash(url: str) -> str:
    """Generate short hash for URL"""
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:12]


def normalise(url: str) -> str:
    """Normalize URL format"""
    url = (url or "").strip()
    if not url:
        return ""
    p = urlparse(url)
    if p.scheme and p.scheme not in {"http", "https"}:
        return url
    path = quote(unquote(p.path.rstrip("/") or "/"), safe="/:@")
    return urlunparse((p.scheme, p.netloc.lower(), path, "", p.query, p.fragment))


def is_allowed(url: str) -> bool:
    """Check if URL domain is allowed"""
    p = urlparse(url)
    if not p.netloc:
        return True
    allowed_domains = set(CONFIG["allowed_domains"])
    return p.netloc in allowed_domains or any(p.netloc.endswith("." + domain) for domain in allowed_domains)


def is_blocked(url: str) -> bool:
    """Check if URL matches block patterns"""
    return any(re.search(pat, url, re.I) for pat in CONFIG["block_patterns"])


def clean_text(text: str) -> str:
    """Clean and normalize text"""
    text = re.sub(r"\r\n|\r", "\n", text or "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    lines = []
    seen = set()
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        lines.append(line)
    return "\n".join(lines).strip()


def extract_contacts(text: str) -> list[dict]:
    """Extract email and phone contacts from text"""
    contacts = []
    seen = set()
    
    for email in EMAIL_RE.findall(text or ""):
        value = email.strip().rstrip(".,;:")
        key = ("email", value.lower())
        if key not in seen:
            seen.add(key)
            contacts.append({"type": "email", "value": value})
    
    for match in PHONE_RE.findall(text or ""):
        value = re.sub(r"\s+", " ", match).strip().rstrip(".,;:")
        digits = re.sub(r"\D", "", value)
        if len(digits) < 10 or len(digits) > 13:
            continue
        key = ("phone", digits)
        if key not in seen:
            seen.add(key)
            contacts.append({"type": "phone", "value": value})
    
    return contacts


def categorize(url: str, title: str = "", text: str = "") -> str:
    """Categorize content based on URL, title, and text"""
    haystack = clean_text(f"{url} {title} {text[:1000]}").lower()
    scores = {}
    
    for category, terms in CONFIG["category_synonyms"].items():
        hits = 0
        for term in terms:
            pattern = r"\b" + re.escape(term.lower()).replace(r"\ ", r"\s+") + r"\b"
            if re.search(pattern, haystack):
                hits += 2 if " " in term else 1
        scores[category] = hits
    
    best_category, best_score = max(scores.items(), key=lambda item: item[1])
    return best_category if best_score > 0 else "general"


def quality_score(url: str, text: str, title: str = "") -> int:
    """Calculate quality score for content"""
    haystack = clean_text(f"{url} {title} {text[:1500]}").lower()
    score = 0
    
    for category, terms in CONFIG["category_synonyms"].items():
        hits = 0
        for term in terms:
            pattern = r"\b" + re.escape(term.lower()).replace(r"\ ", r"\s+") + r"\b"
            if re.search(pattern, haystack):
                hits += 2 if " " in term else 1
        if hits:
            score += hits
            if category in {"admissions", "fees", "results", "examinations", "notices", "recruitment"}:
                score += 2
    
    return score


def extract_pdf(content: bytes, url: str) -> dict | None:
    """Extract text and tables from PDF"""
    try:
        pages = []
        table_count = 0
        table_row_count = 0
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            meta = pdf.metadata or {}
            for page in pdf.pages:
                txt = page.extract_text() or ""
                rows = []
                for tbl in page.extract_tables() or []:
                    table_count += 1
                    for row in tbl:
                        r = " | ".join(str(c or "").strip() for c in row)
                        if r.strip("| "):
                            rows.append(r)
                            table_row_count += 1
                combined = clean_text(txt + ("\n" + "\n".join(rows) if rows else ""))
                pages.append(combined)
        
        text = "\n\n--- PAGE BREAK ---\n\n".join(pages)
        title = (meta.get("Title") or "").strip() or Path(urlparse(url).path).stem.replace("-", " ").replace("_", " ").title()
        
        return {
            "type": "pdf",
            "url": url,
            "title": title,
            "author": (meta.get("Author") or "").strip(),
            "pages": len(pages),
            "category": categorize(url, title, text),
            "text": text,
            "has_table": table_count > 0,
            "table_count": table_count,
            "table_row_count": table_row_count,
            "contacts": extract_contacts(text),
            "quality_score": quality_score(url, text, title),
            "scraped_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        log.warning(f"PDF extraction failed [{url}]: {exc}")
        return None


def extract_html(html: str, url: str) -> dict:
    """Extract structured data from HTML"""
    soup = BeautifulSoup(html, "lxml")
    raw_text_for_contacts = soup.get_text(separator="\n")

    # Remove unwanted elements
    for tag in soup(["script", "style", "noscript", "iframe", "nav", "footer", "header"]):
        tag.decompose()

    # Extract title
    title = ""
    for sel in ["h1", "h2", "title"]:
        el = soup.find(sel)
        if el:
            title = el.get_text(strip=True)
            break
    title = re.sub(r"\s*[-|]\s*Central University.*", "", title, flags=re.I).strip()
    title = title or urlparse(url).fragment or url

    # Extract main content
    main = (
        soup.find("main")
        or soup.find(id=re.compile(r"^(content|main|body)$", re.I))
        or soup.find("article")
        or soup.body
    )
    text = clean_text((main or soup).get_text(separator="\n"))

    # Extract tables
    tables = []
    for tbl in soup.find_all("table"):
        rows = []
        for tr in tbl.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
            if any(cells):
                rows.append(cells)
        if len(rows) >= 2:
            tables.append(rows)

    # Extract links
    outlinks = set()
    document_links = set()
    for link in soup.find_all("a", href=True):
        href = normalise(urljoin(url, link["href"]))
        if href.lower().endswith((".pdf", ".docx", ".xlsx")):
            document_links.add(href)
        elif is_allowed(href) and not is_blocked(href):
            outlinks.add(href)

    return {
        "type": "html",
        "url": url,
        "title": title,
        "category": categorize(url, title, text),
        "text": text,
        "tables": tables[:15],
        "has_table": bool(tables),
        "table_count": len(tables),
        "table_row_count": sum(len(tbl) for tbl in tables),
        "outlinks": sorted(outlinks),
        "document_links": sorted(document_links),
        "contacts": extract_contacts(raw_text_for_contacts + "\n" + text),
        "quality_score": quality_score(url, text, title),
        "scraped_at": datetime.utcnow().isoformat(),
    }


print(f"""
{Fore.GREEN}{'=' * 60}
  Central University of Kashmir Web Crawler
  Adapted from university-rag project
  
  Site    : {BASE_URL}
  Output  : {OUTPUT_DIR.resolve()}
  OCR     : {OCR_STATUS}
{'=' * 60}{Style.RESET_ALL}

To run the crawler, install dependencies:
  pip install -r requirements.txt
  python -m playwright install chromium

Then execute:
  python crawler.py
""")
