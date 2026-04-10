# 📜 Production Scripts

This directory contains the essential scripts for the CUK RAG system data pipeline.

---

## 🚀 Quick Start

Run these scripts in order to update the knowledge base:

```bash
# 1. Scrape CUK website
python scripts/scrape_cuk.py

# 2. Process and chunk data
python scripts/ingest.py

# 3. Upload to Supabase
python scripts/sync_supabase.py
```

---

## 📋 Scripts Overview

### 1. scrape_cuk.py
**Purpose:** Scrapes the CUK website for content

**What it does:**
- Scrapes 80+ CUK pages (departments, admissions, faculty, etc.)
- Downloads PDF documents
- Extracts contact information (emails, phones)
- Saves to `data/*.txt` and `data/*.pdf`

**Usage:**
```bash
python scripts/scrape_cuk.py
```

**Output:**
- Text files: `data/*.txt`
- PDF files: `data/*.pdf`
- Typical: 150-200 pages, 300-400 PDFs

**Configuration:**
- `MAX_PAGES = 500` - Maximum pages to scrape
- `SEED_URLS` - List of starting URLs

---

### 2. ingest.py
**Purpose:** Processes scraped data into chunks and embeddings

**What it does:**
- Reads all `.txt` and `.pdf` files from `data/`
- Chunks text into 400-token pieces with 80-token overlap
- Creates unique IDs and content hashes
- Generates embeddings using `sentence-transformers/all-MiniLM-L6-v2`
- Saves processed data to `metadata.json` and FAISS index

**Usage:**
```bash
python scripts/ingest.py
```

**Input:**
- `data/*.txt` - Scraped text files
- `data/*.pdf` - Downloaded PDFs

**Output:**
- `data/metadata.json` - Processed chunks with metadata
- `data/faiss_index.bin` - FAISS vector index

**Configuration:**
- `CHUNK_SIZE = 400` - Tokens per chunk
- `OVERLAP = 80` - Token overlap between chunks

---

### 3. sync_supabase.py
**Purpose:** Uploads processed data to Supabase

**What it does:**
- Reads `metadata.json`
- Re-embeds chunks for Supabase
- Uploads to `rag_documents` table
- Deduplicates by `content_hash`
- Batch uploads (100 rows at a time)

**Usage:**
```bash
python scripts/sync_supabase.py
```

**Input:**
- `data/metadata.json` - From ingest.py

**Output:**
- Supabase `rag_documents` table populated

**Requirements:**
- `SUPABASE_URL` in `backend/.env`
- `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`

**Configuration:**
- `BATCH_SIZE = 100` - Rows per batch upload

---

### 4. keep_alive.py
**Purpose:** Server health check utility

**What it does:**
- Pings server to prevent sleep/timeout
- Used for deployment health monitoring

**Usage:**
```bash
python scripts/keep_alive.py
```

---

## 🔄 Complete Workflow

### Initial Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Install Playwright (for scraping)
python -m playwright install chromium

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials
```

### Data Pipeline
```bash
# Step 1: Scrape (10-15 minutes)
python scripts/scrape_cuk.py

# Step 2: Process (2-3 minutes)
python scripts/ingest.py

# Step 3: Upload (1-2 minutes)
python scripts/sync_supabase.py
```

### Expected Results
```
Scraping:
- Pages: 150-200
- PDFs: 300-400
- Time: 10-15 minutes

Processing:
- Chunks: 3,500-4,500
- Time: 2-3 minutes

Uploading:
- Rows: 3,500-4,500
- Time: 1-2 minutes

Total Time: ~15-20 minutes
```

---

## 📊 Data Flow

```
CUK Website
    ↓
scrape_cuk.py → data/*.txt, data/*.pdf
    ↓
ingest.py → data/metadata.json, data/faiss_index.bin
    ↓
sync_supabase.py → Supabase rag_documents table
    ↓
Backend API → User queries
```

---

## 🛠️ Troubleshooting

### Scraper Issues

**Problem:** Playwright not installed
```bash
# Solution
python -m playwright install chromium
```

**Problem:** Timeout errors
```bash
# Solution: Increase timeout in scrape_cuk.py
# Or run during off-peak hours
```

### Ingest Issues

**Problem:** No files found
```bash
# Solution: Check data/ directory has .txt or .pdf files
ls data/*.txt data/*.pdf
```

**Problem:** Memory error
```bash
# Solution: Process in smaller batches
# Or increase system memory
```

### Sync Issues

**Problem:** Supabase credentials missing
```bash
# Solution: Check backend/.env has:
# SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=...
```

**Problem:** Duplicate key errors
```bash
# Solution: Script handles deduplication automatically
# If persists, clear rag_documents table and re-sync
```

---

## 📝 Maintenance

### Weekly
- Monitor scraper logs for errors
- Check data/ folder size

### Monthly
- Re-run full pipeline to get latest data
- Review and update SEED_URLS if needed

### As Needed
- Add new department URLs to scrape_cuk.py
- Adjust CHUNK_SIZE if retrieval quality changes
- Update Supabase schema if needed

---

## 🔐 Security Notes

- Never commit `.env` files
- Keep Supabase service role key secure
- Use environment variables for credentials
- Review scraped data before uploading

---

## 📚 Dependencies

### Python Packages
```
httpx - HTTP client for scraping
playwright - Browser automation
beautifulsoup4 - HTML parsing
pypdf - PDF text extraction
sentence-transformers - Embeddings
faiss-cpu - Vector indexing
python-dotenv - Environment variables
```

### Install All
```bash
pip install httpx playwright beautifulsoup4 pypdf sentence-transformers faiss-cpu python-dotenv
python -m playwright install chromium
```

---

## 💡 Tips

1. **Run during off-peak hours** - Less server load
2. **Monitor logs** - Check for errors during scraping
3. **Verify data** - Check data/ folder after scraping
4. **Test queries** - Verify quality after uploading
5. **Keep backups** - Save metadata.json before re-processing

---

## 📞 Support

For issues or questions:
1. Check logs in console output
2. Verify environment variables
3. Review this README
4. Check main project README.md

---

**Last Updated:** April 8, 2026  
**Scripts Version:** Production v1.0  
**Status:** ✅ Production Ready
