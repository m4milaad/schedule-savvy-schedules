# CUK Assistant Deployment + Crawling Guide

## 1) What gets deployed where

1. **Backend (FastAPI + Supabase pgvector + RAG):** Render
2. **Frontend (Gradio UI):** Hugging Face Spaces
3. **Crawling + indexing scripts:** run locally (or in CI) to refresh `data/`

---

## 2) Local setup (one-time)

From repo root:

```bash
python -m pip install -r backend/requirements.txt
python -m pip install -r frontend/requirements.txt
```

Create backend env:

```bash
copy backend\.env.example backend\.env
```

Then edit `backend/.env` and set:

- `EXA_API_KEY=...` (required for Exa fallback/search)
- `DEMO_MODE=false` (for full local tests)

---

## 3) Crawl websites and build index (important)

### Step A — Crawl CUK + UGC websites

```bash
python scripts/scrape_cuk.py
```

This saves crawled `.txt` and `.pdf` files into `data/`.

### Step B — Build chunks + embeddings + FAISS index (local fallback)

```bash
python scripts/ingest.py
```

This creates:

- `data/faiss_index.bin`
- `data/metadata.json`

### Step C — Push chunks + embeddings into Supabase (Option B)

1. In Supabase SQL editor, run:
   - `supabase/migrations/20260331190000_create_rag_documents_pgvector.sql`
2. Add to `backend/.env`:
   - `RAG_STORE=supabase`
   - `SUPABASE_URL=https://<project>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
3. Sync:

```bash
python scripts/sync_supabase.py
```

### Step D — Validate retrieval pipeline

```bash
python scripts/test_rag.py
```

Output file:

- `data/processed/rag_test_results.json`

---

## 4) Run locally

### Backend

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Quick checks:

- `GET http://localhost:8000/health`
- `POST http://localhost:8000/chat`

### Frontend

```bash
set BASE_URL=http://localhost:8000
python frontend/app.py
```

Open the Gradio URL shown in terminal.

---

## 5) Deploy backend on Render

1. Push repo to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Use `backend/render.yaml` (Blueprint) or configure manually:
   - **Build command:** `pip install -r backend/requirements.txt && python scripts/ingest.py`
   - **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1`
4. Add environment variables in Render dashboard:
   - `EXA_API_KEY=...`
   - `DEMO_MODE=true` (recommended for free tier cold starts)
   - `MODEL_BACKEND=tinyllama`
   - `LOG_LEVEL=INFO`
   - `CACHE_TTL_SECONDS=3600`
   - `CONFIDENCE_THRESHOLD=0.35`
   - `RAG_STORE=supabase`
   - `SUPABASE_URL=https://<project>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
   - `CORS_ORIGINS=https://<your-react-domain>,https://<your-space>.hf.space`
5. Deploy and verify:
   - `https://<your-render-domain>/health`
   - `https://<your-render-domain>/ping`

### Render Disk Persistence (400MB Free)

To keep index files across restarts:

1. Open Render service settings.
2. Add disk:
   - Name: `cuk-index-disk`
   - Size: `0.4 GB`
   - Mount path: `/opt/render/project/src/data`

This preserves `data/faiss_index.bin` and `data/metadata.json`.

---

## 6) Deploy frontend on Hugging Face Spaces

1. Create a new **Gradio** Space.
2. Upload:
   - `frontend/app.py`
   - `frontend/requirements.txt`
   - `frontend/README.md`
3. In Space settings, add variable:
   - `BASE_URL=https://<your-render-domain>`
4. Restart Space and test prompts.

For the React app, set:
- `VITE_CHATBOT_API_URL=https://<your-render-domain>`

---

## 7) Keep backend awake on free tier

### Option A — Render Cron Job

- Create another service as **Cron Job**.
- Command:

```bash
python scripts/keep_alive.py
```

- Env:
  - `KEEP_ALIVE_URL=https://<your-render-domain>/ping`
  - `KEEP_ALIVE_INTERVAL_SECONDS=600`

### Option B — UptimeRobot (Free)

- Add HTTP monitor for:
  - `https://<your-render-domain>/ping`
- Interval: 10 minutes.

---

## 8) How to refresh chatbot knowledge later

Whenever you want new/latest website data:

```bash
python scripts/scrape_cuk.py
python scripts/ingest.py
```

Then redeploy backend (or restart service) so new index is active.
