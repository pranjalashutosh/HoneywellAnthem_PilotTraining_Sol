# Honeywell Anthem Cockpit Pilot Training Prototype — Implementation Plan

## Context

This prototype is being built to present to Honeywell Leadership, demonstrating that AI-driven pilot training assessment is compatible with Anthem's cockpit technology and can integrate into Anthem's infrastructure. The codebase currently has zero source code — only architecture docs, research, and development rules are complete.

Two critical principles drive every architectural decision:
1. **Per-speaker baseline calibration is non-negotiable** — NASA Ames research proves no valid cross-individual comparison of raw voice biomarkers exists
2. **Anthem integration readiness** — the prototype must visibly demonstrate plug-in compatibility with Honeywell's ecosystem (Forge, INSU, PilotPredict, avionics telemetry)

### Key Decisions
- **Anthem Integration Layer**: Build typed interfaces with mock data for avionics telemetry (display events, PilotPredict, flight params)
- **Platform Focus**: Anthem-only in UI; Epic 3.0 bridge story in documentation only
- **Data Layer**: Supabase direct, with documentation mapping to Honeywell Forge
- **Demo Priority**: Both live voice drill AND assessment dashboard equally

---

## 7 Strategic Dimensions for Honeywell Leadership

Every phase must contribute to at least one of these:

1. **Avionics Telemetry Abstraction** — Typed interfaces showing where Anthem data plugs in
2. **Honeywell Forge Mapping** — Documentation: Supabase schema → Forge pipeline
3. **Epic → Anthem Progression** — In docs/pitch materials, not UI
4. **Per-Speaker Baseline Calibration** — First 10 utterances calibrate; all scores as deltas from personal baseline
5. **Population Analytics** — Server-side storage enabling fleet-wide metrics
6. **Instructor Authority** — AI assessment is decision-support; override capability; low-confidence flagging
7. **Validation First-Mover** — Concordance tracking (AI vs instructor) to position Honeywell as credibility leader

---

## Phase 0: Project Scaffolding

**Goal**: Blank app that builds and renders Anthem dark theme.

**Files**:
- `app/package.json` — React 18, Vite 6, Zustand, Tailwind CSS 4, LiveKit SDK, Supabase JS, Recharts
- `app/vite.config.ts`, `app/tsconfig.json` (strict, `@/` path alias)
- `app/index.html` — Inter + JetBrains Mono fonts
- `app/.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LIVEKIT_URL`
- `app/tailwind.config.ts` — Anthem CSS variables from ARCHITECTURE.md
- `app/src/main.tsx`, `app/src/App.tsx`, `app/src/globals.css` (full Anthem theme)
- `agent/requirements.txt` — livekit-agents, deepgram, elevenlabs, librosa, numpy, anthropic
- `supabase/config.toml`

