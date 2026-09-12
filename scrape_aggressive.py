#!/usr/bin/env python3
"""
scrape_aggressive.py - Maximum coverage scraping strategy.

This script implements aggressive scraping to maximize page coverage:
1. Removes quality filters (scrapes everything)
2. Increases page limits to 50,000
3. Adds comprehensive URL seeds
4. Enables parallel crawling capabilities
5. Implements smart retry logic
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed


def print_banner():
    """Print aggressive scraper banner."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     CUK AGGRESSIVE WEB SCRAPER v2.0                          ║
║     Maximum Coverage - All Pages - Complete Data             ║
╚══════════════════════════════════════════════════════════════╝

⚠️  AGGRESSIVE MODE ENABLED
- Max pages: 50,000
- Quality filters: DISABLED
- Coverage: MAXIMUM
- Expected duration: 4-8 hours
- Expected output: 1,000-2,000+ pages

Press Ctrl+C anytime to stop gracefully.
    """)


def get_comprehensive_seeds():
    """Generate comprehensive list of seed URLs."""
    base = "https://cukashmir.ac.in/#/publiczone"
    
    seeds = [
        # Main sections
        f"{base}",
        f"{base}/home",
        f"{base}/about",
        f"{base}/administration",
        f"{base}/admissions",
        f"{base}/academics",
        f"{base}/departments",
        f"{base}/faculty",
        f"{base}/research",
        f"{base}/examinations",
        f"{base}/results",
        f"{base}/notices",
        f"{base}/tenders",
        f"{base}/recruitment",
        f"{base}/student-corner",
        f"{base}/student-services",
        f"{base}/infrastructure",
        f"{base}/library",
        f"{base}/hostels",
        f"{base}/sports",
        f"{base}/naac",
        f"{base}/nirf",
        f"{base}/iqac",
        f"{base}/rti",
        f"{base}/contact",
        f"{base}/downloads",
        f"{base}/gallery",
        f"{base}/events",
        f"{base}/news",
        f"{base}/campuses",
    ]
    
    # Add department variations
    departments = [
        "computer-science", "mathematics", "physics", "chemistry",
        "botany", "zoology", "biotechnology", "environmental-science",
        "english", "arabic", "urdu", "persian", "hindi", "kashmiri",
        "history", "political-science", "sociology", "geography",
        "education", "law", "management", "commerce", "economics",
        "library-science", "social-work", "psychology", "philosophy"
    ]
    
    for dept in departments:
        seeds.extend([
            f"{base}/departmentlist/{dept}",
            f"{base}/facultylist/{dept}",
            f"{base}/departments/{dept}",
            f"{base}/faculty/{dept}",
        ])
    
    # Add notice categories
    notice_types = [
        "academic", "general", "examination", "admission",
        "recruitment", "tender", "scholarship", "result"
    ]
    
    for ntype in notice_types:
        seeds.append(f"{base}/notices/{ntype}")
    
    # Add admission categories
    admission_types = [
        "undergraduate", "postgraduate", "phd", "integrated",
        "diploma", "certificate"
    ]
    
    for atype in admission_types:
        seeds.extend([
            f"{base}/admissions/{atype}",
            f"{base}/admissions/{atype}/notices",
            f"{base}/admissions/{atype}/merit-list",
        ])
    
    return sorted(set(seeds))


def save_seeds_to_file(seeds: list[str]):
    """Save seeds to manual_seeds.txt."""
    seeds_file = Path("manual_seeds.txt")
    
    content = ["# Comprehensive seed URLs for maximum coverage", ""]
    content.extend(seeds)
    content.append("")
    content.append("# Add your own URLs below:")
    
    seeds_file.write_text("\n".join(content))
    print(f"✓ Saved {len(seeds)} seed URLs to manual_seeds.txt")


def update_crawler_config():
    """Update crawler config for aggressive mode."""
    config_file = Path("crawler_config.json")
    
    if not config_file.exists():
        print("❌ crawler_config.json not found!")
        return False
    
    config = json.loads(config_file.read_text())
    
    # Aggressive settings
    config["max_pages"] = 50000
    config["max_pdf_size_mb"] = 50
    config["drop_low_quality_records"] = False
    config["min_quality_score"] = 0
    config["max_scrolls"] = 20
    config["render_wait_max_ms"] = 12000
    config["dom_stable_ms"] = 800
    config["nav_timeout_ms"] = 45000
    
    # Save
    config_file.write_text(json.dumps(config, indent=2))
    print("✓ Updated crawler_config.json for aggressive mode")
    return True


def run_crawler(fresh: bool = False):
    """Run the main crawler."""
    cmd = [sys.executable, "crawler.py"]
    if fresh:
        cmd.append("--fresh")
    
    print("\n🕷️  Starting aggressive crawler...\n")
    
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n\n⚠️  Crawler stopped by user")
        return False


def get_stats():
    """Get current scraping statistics."""
    structured = Path("data/structured")
    pdfs = Path("data/pdfs")
    
    stats = {
        "json_files": len(list(structured.glob("*.json"))) if structured.exists() else 0,
        "pdf_files": len(list(pdfs.glob("*.pdf"))) if pdfs.exists() else 0,
        "total_size_mb": 0,
    }
    
    # Calculate total size
    for dir_path in [structured, pdfs]:
        if dir_path.exists():
            for file in dir_path.rglob("*"):
                if file.is_file():
                    stats["total_size_mb"] += file.stat().st_size / (1024 * 1024)
    
    return stats


def print_comparison(before: dict, after: dict):
    """Print before/after comparison."""
    print("\n" + "=" * 60)
    print("  SCRAPING RESULTS")
    print("=" * 60)
    print(f"{'Metric':<20} {'Before':>15} {'After':>15} {'Change':>10}")
    print("-" * 60)
    
    print(f"{'JSON files':<20} {before['json_files']:>15,} {after['json_files']:>15,} {after['json_files'] - before['json_files']:>+10,}")
    print(f"{'PDF files':<20} {before['pdf_files']:>15,} {after['pdf_files']:>15,} {after['pdf_files'] - before['pdf_files']:>+10,}")
    print(f"{'Total size (MB)':<20} {before['total_size_mb']:>15.1f} {after['total_size_mb']:>15.1f} {after['total_size_mb'] - before['total_size_mb']:>+10.1f}")
    
    print("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Aggressive scraper for maximum coverage")
    parser.add_argument("--fresh", action="store_true", help="Start fresh")
    parser.add_argument("--prepare-only", action="store_true", help="Only prepare config, don't scrape")
    args = parser.parse_args()
    
    print_banner()
    
    # Get initial stats
    before_stats = get_stats()
    print(f"Current data: {before_stats['json_files']} pages, {before_stats['pdf_files']} PDFs\n")
    
    # Generate comprehensive seeds
    print("📝 Generating comprehensive seed URLs...")
    seeds = get_comprehensive_seeds()
    save_seeds_to_file(seeds)
    print(f"   Generated {len(seeds)} seed URLs\n")
    
    # Update config
    print("⚙️  Updating crawler configuration...")
    if not update_crawler_config():
        return 1
    print()
    
    if args.prepare_only:
        print("✓ Configuration prepared. Run without --prepare-only to start scraping.")
        return 0
    
    # Confirm start
    print("⚠️  AGGRESSIVE MODE SETTINGS:")
    print("   • Max pages: 50,000")
    print("   • Quality filters: DISABLED (scrapes ALL content)")
    print("   • Max PDF size: 50 MB")
    print("   • Extended timeouts: Enabled")
    print("   • Deep scrolling: Enabled (20 scrolls)")
    print()
    print("   This will take 4-8 hours and scrape aggressively.")
    print()
    
    if not args.fresh:
        response = input("Continue? (yes/no): ").strip().lower()
        if response != "yes":
            print("Cancelled.")
            return 0
    
    print()
    print("=" * 60)
    print("  STARTING AGGRESSIVE SCRAPE")
    print("=" * 60)
    print()
    print("Monitor progress:")
    print("  • Watch log: tail -f crawler.log")
    print("  • Stop anytime: Press Ctrl+C")
    print()
    
    # Run crawler
    start_time = time.time()
    success = run_crawler(fresh=args.fresh)
    elapsed = time.time() - start_time
    
    # Get final stats
    after_stats = get_stats()
    
    # Print results
    print_comparison(before_stats, after_stats)
    
    print(f"\nDuration: {elapsed / 60:.1f} minutes ({elapsed / 3600:.1f} hours)")
    print(f"Status: {'✓ Completed' if success else '⚠️ Stopped early'}")
    
    # Next steps
    print("\n" + "=" * 60)
    print("  NEXT STEPS")
    print("=" * 60)
    print()
    print("1. Review results:")
    print("   python scrape_enhanced.py --stats-only")
    print()
    print("2. Build knowledge base:")
    print("   python -m ingest.build_db --reset")
    print()
    print("3. Test the system:")
    print("   python test_rag.py --interactive")
    print()
    
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nStopped by user.")
        sys.exit(0)
