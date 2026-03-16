# Honeywell Anthem Cockpit — Pilot Training Prototype

---

## Context Loading Protocol (MANDATORY)

**Before writing ANY code**, Claude MUST read these files in order to build full context:

1. **`ARCHITECTURE.md`** — Read FIRST. Contains system diagrams, data flows, store design, drill schema, CSS theme variables, assessment engine, component hierarchy, and all LiveKit/Supabase/Deepgram/ElevenLabs/Claude API integration details. This is the source of truth for HOW to build.
2. **`implementation_plan.md`** — Read SECOND. Contains the 10-phase implementation strategy, strategic dimensions for Honeywell Leadership, critical path, and minimum viable demo definition. This is the source of truth for WHAT to build and WHY.
3. **`implementation_tasks.md`** — Read THIRD. Contains the task checklist with `[ ]`/`[x]` progress tracking. Identify the current phase, find the next unchecked task, and begin work there. This is the source of truth for WHERE we are.

**After reading all three**, Claude must:
- Identify the current phase and next task(s) to implement
- Confirm understanding of which files to create/modify
- Reference ARCHITECTURE.md for exact type definitions, CSS variables, store interfaces, and component specs
- Never guess or improvise when the architecture document specifies exact values

---

## Validation Loop (MANDATORY after every code change)

After writing or modifying code, Claude MUST run this validation loop before marking any task complete:

```
┌─────────────────────────────────────┐
│  1. TypeScript Compile Check        │
│     cd app && npx tsc --noEmit      │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  2. Lint Check                      │
│     cd app && pnpm lint             │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  3. Build Check                     │
│     cd app && pnpm build            │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  4. Test Check (if tests exist)     │
│     cd app && pnpm test             │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  5. Mark task(s) [x] in            │
│     implementation_tasks.md         │
│              ↓                      │
│  6. Update Progress Summary table   │
│     in implementation_tasks.md      │
└─────────────────────────────────────┘
```

**Rules:**
- The loop runs until ALL checks pass with zero errors
- If a check fails, fix the issue and restart FROM STEP 1 (not just the failing step)
- Never mark a task `[x]` until the full loop passes
- Never skip lint or build — even for "small changes"
- If lint/build tooling is not yet set up (Phase 0), run only `npx tsc --noEmit`
- Log which validation steps passed in the commit message body if relevant

---

## MCP Tools — Development Workflow

Two MCP servers are connected via `.mcp.json`. Claude MUST use these proactively during development instead of asking the user to run commands manually or writing files that require manual deployment.

### Available Servers

| Server | Purpose |
|--------|---------|
| **fetch** | Retrieve web pages, API docs, external references |
| **supabase-mcp** | Manage Supabase: database schema, Edge Functions, types, logs |

### Supabase MCP — When to Use

**Database schema work:**
- `apply_migration` — Create/alter tables. Prefer this over writing SQL files and telling the user to run them manually.
- `list_tables` — Verify deployed schema matches ARCHITECTURE.md before and after changes.
- `execute_sql` — Seed test data, run analytics queries, verify data integrity, test RPC functions.
- `list_migrations` — Check what migrations exist before creating new ones to avoid conflicts.
- `list_extensions` — Verify required PostgreSQL extensions (e.g., `uuid-ossp`, `pgcrypto`) are enabled.

**Edge Functions:**
- `deploy_edge_function` — Deploy functions (Claude API proxy, LiveKit token generation, etc.).
- `get_edge_function` — Inspect currently deployed function code.
- `list_edge_functions` — See what's deployed before creating or updating functions.

**Type generation:**
- `generate_typescript_types` — Run after every migration to keep `src/types/` in sync with the database schema.

**Project credentials:**
- `get_project_url` + `get_publishable_keys` — Retrieve `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for `.env` setup.

**Monitoring & debugging:**
- `get_logs` — Check Edge Function execution logs when debugging server-side issues.
- `get_advisors` — Get database performance and security recommendations.

**Branching (preview environments):**
- `create_branch` / `merge_branch` — Test schema changes in isolation before applying to the main database.

**Documentation lookup:**
- `search_docs` — Search Supabase documentation for API usage, RLS policies, Edge Function patterns, etc.

### Fetch MCP — When to Use

- Looking up LiveKit, Deepgram, ElevenLabs, or Supabase documentation pages
- Checking API references when implementing integrations
- Fetching any external resource referenced in implementation tasks or ARCHITECTURE.md

### MCP Workflow Rules

- **Prefer MCP over manual CLI** — use Supabase MCP tools instead of asking the user to run `supabase` CLI commands
- **Verify after mutations** — after `apply_migration`, confirm with `list_tables` or `execute_sql`
- **Generate types after schema changes** — always run `generate_typescript_types` after applying a migration
- **Check before creating** — use `list_tables` / `list_migrations` before writing new migrations to avoid conflicts
- **Use `search_docs` before guessing** — when unsure about Supabase API usage, query the docs via MCP first

---

## Git Commit Protocol (MANDATORY)

### Commit Message Format

Use **Conventional Commits** with scope:

```
<type>(<scope>): <concise description>

