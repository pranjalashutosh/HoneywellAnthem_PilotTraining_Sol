# Supabase Backend

Database schema, Edge Functions, environment variables, analytics, and pilot profiles.

---

## Overview

Supabase replaces the Express + SQLite stack entirely. There is no `app/server/` directory. The browser talks directly to Supabase Cloud (for data CRUD and analytics) and LiveKit Cloud (for real-time audio). Secret-dependent operations use Supabase Edge Functions.

---

## Edge Functions

Edge Functions run on Deno and access secrets via `Deno.env.get()`. The browser calls them via `supabase.functions.invoke()`.

**`supabase/functions/atc/index.ts`** — OpenAI API proxy. Receives scenario context from the browser, calls OpenAI (gpt-4o-mini) with the `OPENAI_API_KEY`, returns ATC instruction + expected readback.

**`supabase/functions/livekit-token/index.ts`** — LiveKit room token generation. Uses `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` to mint a short-lived access token for the browser to join a LiveKit room.

---

## Environment Variables

```env
# app/.env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...                      # Public anon key (safe for browser)
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud

# Supabase Edge Function secrets (set via supabase secrets set)
OPENAI_API_KEY=sk-proj-...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
ELEVENLABS_API_KEY=...
DEEPGRAM_API_KEY=...
```

---

## Security

- All API keys stored as Supabase Edge Function secrets — never exposed in browser code
- `.env` contains only public Supabase URL/anon key and LiveKit URL (safe for browser)
- Edge Functions access secrets via `Deno.env.get()` at runtime
- LiveKit tokens are short-lived and scoped to a specific room
- Supabase anon key is safe for browser — Row Level Security (RLS) controls data access

---

## PostgreSQL Schema — Population-Level Storage

### Why Not localStorage

Final Synthesis Layer 3 requires "population-level training data identifying systematic competency gaps across pilot fleet." ICAO Doc 9995 mandates "flight data analysis to tailor training programs." Neither is achievable with browser-local storage.

### Schema

PostgreSQL via Supabase, managed through migrations (`supabase/migrations/001_initial_schema.sql`).

**Core tables:**

- `pilots` — id, name, accent_group, experience_level, total_hours, anthem_hours, previous_platform, timestamps
- `sessions` — id, pilot_id (FK), started_at, ended_at, drill_count
- `drill_results` — id, session_id (FK), pilot_id (FK), drill_id, scores, metrics_json, cbta_scores_json, cognitive_load_json, transcript_confidence, estimated_wer
- `readback_scores` — id, drill_result_id (FK), pilot_id, event_index, raw_accuracy, confidence_adjusted_accuracy, latency_raw_ms, latency_adjusted_ms, scoring_basis, confidence_words_json
- `cognitive_load_baselines` — id, pilot_id (FK, unique), calibration stats (f0, intensity, speech rate, disfluency)

Indexed on pilot_id and drill_id for analytics queries.

### Migration Map — Express to Supabase

| Old (Express) | New (Supabase) |
|----------------|----------------|
| `GET/POST /api/pilots` | `supabase.from('pilots').select() / .insert()` |
| `PUT /api/pilots/:id` | `supabase.from('pilots').update()` |
| `GET /api/pilots/:id/baseline` | `supabase.from('cognitive_load_baselines').select()` |
| `POST /api/sessions` | `supabase.from('sessions').insert()` |
| `POST /api/sessions/:id/drills` | `supabase.from('drill_results').insert()` |
| `GET /api/analytics/population` | `supabase.rpc('population_cbta_baseline', {...})` |
| `GET /api/analytics/pilot/:id/percentiles` | `supabase.rpc('pilot_percentile_rank', {...})` |
| `GET /api/export/pilot/:id` | `supabase.from('drill_results').select()` + client formatting |

---

## Analytics via PostgreSQL RPC Functions

Analytics use PostgreSQL RPC functions for server-side aggregation:

```sql
CREATE OR REPLACE FUNCTION population_cbta_baseline(
  accent_group_filter TEXT,
  experience_level_filter TEXT
) RETURNS TABLE (competency TEXT, p25 FLOAT, p50 FLOAT, p75 FLOAT) AS $$
  SELECT competency,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score::float),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score::float),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score::float)
  FROM (
    SELECT (jsonb_each_text(cbta_scores_json)).key AS competency,
           (jsonb_each_text(cbta_scores_json)).value AS score
    FROM drill_results
    JOIN pilots ON drill_results.pilot_id = pilots.id
    WHERE pilots.accent_group = accent_group_filter
      AND pilots.experience_level = experience_level_filter
  ) t
  GROUP BY competency;
$$ LANGUAGE sql;
```

---

## Data Flow

```
assessment-store → api-client.ts → supabase.from(...) → Supabase PostgreSQL
```

**Offline fallback:** `storage.ts` retains localStorage. If Supabase is unreachable, data queues locally and syncs when connection becomes available.

---

## Pilot Profiles

```typescript
interface PilotProfile {
  id: string;                // UUID
  name: string;
  accentGroup: AccentGroup;  // For WER stratification (Report B recommendation)
  experienceLevel: ExperienceLevel;
  totalHours: number;
  anthemHours: number;
  previousPlatform: string;
  createdAt: number;
  lastActiveAt: number;
}

type AccentGroup =
  | 'native_us' | 'native_uk' | 'native_aus'
  | 'south_asian' | 'east_asian' | 'european'
  | 'middle_eastern' | 'latin_american' | 'african' | 'other';

type ExperienceLevel = 'student' | 'low_time' | 'mid_time' | 'high_time' | 'atp';
```

Selection via `PilotSelector.tsx` in MFD Home tab and `StatusBar.tsx`. No auth — trust-based identity (prototype constraint).

---

## Population Analytics

`CBTARadar.tsx` (shadcn/ui Charts radar) accepts optional `populationBaseline` prop → renders P25/P75 band behind the pilot's individual scores. `CohortCompare.tsx` enables accent group comparison, experience level comparison, and per-drill difficulty analysis.
