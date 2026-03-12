# Honeywell Anthem Cockpit — Pilot Training Prototype

## Project Overview

A browser-based functional prototype that replicates Honeywell Anthem's touch-first cockpit interface combined with AI-driven ATC voice communication and decision-making drills. Demonstrates how AI-based assessment, voice-based cognitive load monitoring, and competency-based training concepts can accelerate pilot proficiency on the Anthem flight deck.

**Target users:** Business aviation pilots (Part 91/135) transitioning from legacy Primus EPIC to Anthem.

**This is a prototype** — Supabase persistence, no auth. Designed to demonstrate the concept, not serve as production training software.

## Research Foundation

- `brain_StormDocuments/Report_A.md` — FAA regulatory architecture, industry training ecosystem, and structural gaps blocking AI-driven training credit
- `brain_StormDocuments/Report_B.md` — AI-driven voice analysis for pilot assessment, cognitive load biomarkers, CBTA competency mapping
- `brain_StormDocuments/Final_Synthesis.md` — Integrated training solution produced by multi-agent adversarial debate (completed)
- `Metrics_research.md` — Empirical evidence and research foundation for every assessment metric

The multi-agent debate protocol that produced the synthesis has been retired. This file now serves as development instructions.

## Architecture

See `ARCHITECTURE.md` for the full technical architecture including system diagrams, data flows, store design, drill schema, assessment engine, and LiveKit/Supabase/Deepgram/ElevenLabs/Claude API integration details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 6 |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 4 + CSS variables |
| State | Zustand |
| Charts | shadcn/ui Charts (Recharts) |
| Audio infra | LiveKit Cloud + JS SDK |
| Agent runtime | LiveKit Agents (Python) |
| Voice STT | Deepgram Nova-2 (LiveKit plugin) |
| Voice TTS | ElevenLabs (LiveKit plugin) |
| Voice analysis | librosa + numpy (Python agent) |
| LLM | Claude API (@anthropic-ai/sdk) |
| Backend | Supabase (Postgres + Edge Functions) |
| Package manager | pnpm (app) + pip/uv (agent) |

## Development Rules

### TypeScript
- Strict mode — no `any` types
- All types in `src/types/` directory
- Export types from barrel files

### State Management
- Zustand for all shared state — no prop drilling, no React Context for shared state
- Domain-sliced stores: cockpit, scenario, voice, assessment, pilot, ui
- Components subscribe via selectors for surgical re-renders
- Services use `getState()` for snapshot reads

