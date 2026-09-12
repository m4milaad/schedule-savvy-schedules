#!/usr/bin/env python3
"""
scrape_enhanced.py - Enhanced scraping with progress monitoring and checkpoints.

This script provides:
1. Real-time progress monitoring
2. Automatic checkpoints
3. Resume capability
4. Better error handling
5. Statistics tracking
"""
import argparse
import json
import time
from pathlib import Path
from datetime import datetime


def print_banner():
    """Print startup banner."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     CUK Acadex Enhanced Web Scraper                          ║
║     Comprehensive data collection for AI chatbot             ║
╚══════════════════════════════════════════════════════════════╝
    """)


def load_progress():
    """Load scraping progress."""
    progress_file = Path("data/.scrape_progress.json")
    if progress_file.exists():
        try:
            return json.loads(progress_file.read_text())
        except Exception:
            return None
    return None


def save_progress(stats: dict):
    """Save scraping progress."""
    progress_file = Path("data/.scrape_progress.json")
    progress_file.parent.mkdir(parents=True, exist_ok=True)
    
    progress = {
        "last_run": datetime.utcnow().isoformat(),
        "stats": stats,
    }
    
    progress_file.write_text(json.dumps(progress, indent=2))


def get_stats_summary():
    """Get summary of scraped data."""
    structured_dir = Path("data/structured")
    pdfs_dir = Path("data/pdfs")
    
    stats = {
        "json_files": 0,
        "pdf_files": 0,
        "total_size_mb": 0,
        "categories": {},
    }
    
    if not structured_dir.exists():
        return stats
    
    # Count JSON files and analyze categories
    for json_file in structured_dir.glob("*.json"):
        stats["json_files"] += 1
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            category = data.get("category", "general")
            stats["categories"][category] = stats["categories"].get(category, 0) + 1
            stats["total_size_mb"] += json_file.stat().st_size / (1024 * 1024)
        except Exception:
            pass
    
    # Count PDFs
    if pdfs_dir.exists():
        stats["pdf_files"] = len(list(pdfs_dir.glob("*.pdf")))
        for pdf in pdfs_dir.glob("*.pdf"):
            stats["total_size_mb"] += pdf.stat().st_size / (1024 * 1024)
    
    return stats


def print_stats(stats: dict):
    """Print statistics."""
    print("\n" + "=" * 60)
    print("  Current Data Statistics")
    print("=" * 60)
    print(f"JSON files:     {stats['json_files']}")
    print(f"PDF files:      {stats['pdf_files']}")
    print(f"Total size:     {stats['total_size_mb']:.2f} MB")
    print(f"\nCategories:")
    for category, count in sorted(stats["categories"].items(), key=lambda x: x[1], reverse=True):
        print(f"  {category:15s}: {count:4d} documents")
    print("=" * 60 + "\n")


def run_crawler(fresh: bool = False, max_pages: int = 10000):
    """Run the crawler."""
    import subprocess
    import sys
    
    cmd = [sys.executable, "crawler.py"]
    
    if fresh:
        cmd.append("--fresh")
    
    print(f"\n🕷️  Starting crawler (max {max_pages} pages)...")
    print(f"Mode: {'Fresh start' if fresh else 'Resume previous'}")
    print(f"Log file: crawler.log")
    print("\nPress Ctrl+C to stop gracefully\n")
    
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n\n⚠️  Crawler stopped by user. Progress has been saved.")
        return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Enhanced web scraper with progress monitoring"
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Start fresh, ignore previous progress"
    )
    parser.add_argument(
        "--stats-only",
        action="store_true",
        help="Show statistics only, don't scrape"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=10000,
        help="Maximum pages to scrape (default: 10000)"
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    # Show current stats
    stats = get_stats_summary()
    print_stats(stats)
    
    if args.stats_only:
        return
    
    # Load previous progress
    progress = load_progress()
    if progress and not args.fresh:
        print(f"📊 Previous scrape: {progress['last_run']}")
        print(f"   Pages scraped: {progress['stats'].get('json_files', 0)}")
        print(f"   PDFs collected: {progress['stats'].get('pdf_files', 0)}")
        print()
    
    # Confirm start
    if not args.fresh:
        response = input("Continue scraping? (y/n): ").strip().lower()
        if response != "y":
            print("Cancelled.")
            return
    
    # Run crawler
    start_time = time.time()
    success = run_crawler(fresh=args.fresh, max_pages=args.max_pages)
    elapsed = time.time() - start_time
    
    # Get final stats
    final_stats = get_stats_summary()
    
    # Save progress
    save_progress(final_stats)
    
    # Print summary
    print("\n" + "=" * 60)
    print("  Scraping Complete!")
    print("=" * 60)
    print(f"Duration:       {elapsed / 60:.1f} minutes")
    print(f"Status:         {'✓ Success' if success else '⚠ Stopped'}")
    print("\nFinal Statistics:")
    print_stats(final_stats)
    
    # Calculate deltas
    if stats["json_files"] > 0:
        new_files = final_stats["json_files"] - stats["json_files"]
        new_pdfs = final_stats["pdf_files"] - stats["pdf_files"]
        print(f"New in this run:")
        print(f"  JSON files: +{new_files}")
        print(f"  PDFs:       +{new_pdfs}")
        print()
    
    # Next steps
    print("Next steps:")
    print("1. Review crawler.log for details")
    print("2. Build vector database: python -m ingest.build_db --reset")
    print("3. Test the system: python test_rag.py")
    print()


if __name__ == "__main__":
    main()
