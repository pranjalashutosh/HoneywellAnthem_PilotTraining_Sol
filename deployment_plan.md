# Deployment Plan — HPT_Sol Web Application

## Architecture Summary

| Component | Technology | Deployment Target |
|-----------|-----------|-------------------|
| Frontend SPA | Vite + React + TypeScript | **Vercel** (free tier) |
| Python Agent | LiveKit Agents SDK + worker | **Render** (Background Worker) |
| Backend | Supabase (DB, Edge Functions) | **Already deployed** |
| External APIs | OpenAI, Deepgram, ElevenLabs, Google Maps | API keys in env vars |

---

## Step 1: Frontend — Vercel

### Setup

1. Connect GitHub repo to Vercel
2. Set **Root Directory** to `app/`
3. Vercel auto-detects Vite — no build config needed
4. Create `app/vercel.json` for SPA client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Environment Variables (Vercel Dashboard)

| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console |

---

## Step 2: Python Agent — Render

### Dockerfile

Create `Dockerfile` at repo root:

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY agent/ ./agent/
CMD ["python", "-m", "agent.worker", "start"]
```

Key details:
- `libsndfile1` is required by the `soundfile` Python package (voice pipeline dependency)
- `agent/__init__.py` exists, so `python -m agent.worker` works as a module invocation
- Dependencies: `livekit-agents`, `livekit-plugins-openai`, `livekit-plugins-deepgram`, `livekit-plugins-elevenlabs`, `livekit-plugins-silero`, `soundfile`

### Render Setup

1. Create a new **Background Worker** service (not Web Service — the agent is a persistent process, not HTTP)
2. Connect GitHub repo
3. Set root directory to `/` (Dockerfile is at repo root)
4. Render auto-detects the Dockerfile

### Environment Variables (Render Dashboard)

| Variable | Source |
|----------|--------|
| `LIVEKIT_URL` | LiveKit Cloud project URL |
| `LIVEKIT_API_KEY` | LiveKit Cloud project settings |
| `LIVEKIT_API_SECRET` | LiveKit Cloud project settings |
| `OPENAI_API_KEY` | OpenAI platform |
| `DEEPGRAM_API_KEY` | Deepgram console |
| `ELEVEN_API_KEY` | ElevenLabs dashboard |

### Render Tier Note

Render's free tier spins down after 15 min of inactivity. The LiveKit agent must stay connected to the LiveKit server to handle incoming room connections. Use the **Starter plan** (~$7/mo) for always-on operation.

---

## Step 3: Supabase Edge Functions — Verify Secrets

Ensure these secrets are configured in **Supabase Dashboard → Settings → Edge Functions → Secrets**:

| Secret | Used By |
|--------|---------|
| `OPENAI_API_KEY` | `generate-atc` Edge Function |
| `LIVEKIT_API_KEY` | `livekit-token` Edge Function |
| `LIVEKIT_API_SECRET` | `livekit-token` Edge Function |

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/vercel.json` | SPA rewrite rules for client-side routing |
| `Dockerfile` | Python agent container definition |

---

## Cost Estimate

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Free (Hobby) | $0/mo |
| Render | Starter (Background Worker) | ~$7/mo |
| Supabase | Free | $0/mo |
| External APIs | Pay-per-use | Variable |

**Total infrastructure: ~$7/month** (or $0 if using Render free tier with spin-down)

---

## End-to-End Verification

1. `cd app && pnpm build` — confirm frontend builds with zero errors
2. `docker build -t hpt-agent .` — confirm agent Docker image builds locally
3. Deploy frontend to Vercel → open URL, confirm PFD renders and cockpit controls work
4. Deploy agent to Render → check Render logs for successful agent startup
5. Start a drill → verify LiveKit room connects (browser ↔ agent)
6. Verify ATC voice generation (Supabase Edge Function → OpenAI → agent TTS)
7. Verify STT pipeline (pilot speech → Deepgram → readback scoring)
