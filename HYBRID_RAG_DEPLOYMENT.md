# CUK Assistant Deployment Notes

## Render Disk Persistence (400MB Free)

Persist `data/faiss_index.bin` and `data/metadata.json` across restarts:

1. Open Render service settings for backend.
2. Add a disk:
   - Name: `cuk-index-disk`
   - Size: `0.4 GB`
   - Mount path: `/opt/render/project/src/data`
3. Rebuild index after each crawl/update with `python scripts/ingest.py`.

This prevents losing FAISS files after free-tier spin-down/redeploy.

## Keep Alive Options

### Option A: Render Cron Job

- Create a second Render service as Cron Job.
- Command:

```bash
python scripts/keep_alive.py
```

- Env:
  - `KEEP_ALIVE_URL=https://<your-backend-domain>/ping`
  - `KEEP_ALIVE_INTERVAL_SECONDS=600`

### Option B: UptimeRobot (Free)

- Add HTTP monitor pointing to:
  - `https://<your-backend-domain>/ping`
- Set interval to 10 minutes.

Both options help reduce cold starts on Render free tier.