**Verify**: `pnpm install` + `pnpm dev:frontend` → dark background (#0a0e17) with cyan text at :5173

---

## Phase 1: Type System + Zustand Stores

**Goal**: Every TypeScript interface exists. All 6 Zustand stores operational in-memory.

### Types (9 files in `app/src/types/`)
- `cockpit.ts` — CockpitState, CockpitMode, Waypoint, Frequency, CockpitAction, AnthemTelemetryEvent, DisplayEvent, PilotPredictEvent, FlightParameterEvent
- `scenario.ts` — DrillDefinition, DrillEvent (union), DrillPhase, EventResult, DecisionOption
- `assessment.ts` — ReadbackScore, DecisionScore, TrapScore, TouchScore, DrillMetrics, DrillResult, CBTAScores
- `voice.ts` — TranscriptEntry, ConfidenceAnnotatedWord, VoiceBiomarkers
- `cognitive-load.ts` — CognitiveLoadBaseline, CognitiveLoadScore
- `latency.ts` — LatencyDecomposition (pilotReactionMs + speechOnsetMs)
- `pilot.ts` — PilotProfile, AccentGroup, ExperienceLevel
- `atc.ts` — ATCContext, ATCInstruction, ATCConversationEntry
- `analytics.ts` — PopulationBaseline, CohortComparison, PercentileRank

### Stores (6 files in `app/src/stores/`)
- `cockpit-store.ts` — Aircraft state, frequencies, modes
- `scenario-store.ts` — Drill lifecycle (idle/briefing/active/decision/outcome)
- `voice-store.ts` — PTT state, transcript history, LiveKit status
- `assessment-store.ts` — Metrics, CBTA scores, cognitive load baseline (stub Supabase calls)
- `pilot-store.ts` — Active pilot, pilot list (stub Supabase calls)
- `ui-store.ts` — Active tab, active panel, numpad state

**Verify**: All types compile strict. Stores instantiate and read/write correctly.

---

## Phase 2: Shared Components + Layout Shell

**Goal**: App looks like Anthem. Three-tab layout (Cockpit / Drills / Assessment) works.

### Shared (`app/src/components/shared/`)
- `AnthemButton.tsx` — 44x44px min, cyan border, glow, variants (primary/success/warning/danger)
- `AnthemCard.tsx` — Dark card with tertiary bg, subtle border
- `AnthemInput.tsx` — Dark input, monospace for data
- `PilotSelector.tsx` — Dropdown in TopNavBar, "Create Pilot" inline, reads pilot-store

### Layout (`app/src/components/layout/`)
- `TopNavBar.tsx` — 3 tabs + PilotSelector, cyan active underline
- `CockpitShell.tsx` — Two-panel layout, mode bar, voice panel area
- `StatusBar.tsx` — UTC clock, active frequency, drill status, LiveKit connection dot

**Verify**: Tabs switch. PilotSelector renders. Anthem dark theme consistent. All touch targets ≥44x44px.

---

## Phase 3: Cockpit Panels + Touch Interactions

**Goal**: Cockpit tab fully interactive — flight plans, frequencies, modes, PilotPredict, numpad.

### Panels (`app/src/components/panels/`)
- `FlightPlanPanel.tsx` — Scrollable waypoint list
- `WaypointRow.tsx` + `WaypointEditor.tsx` — Tap to select, inline edit
- `RadiosPanel.tsx` — Active/standby frequencies (monospace), swap button
- `FrequencyTuner.tsx` — Step up/down, direct entry via numpad

### Controls (`app/src/components/controls/`)
- `ModeSelectionBar.tsx` — NAV/APR/HDG/ALT/VS buttons
- `TouchNumpad.tsx` — Overlay for altitude/frequency/heading entry
- `PilotPredict.tsx` — AI suggestion chip with accept/reject
- `PredictSuggestion.tsx` — Individual suggestion, magenta accent

### Static Data (`app/src/data/`)
- `flight-plans/kjfk-kbos.ts`, `flight-plans/kteb-kpbi.ts`
- `frequencies.ts`, `waypoints.ts`, `phraseology.ts`

### Mock Telemetry (`app/src/lib/telemetry-mock.ts`)
Every cockpit interaction emits typed `AnthemTelemetryEvent` objects. **This is Strategic Dimension 1** — visible proof to Honeywell that avionics data plugs directly into our architecture.

**Verify**: Flight plan renders. Numpad works. Frequencies tune. PilotPredict shows/accepts/rejects. Console shows telemetry events.

---

## Phase 4: Supabase Backend (parallel with Phase 3)

**Goal**: Database schema, pilot persistence, Edge Functions for Claude API + LiveKit tokens.

### Migration (`supabase/migrations/001_initial_schema.sql`)
Tables: `pilots`, `sessions`, `drill_results`, `readback_scores`, `cognitive_load_baselines`
RPC functions: `population_cbta_baseline()`, `pilot_percentile_rank()`

### Edge Functions (`supabase/functions/`)
- `atc/index.ts` — Claude API proxy (secret via `Deno.env.get()`)
- `livekit-token/index.ts` — LiveKit token generation

### Frontend Integration
- `app/src/lib/supabase.ts` — Client init
- `app/src/services/api-client.ts` — All CRUD + RPC calls
- `app/src/lib/storage.ts` — localStorage offline fallback
- Wire `pilot-store` and `assessment-store` to `api-client.ts`

**Verify**: `supabase start` → migrations apply. Pilot creation persists. Edge Functions return valid responses.

---

## Phase 5: Drill System

**Goal**: 6 drills defined. Drill runner orchestrates lifecycle. Works without voice (keyboard fallback).

### Drill Definitions (6 files in `app/src/data/drills/`)
1. `descent-conflict.ts` — SAW, PSD, COM
2. `weather-diversion.ts` — PSD, COM, WLM
3. `predict-wrong-freq.ts` — SAW, KNO (PilotPredict trap)
4. `runway-change.ts` — FPM, COM, WLM
5. `holding-pattern.ts` — KNO, FPM, COM
6. `comms-handoff.ts` — COM, WLM

Each: 3-5 min, 1 decision point, 1-2 ATC exchanges, 1-2 cockpit actions, Deepgram keyword list.

### Drill Components (`app/src/components/drill/`)
- `DrillSelector.tsx`, `DrillCard.tsx`, `DrillBriefing.tsx`
- `DrillTimer.tsx`, `DecisionPrompt.tsx`, `DrillOutcome.tsx`

### Services
- `app/src/services/scenario-runner.ts` — startDrill → advanceEvent → recordResult → completeDrill
- `app/src/services/pilot-predict.ts` — Generates suggestions (correct or intentionally wrong for traps)

### Hooks
- `useDrillRunner.ts`, `useTimer.ts`

**Verify**: All 6 drills selectable. Briefing → events → decision points → outcome. PilotPredict traps work. Full flow without voice via keyboard.

---

## Phase 6: Voice Infrastructure — LiveKit + PTT

**Goal**: Browser ↔ LiveKit ↔ Python agent. PTT works. STT transcripts flow. ATC speaks with radio static.

### Python Agent (`agent/`)
- `worker.py` — Room lifecycle, data channel
- `stt.py` — Deepgram Nova-2 with dynamic keyword boosting per drill
- `tts.py` — ElevenLabs with radio static overlay
- `voice_analysis.py` — librosa: F0 (pyin), RMS, MFCC (13 coeff), spectral features
- `assessment.py` — Confidence-weighted readback scoring, latency decomposition, cognitive load composite, baseline management
- `prompts/atc_system.py` — ATC persona prompt

### Frontend LiveKit Integration
- `app/src/services/livekit-client.ts` — Room management, data channel send/receive
- `app/src/hooks/useLiveKit.ts` — React hook, auto-connect on drill start
- `app/src/services/atc-engine.ts` — Calls Edge Function → sends to agent for TTS
- `app/src/hooks/useATCEngine.ts`

### Voice Components (`app/src/components/voice/`)
- `VoicePanel.tsx`, `PTTButton.tsx`, `TranscriptDisplay.tsx`, `VoiceStatus.tsx`

**Verify**: Agent starts. Browser connects. PTT captures audio. Transcript appears with confidence colors. ATC speaks with radio static. Latency timestamps captured correctly.

---

## Phase 7: Assessment Engine + Scoring

**Goal**: Every drill event produces scored results. CBTA competencies aggregate. Instructor override works.

### Frontend
- `app/src/services/assessment-engine.ts` — Receives agent assessments, computes DrillMetrics, rolls up CBTA scores
- `app/src/lib/scoring.ts` — CBTA mapping, decay function, WER estimation

### Instructor Authority (Strategic Dimension 6)
- Uncertain scores: amber "Instructor Review Recommended"
- Abstained scores: red "Score Withheld — Low Transcript Quality"
- `instructor_override_json` field in drill_results for override tracking

### Validation Concordance (Strategic Dimension 7)
- Track AI-vs-instructor agreement rate from overrides
- Display concordance rate on dashboard

**Verify**: Drill produces readback + cognitive load + latency + decision scores. CBTA updates. Instructor override saves.

---

## Phase 8: Assessment Dashboard

**Goal**: Rich data visualization — the other half of the demo centerpiece.

### Components (`app/src/components/assessment/`)
- `AssessmentDashboard.tsx` — Grid layout
- **`CBTARadar.tsx`** — 6 competencies, pilot cyan, population P25/P75 gray band
- `SessionSummary.tsx` — KPI cards
- `DrillHistory.tsx` — Bar chart, per-drill scores
- `TrendChart.tsx` — Line chart, CBTA scores over time
- `CohortCompare.tsx` — Pilot vs population by accent group/experience
- `CognitiveLoadIndicator.tsx` — Timeline with biomarker sparklines
- `ExportButton.tsx` — JSON/CSV export

**Verify**: Radar renders 6 competencies. Population overlay from seed data. Trend lines update after drills.

---

## Phase 9: Integration + Polish + Demo Flow

### Integration Tasks
1. End-to-end drill → dashboard flow
2. Baseline calibration UX
3. Demo seed data: 3-4 pilots with 5-10 drill results each
4. Graceful degradation: no LiveKit → keyboard mode, no Supabase → localStorage, no ElevenLabs → Web Speech API

### Documentation (Strategic Dimensions 2, 3)
- `docs/forge-mapping.md` — Each Supabase table → Forge pipeline entity mapping
- `docs/progression-story.md` — Epic → Epic 3.0 → Anthem training progression
- `docs/demo-script.md` — Step-by-step demo guide (~8 min total)

**Verify**: Full demo script runs error-free. All 7 strategic dimensions visible or documented.

---

## Critical Path

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 ──→ Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
                                Phase 4 (parallel) ──↗
```

**Highest risk**: Phase 6 (voice) — two runtimes, three external services, real-time data channel.

## Minimum Viable Demo (if time-constrained)

**Must-have**: Phases 0-3 + 5 + partial 8 with seed data = "Here's what Anthem cockpit training looks like, how drills work, and the assessment framework"

**Full demo**: All phases = "And it actually listens to you speak, measures cognitive load, and compares you to the fleet"

---

## Critical Files Reference
- `ARCHITECTURE.md` — Every type, store, component, data flow, CSS theme, drill schema
- `CLAUDE.md` — Development rules (TypeScript strict, Zustand patterns, API keys, scoring rules)
- `Metrics_research.md` — Biomarker weights, confidence tiers, baseline calibration science
- `brain_StormDocuments/Final_Synthesis.md` — Three-layer architecture, regulatory pathway, competitive positioning
