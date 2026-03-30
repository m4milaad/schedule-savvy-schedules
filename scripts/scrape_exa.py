from __future__ import annotations

import csv
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path

from exa_py import Exa


ROOT = Path(__file__).resolve().parents[1]
CRAWL_CSV = ROOT / "crawl.csv"
RAW_OUTPUT = ROOT / "data" / "raw" / "exa_crawl.json"


@dataclass
class CrawlDoc:
    category: str
    name: str
    url: str
    title: str
    content: str


def parse_csv(path: Path) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append((row["Category"], row["Name"], row["URL"]))
    return rows


def main() -> None:
    api_key = os.getenv("EXA_API_KEY")
    if not api_key:
        raise RuntimeError("EXA_API_KEY is required for scraping.")

    entries = parse_csv(CRAWL_CSV)
    exa = Exa(api_key=api_key)
    docs: list[CrawlDoc] = []

    for category, name, url in entries:
        result = exa.get_contents(
            urls=[url],
            text={"maxCharacters": 6000},
            subpages=2,
            subpageTarget="admission notice exam schedule pdf circular",
        )
        for item in getattr(result, "results", []):
            content = (getattr(item, "text", "") or "").strip()
            item_url = (getattr(item, "url", "") or url).strip()
            title = (getattr(item, "title", "") or name).strip()
            if len(content) < 180:
                continue
            docs.append(
                CrawlDoc(
                    category=category,
                    name=name,
                    url=item_url,
                    title=title,
                    content=content,
                )
            )

    RAW_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RAW_OUTPUT.write_text(
        json.dumps([asdict(doc) for doc in docs], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Saved {len(docs)} crawled documents -> {RAW_OUTPUT}")


if __name__ == "__main__":
    main()