### API Keys
- API keys for Claude, ElevenLabs, Deepgram, and LiveKit stored as Supabase Edge Function secrets — never exposed in browser code
- Browser only has access to Supabase anon key (public, safe) and LiveKit Cloud URL
- Edge Functions access secrets via `Deno.env.get()` — set via `supabase secrets set`
- `.env.example` documents required client-side variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LIVEKIT_URL`

### Voice / STT
- Deepgram Nova-2 is the sole STT provider — runs as a LiveKit STT plugin inside the Python agent worker
- Keyword boosting for aviation terms per drill — configured in `agent/stt.py`
- Keyword lists are dynamic: base aviation vocabulary + drill-specific terms (callsigns, waypoints, frequencies)
- Extract per-word confidence scores from Deepgram — required for confidence-weighted scoring
- Account for STT imperfection — readback scoring uses confidence-weighted fuzzy matching, not exact comparison
- System must abstain from scoring when transcript confidence is too low (< 0.50 mean)
- ~8-10% pilot WER is acceptable for prototype; confidence-weighted scoring compensates

### Voice Biomarker Analysis
- All voice biomarker extraction in Python agent via librosa — NOT browser-side
- F0 extraction: `librosa.yin()` or `librosa.pyin()` on raw audio frames from LiveKit
- RMS: `librosa.feature.rms()` — vocal intensity measurement
- MFCC: `librosa.feature.mfcc()` — 13 mel-frequency coefficients
- Spectral features: `librosa.feature.spectral_centroid()`, `spectral_rolloff()`, `spectral_flatness()`
- Post-processing via numpy: smoothing, octave correction, baseline comparison
- Per-speaker baseline calibration is mandatory — no cross-individual comparisons of raw biomarker values are valid (NASA Ames finding)
- First 10 utterances calibrate baseline; no special UI needed
- Cognitive load composite: F0 deviation (0.35), disfluency (0.25), F0 range (0.15), speech rate (0.15), intensity (0.10)
- Client-side audio level for PTT visual feedback comes from LiveKit SDK audio level events (no custom code needed)
- See `Metrics_research.md` for full empirical justification of every biomarker and weight

### Response Latency
- Latency scoring must use locally-measured values, NOT network-dependent Deepgram timestamps
- PTT press/release communicated via LiveKit data channel (PTT_START/PTT_END)
- Agent detects speech onset from raw audio frames (RMS threshold)
- Decomposition: pilotReactionMs (PTT press - ATC audio end) + speechOnsetMs (speech onset - PTT press)
- Deepgram word timestamps used only as cross-check, never for scoring

### Data Persistence
- Supabase PostgreSQL for all server-side storage — NOT localStorage
- Pilot profiles with accent group for WER stratification
- All drill results, readback scores, and cognitive load baselines stored in Supabase
- Population analytics require centralized storage — this is a strategic requirement, not optional
- Complex analytics (percentiles, cohort comparisons) use PostgreSQL RPC functions (`supabase.rpc()`)
- localStorage retained only as offline fallback with sync queue

### Supabase
- Schema defined in `supabase/migrations/` — PostgreSQL migrations managed by Supabase CLI
- Edge Functions in `supabase/functions/` for server-side secrets (Claude API, LiveKit tokens)
- Edge Functions run on Deno — use `Deno.env.get()` for secrets, set via `supabase secrets set`
- Client uses `@supabase/supabase-js` SDK — `supabase.from('table')` for CRUD, `supabase.rpc()` for analytics
- Local development: `supabase start` runs local Postgres + Edge Functions

### LiveKit
- LiveKit Cloud provides WebRTC infrastructure — STUN/TURN, NAT traversal, reconnection handled automatically
- Python agent worker (`agent/worker.py`) runs STT, TTS, and voice analysis as a unified pipeline
- PTT via data channel — browser sends PTT_START/PTT_END, agent captures audio accordingly
- Transcripts and assessment scores sent from agent to browser via data channel
- Client uses `@livekit/components-react` and `livekit-client` SDK for room connection and track subscription
- Agent uses `livekit-agents` Python SDK with plugins: `livekit-plugins-deepgram`, `livekit-plugins-elevenlabs`

### Charts (shadcn/ui)
- shadcn/ui Charts (built on Recharts) for all data visualization
- Radar chart for CBTA competency display — this is a core visualization
- CSS variable theming via `--chart-1..5` custom properties — integrates with Anthem dark theme
- Copy-paste model: components owned in the codebase, not an external dependency
- TypeScript `ChartConfig` for type-safe chart configuration
- KPI cards via shadcn/ui Card primitives

### UI / Touch
- Every interactive element minimum 44x44px touch target
- Anthem visual fidelity — dark theme with cyan/green/magenta palette (see `globals.css` and `ARCHITECTURE.md`)
- Monospace font for data (frequencies, altitudes, waypoints), sans-serif for labels
- No light mode

### Drills
- Drill definitions are declarative data objects in `src/data/drills/` — not imperative code
- Each drill: 3-5 minutes, 1 primary decision point, 1-2 ATC voice exchanges, 1-2 cockpit touch actions
- PilotPredict traps are intentionally wrong suggestions — tests whether pilot blindly trusts AI

### Assessment
- Scoring uses confidence-weighted fuzzy token matching — critical elements (altitudes, headings, frequencies) weighted 2×
- Low-confidence STT words must NOT penalize pilots — use Deepgram confidence tiers (>=0.85 full, 0.60-0.84 half, <0.60 excluded)
- Show both raw and confidence-adjusted scores; flag uncertain assessments for instructor review
- CBTA competencies: COM, WLM, SAW, KNO, PSD, FPM — each 0-100
- Cognitive load biomarkers feed into WLM and SAW competency scores
- Display estimated WER alongside every readback score for transparency
- Instructor authority is non-negotiable — AI assessment is decision-support, never autonomous grading
- See `Metrics_research.md` for empirical backing of every metric and threshold

## Approved Commands

```bash
# Install dependencies
pnpm install                           # Frontend
pip install -r agent/requirements.txt  # Agent

