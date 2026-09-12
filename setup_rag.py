#!/usr/bin/env python3
"""
setup_rag.py - Quick setup script for the RAG system.

This script helps you:
1. Install Python dependencies
2. Set up environment variables
3. Create necessary directories
4. Optionally download and install Playwright
"""
import os
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], check: bool = True) -> int:
    """Run a command and return exit code."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    if check and result.returncode != 0:
        print(f"❌ Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    return result.returncode


def main():
    """Main setup routine."""
    print("=" * 60)
    print("  CUK Acadex RAG System Setup")
    print("=" * 60)
    print()
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    print()
    
    # Create directories
    print("Creating directories...")
    directories = [
        "data",
        "data/structured",
        "data/manual",
        "data/pdfs",
        "vector_db",
        "ingest",
        "rag",
    ]
    for dir_path in directories:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    print("✓ Directories created")
    print()
    
    # Check for .env file
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("Creating .env file from .env.example...")
            env_file.write_text(env_example.read_text())
            print("✓ .env file created")
            print("⚠️  Please edit .env and add your GROQ_API_KEY")
        else:
            print("⚠️  .env.example not found")
    else:
        print("✓ .env file exists")
    print()
    
    # Install Python dependencies
    print("Installing Python dependencies...")
    print("This may take a few minutes...")
    run_command([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    print("✓ Python dependencies installed")
    print()
    
    # Ask about Playwright
    print("The web crawler requires Playwright with Chromium browser.")
    response = input("Install Playwright and Chromium? (y/n): ").strip().lower()
    
    if response == "y":
        print("Installing Playwright browsers...")
        run_command([sys.executable, "-m", "playwright", "install", "chromium"])
        print("✓ Playwright installed")
    else:
        print("⚠️  Skipping Playwright installation")
        print("   You can install it later with: python -m playwright install chromium")
    print()
    
    # Summary
    print("=" * 60)
    print("  Setup Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Edit .env and add your GROQ_API_KEY")
    print("2. Run the crawler: python crawler.py")
    print("3. Build the vector database: python -m ingest.build_db --reset")
    print("4. Test the system: python test_rag.py")
    print()
    print("For more information, see RAG_SYSTEM.md")
    print()


if __name__ == "__main__":
    main()