<optional body — what and why, not how>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Types
| Type | When to use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `style` | Formatting, CSS, no logic change |
| `test` | Adding or updating tests |
| `chore` | Build config, tooling, dependency updates |
| `perf` | Performance improvement |

### Scopes (match project domains)
| Scope | Covers |
|-------|--------|
| `scaffold` | Project setup, config, build tooling |
| `types` | TypeScript type definitions |
| `stores` | Zustand store implementations |
| `ui` | Shared components, theme |
| `layout` | TopNavBar, CockpitShell, StatusBar |
| `cockpit` | Cockpit panels, controls |
| `data` | Static data (flight plans, frequencies, drills) |
| `telemetry` | Anthem telemetry abstraction |
| `db` | Supabase schema, migrations, seed data |
| `edge` | Supabase Edge Functions |
| `api` | api-client, Supabase integration |
| `drills` | Drill definitions |
| `drill-ui` | Drill UI components |
| `drill-engine` | Scenario runner, drill hooks |
| `agent` | Python LiveKit agent |
| `livekit` | LiveKit client, room hooks |
| `voice` | Voice UI components |
| `assessment` | Assessment engine, scoring |
| `dashboard` | Assessment dashboard charts |
| `integration` | End-to-end wiring, degradation |

### Commit Frequency Rules
- **Commit after each logical unit of work** — typically after completing a group of related tasks (see suggested commits in `implementation_tasks.md`)
- **Never commit broken code** — the validation loop must pass before committing
- **Never bundle unrelated changes** — one concern per commit
- **Stage specific files** — use `git add <file>` not `git add .` or `git add -A`
- **Include task IDs in commit body** when helpful: `Implements T0.1-T0.11`
- **Keep subject line under 72 characters**

### Commit Cadence by Phase
Each phase in `implementation_tasks.md` has suggested commit points marked with **"Commit:"** lines. Follow these natural break points. If a phase is large, prefer multiple smaller commits over one large one.

### Example Commits
```
feat(types): add complete TypeScript type system for all domain models

Define interfaces for cockpit, scenario, assessment, voice, cognitive-load,
latency, pilot, ATC, and analytics domains. All types compile under strict
mode with zero errors.

Implements T1.1-T1.10

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

```
feat(cockpit): add FlightPlan and Radios panels with waypoint and frequency editing

FlightPlanPanel renders scrollable waypoint list from cockpit-store.
RadiosPanel shows active/standby frequencies with swap functionality.
FrequencyTuner steps by 0.025 MHz with numpad direct entry.

Implements T3.1-T3.5
Validation: tsc ✓ | lint ✓ | build ✓

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

```
fix(assessment): exclude low-confidence STT words from readback scoring

Words with Deepgram confidence < 0.60 were incorrectly penalizing pilots.
Now excluded per confidence tier rules (ARCHITECTURE.md assessment engine).

Fixes T7.11
Validation: tsc ✓ | lint ✓ | build ✓ | test ✓

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

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

## Known Issues & Resolutions

### MCP Servers Failing — Two root causes (RESOLVED)

> **Status:** Fixed. Both servers now show as connected in `/mcp`. Kept here as reference if the issue recurs.

**Symptoms:** `fetch · ✗ failed` and `supabase-mcp · ✗ failed` in `/mcp`.

#### Issue 1: `fetch` — `@anthropic-ai/mcp-server-fetch` does not exist on npm

The correct official fetch server is Python-based, published as `mcp-server-fetch` on PyPI.
Install `uv` (provides `uvx`) via Homebrew: `brew install uv`.
Then configure `.mcp.json` to use `uvx mcp-server-fetch`.

#### Issue 2: `supabase-mcp` — `mcp-remote` requires Node.js ≥ 20.18.1

The system PATH defaults to Node v18 (nvm), but `mcp-remote@0.1.38` depends on `undici@7`
which requires Node ≥ 20.18.1. Fix by injecting Node v20 into `PATH` via the `env` field.

**Working `.mcp.json`:**

```json
{
  "mcpServers": {
    "fetch": {
      "command": "/opt/homebrew/bin/uvx",
      "args": ["mcp-server-fetch"]
    },
    "supabase-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.supabase.com/mcp"],
      "env": {
        "PATH": "/Users/ashutoshpranjal/.nvm/versions/node/v20.20.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

`mcp-remote` handles the OAuth authentication flow on first connection (opens a browser window to authenticate with your Supabase account). Run `/doctor` after saving to confirm errors are resolved.

---

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