# Development (3 processes)
supabase start             # Local Supabase (Postgres + Edge Functions)
pnpm dev                   # Starts: Vite (:5173) + LiveKit Agent Worker

# Or separately:
pnpm dev:frontend          # Vite dev server
pnpm dev:agent             # LiveKit agent worker (Python)
supabase functions serve   # Edge Functions (local)

# Production build
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Domain Context

### What is Honeywell Anthem?

Anthem is a clean-sheet, cloud-native integrated flight deck — Honeywell's first new core avionics architecture in over two decades:

- **Touch-first interface** replacing traditional knobs, buttons, and mode selection panels
- **Always-on cloud connectivity** via Integrated Network Server Unit (SATCOM, cellular, Wi-Fi, Bluetooth)
- **Pilot-customizable display layouts** replacing fixed OEM-defined arrangements
- **PilotPredict** AI-driven smart scratchpad anticipating pilot inputs
- **Connected Mission Manager** proactively pushing information by flight phase

Anthem is **not yet FAA-certified** as of March 2026. **Primus Epic 3.0** (launching 2026) is the bridging product incorporating Anthem-like features into the existing Epic architecture.

### Why Training Matters

The EPIC-to-Anthem transition is an architectural generation change. 73% of pilots have inadvertently selected wrong automation modes, and insufficient crew knowledge of automated systems contributed to over one-third of accidents and serious incidents. The accent problem in pilot speech recognition (8-10% WER vs 3-5% for controllers) must be honestly addressed — keyword boosting helps but doesn't solve it.

## Key Terms

| Term | Definition |
|------|-----------|
| **AQP** | Advanced Qualification Program (Part 121 Subpart Y) |
| **CBTA** | Competency-Based Training and Assessment (ICAO/IATA) |
| **EBT** | Evidence-Based Training (ICAO Doc 9995) |
| **FSB** | Flight Standardization Board |
| **FSTD** | Flight Simulation Training Device |
| **WER** | Word Error Rate — STT accuracy metric |
| **Epic 3.0** | Honeywell's bridging product (Anthem features in Epic architecture) |
| **PilotPredict** | Anthem's AI-driven smart scratchpad |
| **F0** | Fundamental frequency — primary voice indicator of cognitive load |
| **COM** | Communication competency |
| **WLM** | Workload Management competency |
| **SAW** | Situational Awareness competency |
| **KNO** | Knowledge competency |
| **PSD** | Problem Solving & Decision Making competency |
| **FPM** | Flight Path Management competency |

## Constraints

- Must work for **Part 91 and Part 135 operators** — AQP (Part 121 only) is not the default pathway
- **Instructor authority is non-negotiable** — AI assessment is decision-support only
- Anthem is **not yet certified** — no FSB activity, qualified FTD, or formal transition syllabus exists
- Training approach should build progressively: **Epic → Epic 3.0 → Anthem**
- This is a **prototype** — Supabase persistence, no authentication, trust-based pilot identity
- Must work on **touch screens** (large monitors + tablets)
- Be **technically honest** about what is achievable today vs. what requires further development
- **Cognitive load measurement uses per-speaker baseline calibration** — no cross-pilot comparisons of raw biomarker values are valid
- **Readback scoring must use confidence-weighted assessment** — low-confidence STT words must not penalize pilots
- **Response latency scoring must use locally-measured values** — not network-dependent timestamps
- **Population analytics require pilot profiles** — no auth, but centralized server-side storage is required
