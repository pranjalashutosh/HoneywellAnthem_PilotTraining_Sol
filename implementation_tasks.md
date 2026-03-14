# Implementation Tasks — Progress Tracker

> **Instructions**: Mark tasks complete by changing `[ ]` to `[x]` after implementation AND successful validation loop pass.
> A task is only complete when the code compiles, lints clean, and passes build verification.

---

## Phase 0: Project Scaffolding
**Goal**: Blank app that builds and renders Anthem dark theme at :5173.

- [x] **T0.1** Create `app/` directory structure (`src/`, `src/components/`, `src/types/`, `src/stores/`, `src/services/`, `src/hooks/`, `src/lib/`, `src/data/`)
- [x] **T0.2** Create `app/package.json` with all dependencies (React 18, Vite 6, TypeScript, Zustand, Tailwind CSS 4, @supabase/supabase-js, livekit-client, @livekit/components-react, recharts, @anthropic-ai/sdk)
- [x] **T0.3** Create `app/vite.config.ts` (React + TypeScript, `@/` path alias)
- [x] **T0.4** Create `app/tsconfig.json` (strict mode, `@/` → `src/`)
- [x] **T0.5** Create `app/index.html` (entry point, Inter + JetBrains Mono fonts)
- [x] **T0.6** Create `app/.env.example` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_LIVEKIT_URL)
- [x] **T0.7** Tailwind CSS 4 theme via `@theme` in `globals.css` + `@tailwindcss/vite` plugin (replaces `tailwind.config.ts` in v4)
- [x] **T0.8** `@tailwindcss/vite` replaces PostCSS plugin in Tailwind v4 (no `postcss.config.js` needed)
- [x] **T0.9** Create `app/src/globals.css` (full Anthem theme: `--anthem-*` variables, `--chart-1..5`, dark body, font-face)
- [x] **T0.10** Create `app/src/main.tsx` (React root render)
- [x] **T0.11** Create `app/src/App.tsx` (shell with placeholder content)
- [x] **T0.12** Create `agent/requirements.txt` (livekit-agents, livekit-plugins-deepgram, livekit-plugins-elevenlabs, librosa, numpy, anthropic)
- [x] **T0.13** Create `supabase/config.toml`
- [x] **T0.14** Run `pnpm install` — verify successful
- [x] **T0.15** Run `pnpm dev:frontend` — verify dark background (#0a0e17) at :5173
- [x] **T0.16** Verify TypeScript strict mode compiles with zero errors

**Phase 0 Commit**: `feat(scaffold): initialize project with Vite, React, Tailwind, and Anthem dark theme`

---

## Phase 1: Type System + Zustand Stores
**Goal**: Every TypeScript interface exists. All 6 Zustand stores operational in-memory.

### Types
- [ ] **T1.1** Create `app/src/types/cockpit.ts` — CockpitState, CockpitMode, Waypoint, Frequency, CockpitAction, AnthemTelemetryEvent, DisplayEvent, PilotPredictEvent, FlightParameterEvent
- [ ] **T1.2** Create `app/src/types/scenario.ts` — DrillDefinition, DrillEvent (union: ATCInstructionEvent | DecisionPointEvent | PredictSuggestionEvent | CockpitActionEvent), DrillPhase, EventResult, DecisionOption
- [ ] **T1.3** Create `app/src/types/assessment.ts` — ReadbackScore, DecisionScore, TrapScore, TouchScore, DrillMetrics, DrillResult, CBTAScores, CBTACompetency, UncertainElement
- [ ] **T1.4** Create `app/src/types/voice.ts` — TranscriptEntry, ConfidenceAnnotatedWord, VoiceBiomarkers
- [ ] **T1.5** Create `app/src/types/cognitive-load.ts` — CognitiveLoadBaseline, CognitiveLoadScore
- [ ] **T1.6** Create `app/src/types/latency.ts` — LatencyDecomposition (pilotReactionMs, speechOnsetMs, totalMs)
- [ ] **T1.7** Create `app/src/types/pilot.ts` — PilotProfile, AccentGroup, ExperienceLevel
- [ ] **T1.8** Create `app/src/types/atc.ts` — ATCContext, ATCInstruction, ATCConversationEntry
- [ ] **T1.9** Create `app/src/types/analytics.ts` — PopulationBaseline, CohortComparison, PercentileRank
- [ ] **T1.10** Create `app/src/types/index.ts` — Barrel file re-exporting all types

**Types Commit**: `feat(types): add complete TypeScript type system for all domain models`

### Stores
- [ ] **T1.11** Create `app/src/stores/cockpit-store.ts` — Aircraft state, frequency management, mode selection, initialize with default flight plan
- [ ] **T1.12** Create `app/src/stores/scenario-store.ts` — Drill lifecycle (idle/briefing/active/decision/outcome), event sequencing, available drills
- [ ] **T1.13** Create `app/src/stores/voice-store.ts` — PTT state, transcript history, ATC speaking state, LiveKit connection status, latency timestamps
- [ ] **T1.14** Create `app/src/stores/assessment-store.ts` — Current drill metrics, session history, CBTA scores, cognitive load baseline, stub loadFromServer/saveToServer
- [ ] **T1.15** Create `app/src/stores/pilot-store.ts` — Active pilot, pilot list, stub loadPilots/createPilot
- [ ] **T1.16** Create `app/src/stores/ui-store.ts` — Active tab, active panel, numpad state, numpad target
- [ ] **T1.17** Verify all types compile under strict mode with zero errors
- [ ] **T1.18** Verify each store can be instantiated and state read/written correctly

**Stores Commit**: `feat(stores): implement 6 Zustand domain-sliced stores`

---

## Phase 2: Shared Components + Layout Shell
**Goal**: App looks like Anthem. Three-tab layout (Cockpit / Drills / Assessment) works.

### Shared Components
- [ ] **T2.1** Create `app/src/components/shared/AnthemButton.tsx` — 44x44px min touch target, cyan border, glow on active, variants (primary/success/warning/danger)
- [ ] **T2.2** Create `app/src/components/shared/AnthemCard.tsx` — Dark card with tertiary bg, subtle border, optional title
- [ ] **T2.3** Create `app/src/components/shared/AnthemInput.tsx` — Dark input, monospace for data fields, sans-serif for labels
- [ ] **T2.4** Create `app/src/components/shared/PilotSelector.tsx` — Dropdown in TopNavBar, create pilot inline, reads pilot-store

**Shared Components Commit**: `feat(ui): add Anthem-themed shared components (Button, Card, Input, PilotSelector)`

### Layout
- [ ] **T2.5** Create `app/src/components/layout/TopNavBar.tsx` — 3 tabs (Cockpit/Drills/Assessment), PilotSelector right side, cyan active underline
- [ ] **T2.6** Create `app/src/components/layout/CockpitShell.tsx` — Two-panel layout (flight plan + radios), mode selection bar top, voice panel right
- [ ] **T2.7** Create `app/src/components/layout/StatusBar.tsx` — UTC clock, active frequency (monospace), drill status indicator, LiveKit connection dot
- [ ] **T2.8** Update `app/src/App.tsx` — Tab-based routing using ui-store.activeTab
- [ ] **T2.9** Verify tabs switch correctly
- [ ] **T2.10** Verify Anthem dark theme is consistent across all components
- [ ] **T2.11** Verify all touch targets meet ≥44x44px minimum

**Layout Commit**: `feat(layout): implement TopNavBar, CockpitShell, StatusBar with tab navigation`

---

## Phase 3: Cockpit Panels + Touch Interactions
**Goal**: Cockpit tab fully interactive — flight plans, frequencies, modes, PilotPredict, numpad.

### Panels
- [ ] **T3.1** Create `app/src/components/panels/FlightPlanPanel.tsx` — Scrollable waypoint list
- [ ] **T3.2** Create `app/src/components/panels/WaypointRow.tsx` — Single waypoint display, active highlighted in cyan
- [ ] **T3.3** Create `app/src/components/panels/WaypointEditor.tsx` — Inline editor, opens TouchNumpad for altitude
- [ ] **T3.4** Create `app/src/components/panels/RadiosPanel.tsx` — Active/standby frequencies (monospace), swap button
- [ ] **T3.5** Create `app/src/components/panels/FrequencyTuner.tsx` — Step up/down, direct entry via numpad

**Panels Commit**: `feat(cockpit): add FlightPlan and Radios panels with waypoint and frequency editing`

### Controls
- [ ] **T3.6** Create `app/src/components/controls/ModeSelectionBar.tsx` — NAV/APR/HDG/ALT/VS buttons, active mode cyan glow
- [ ] **T3.7** Create `app/src/components/controls/TouchNumpad.tsx` — Overlay numpad, 44x44px buttons, confirm/cancel
- [ ] **T3.8** Create `app/src/components/controls/TouchKeyboard.tsx` — QWERTY layout for waypoint ID entry
- [ ] **T3.9** Create `app/src/components/controls/PilotPredict.tsx` — AI suggestion chip area, accept/reject
- [ ] **T3.10** Create `app/src/components/controls/PredictSuggestion.tsx` — Individual suggestion chip, magenta accent

**Controls Commit**: `feat(cockpit): add ModeSelectionBar, TouchNumpad, TouchKeyboard, PilotPredict controls`

### Static Data
- [ ] **T3.11** Create `app/src/data/flight-plans/kjfk-kbos.ts` — JFK to Boston flight plan
- [ ] **T3.12** Create `app/src/data/flight-plans/kteb-kpbi.ts` — Teterboro to Palm Beach flight plan
- [ ] **T3.13** Create `app/src/data/frequencies.ts` — Common ATC frequencies for drills
- [ ] **T3.14** Create `app/src/data/waypoints.ts` — Waypoint database for flight plans
- [ ] **T3.15** Create `app/src/data/phraseology.ts` — Standard ICAO/FAA phraseology templates

**Static Data Commit**: `feat(data): add flight plans, frequencies, waypoints, and phraseology data`

### Mock Telemetry (Strategic Dimension 1)
- [ ] **T3.16** Create `app/src/lib/telemetry-mock.ts` — Generate typed AnthemTelemetryEvent on every cockpit interaction (touch, mode change, frequency tune, PilotPredict accept/reject)
- [ ] **T3.17** Verify flight plan renders with correct waypoints
- [ ] **T3.18** Verify numpad enters altitude values correctly
- [ ] **T3.19** Verify frequency tuner steps by 0.025 MHz
- [ ] **T3.20** Verify PilotPredict chip shows and accepts/rejects
- [ ] **T3.21** Verify console shows AnthemTelemetryEvent objects for all interactions

**Telemetry Commit**: `feat(telemetry): add Anthem avionics telemetry abstraction layer (Strategic Dimension 1)`

---

## Phase 4: Supabase Backend (parallel with Phase 3)
**Goal**: Database schema, pilot persistence, Edge Functions for Claude API + LiveKit tokens.

### Database
- [ ] **T4.1** Create `supabase/migrations/001_initial_schema.sql` — All tables: pilots, sessions, drill_results, readback_scores, cognitive_load_baselines
- [ ] **T4.2** Add indexes on pilot_id and drill_id
- [ ] **T4.3** Create PostgreSQL RPC function `population_cbta_baseline()` — Returns P25/P50/P75 for each CBTA competency
- [ ] **T4.4** Create PostgreSQL RPC function `pilot_percentile_rank()` — Returns pilot's percentile rank within cohort
- [ ] **T4.5** Create `supabase/seed.sql` — 3-4 sample pilot profiles, 5-10 drill results each for dashboard visualization

**Database Commit**: `feat(db): add Supabase schema with tables, indexes, RPC functions, and seed data`

### Edge Functions
- [ ] **T4.6** Create `supabase/functions/atc/index.ts` — Claude API proxy, receives scenario context, returns ATC instruction + expected readback, CORS headers
- [ ] **T4.7** Create `supabase/functions/livekit-token/index.ts` — Generates short-lived LiveKit access tokens, scoped to room

**Edge Functions Commit**: `feat(edge): add Supabase Edge Functions for Claude API proxy and LiveKit token generation`

### Frontend Integration
- [ ] **T4.8** Create `app/src/lib/supabase.ts` — Supabase client init with env vars
- [ ] **T4.9** Create `app/src/services/api-client.ts` — fetchPilots, createPilot, updatePilot, createSession, endSession, saveDrillResult, fetchDrillHistory, saveReadbackScore, saveCognitiveLoadBaseline, fetchBaseline, fetchPopulationBaseline (RPC), fetchPilotPercentile (RPC)
- [ ] **T4.10** Create `app/src/lib/storage.ts` — localStorage offline fallback with sync queue
- [ ] **T4.11** Wire pilot-store to api-client (loadPilots, createPilot)
- [ ] **T4.12** Wire assessment-store to api-client (loadFromServer, saveToServer)
- [ ] **T4.13** Verify `supabase start` runs local Postgres
- [ ] **T4.14** Verify `supabase db reset` applies migration successfully
- [ ] **T4.15** Verify pilot creation persists across page reload
- [ ] **T4.16** Verify Edge Function `/atc` returns Claude-generated ATC instruction
- [ ] **T4.17** Verify Edge Function `/livekit-token` returns valid token

**Integration Commit**: `feat(api): wire Supabase client, api-client service, and localStorage fallback`

---

## Phase 5: Drill System
**Goal**: 6 drills defined. Drill runner orchestrates lifecycle. Works without voice (keyboard fallback).

### Drill Definitions
- [ ] **T5.1** Create `app/src/data/drills/descent-conflict.ts` — Descent with Traffic Conflict (SAW, PSD, COM)
- [ ] **T5.2** Create `app/src/data/drills/weather-diversion.ts` — Weather Diversion (PSD, COM, WLM)
- [ ] **T5.3** Create `app/src/data/drills/predict-wrong-freq.ts` — PilotPredict Wrong Frequency trap (SAW, KNO)
- [ ] **T5.4** Create `app/src/data/drills/runway-change.ts` — Runway Change (FPM, COM, WLM)
- [ ] **T5.5** Create `app/src/data/drills/holding-pattern.ts` — Holding Pattern Entry (KNO, FPM, COM)
- [ ] **T5.6** Create `app/src/data/drills/comms-handoff.ts` — Comms Handoff (COM, WLM)
- [ ] **T5.7** Create `app/src/data/drills/index.ts` — Barrel file exporting all drills

**Drill Definitions Commit**: `feat(drills): define 6 training drills with ATC events, decision points, and PilotPredict traps`

### Drill Components
- [ ] **T5.8** Create `app/src/components/drill/DrillSelector.tsx` — Grid of DrillCards, difficulty badges, competency tags
- [ ] **T5.9** Create `app/src/components/drill/DrillCard.tsx` — Difficulty color, competency chips, title, description
- [ ] **T5.10** Create `app/src/components/drill/DrillBriefing.tsx` — Full-screen briefing, scenario setup, "Begin Drill" button
- [ ] **T5.11** Create `app/src/components/drill/DrillTimer.tsx` — Countdown/elapsed timer overlay
- [ ] **T5.12** Create `app/src/components/drill/DecisionPrompt.tsx` — Modal overlay, 2-4 options as touch buttons, countdown
- [ ] **T5.13** Create `app/src/components/drill/DrillOutcome.tsx` — Post-drill summary, per-event results, "View Dashboard" / "Try Again"

**Drill UI Commit**: `feat(drill-ui): add DrillSelector, DrillCard, DrillBriefing, DecisionPrompt, and DrillOutcome`

### Services + Hooks
- [ ] **T5.14** Create `app/src/services/scenario-runner.ts` — startDrill, advanceEvent, recordEventResult, completeDrill
- [ ] **T5.15** Create `app/src/services/pilot-predict.ts` — Generate correct suggestions + intentionally wrong trap suggestions
- [ ] **T5.16** Create `app/src/hooks/useDrillRunner.ts` — React hook wrapping scenario-runner
- [ ] **T5.17** Create `app/src/hooks/useTimer.ts` — Countdown and elapsed timer hook
- [ ] **T5.18** Verify DrillSelector shows all 6 drills with correct metadata
- [ ] **T5.19** Verify drill lifecycle: briefing → events → decision point → outcome
- [ ] **T5.20** Verify PilotPredict trap events show wrong suggestions
- [ ] **T5.21** Verify entire flow works without voice (keyboard/click fallback)

**Drill Services Commit**: `feat(drill-engine): implement scenario runner, PilotPredict service, and drill lifecycle hooks`

---

## Phase 6: Voice Infrastructure — LiveKit + PTT
**Goal**: Browser ↔ LiveKit ↔ Python agent. PTT works. STT transcripts flow. ATC speaks with radio static.

### Python Agent
- [ ] **T6.1** Create `agent/worker.py` — LiveKit agent entry point, room lifecycle, data channel message dispatch
- [ ] **T6.2** Create `agent/stt.py` — Deepgram Nova-2 via LiveKit STT plugin, base keyword list + dynamic per-drill keywords, per-word confidence extraction, disfluency detection
- [ ] **T6.3** Create `agent/tts.py` — ElevenLabs via LiveKit TTS plugin, radio static overlay, ATC_SPEAK_END data channel message
- [ ] **T6.4** Create `agent/voice_analysis.py` — librosa F0 (pyin, 2048 window, 512 hop), RMS, MFCC (13 coeff), spectral (centroid, rolloff, flatness), numpy smoothing + octave correction
- [ ] **T6.5** Create `agent/assessment.py` — Confidence-weighted readback scoring (tiers: ≥0.85 full, 0.60-0.84 half, <0.60 excluded), latency decomposition (pilotReactionMs + speechOnsetMs), cognitive load composite (F0 0.35, disfluency 0.25, F0 range 0.15, speech rate 0.15, intensity 0.10), baseline calibration (first 10 utterances)
- [ ] **T6.6** Create `agent/prompts/atc_system.py` — ATC controller persona prompt with scenario awareness

**Agent Commit**: `feat(agent): implement LiveKit Python agent with STT, TTS, voice analysis, and assessment pipeline`

### Frontend LiveKit
- [ ] **T6.7** Create `app/src/services/livekit-client.ts` — connectToRoom, publishMicTrack, subscribe to agent audio, data channel send/receive, disconnect
- [ ] **T6.8** Create `app/src/hooks/useLiveKit.ts` — React hook, auto-connect on drill start, isConnected, connect, disconnect
- [ ] **T6.9** Create `app/src/services/atc-engine.ts` — Call Edge Function /atc, send instruction to agent via data channel
- [ ] **T6.10** Create `app/src/hooks/useATCEngine.ts` — React hook for ATC engine

**LiveKit Client Commit**: `feat(livekit): add LiveKit client service, room hooks, and ATC engine integration`

### Voice Components
- [ ] **T6.11** Create `app/src/components/voice/VoicePanel.tsx` — Right-side panel during drills
- [ ] **T6.12** Create `app/src/components/voice/PTTButton.tsx` — Press-and-hold, audio level viz from LiveKit SDK, disabled while ATC speaks
- [ ] **T6.13** Create `app/src/components/voice/TranscriptDisplay.tsx` — Live interim transcript, final with confidence-colored words (green/amber/dim)
- [ ] **T6.14** Create `app/src/components/voice/VoiceStatus.tsx` — Connection, recording, ATC speaking indicators
- [ ] **T6.15** Verify `pnpm dev:agent` starts Python agent worker
- [ ] **T6.16** Verify browser connects to LiveKit room (green dot in StatusBar)
- [ ] **T6.17** Verify PTT activates microphone with visual feedback
- [ ] **T6.18** Verify speaking produces interim + final transcript with confidence colors
- [ ] **T6.19** Verify ATC instruction plays with radio static effect
- [ ] **T6.20** Verify PTT disabled while ATC speaks
- [ ] **T6.21** Verify agent log shows F0, RMS, disfluency extraction
- [ ] **T6.22** Verify data channel messages flow bidirectionally
- [ ] **T6.23** Verify latency timestamps (pilotReactionMs, speechOnsetMs) captured correctly

**Voice UI Commit**: `feat(voice): add VoicePanel, PTTButton, TranscriptDisplay with confidence coloring`

---

## Phase 7: Assessment Engine + Scoring
**Goal**: Every drill event produces scored results. CBTA competencies aggregate. Instructor override works.

- [ ] **T7.1** Create `app/src/services/assessment-engine.ts` — Parse ASSESSMENT_RESULT messages, compute DrillMetrics, roll up CBTA scores, exponential decay rolling average (0.95^(N-i)), write to assessment-store, trigger saveToServer
- [ ] **T7.2** Create `app/src/lib/scoring.ts` — computeCBTAFromDrillMetrics, applyExponentialDecay, computeEstimatedWER, determineScoringBasis (confident/uncertain/abstained)
- [ ] **T7.3** Create `app/src/lib/audio-utils.ts` — Audio level monitoring from LiveKit SDK for PTT visual feedback (no DSP — all in Python agent)
- [ ] **T7.4** Add instructor override UI to DrillOutcome — amber "Instructor Review Recommended" for uncertain, red "Score Withheld" for abstained
- [ ] **T7.5** Add `instructor_override_json` column to drill_results table (new migration)
- [ ] **T7.6** Add `saveInstructorOverride()` to api-client.ts
- [ ] **T7.7** Wire scenario-runner to assessment-engine — score after each event
- [ ] **T7.8** Verify complete drill produces readback + cognitive load + latency + decision scores
- [ ] **T7.9** Verify CBTA competency scores update after drill
- [ ] **T7.10** Verify instructor override saves to Supabase
- [ ] **T7.11** Verify low-confidence transcripts show appropriate flags
- [ ] **T7.12** Verify estimated WER displays alongside every readback score

**Assessment Commit**: `feat(assessment): implement assessment engine, CBTA scoring, and instructor override system`

---

## Phase 8: Assessment Dashboard
**Goal**: Rich data visualization — the other half of the demo centerpiece.

- [ ] **T8.1** Create `app/src/components/assessment/AssessmentDashboard.tsx` — Grid layout (radar top-left, KPIs top-right, trends + history bottom, cohort + cognitive load bottom)
- [ ] **T8.2** Create `app/src/components/assessment/CBTARadar.tsx` — shadcn/ui radar chart, 6 competencies (COM/WLM/SAW/KNO/PSD/FPM) 0-100, pilot cyan, population P25/P75 gray band, hover exact values
- [ ] **T8.3** Create `app/src/components/assessment/SessionSummary.tsx` — KPI cards: drills completed, avg readback accuracy, avg cognitive load, avg latency, calibration status, estimated avg WER
- [ ] **T8.4** Create `app/src/components/assessment/DrillHistory.tsx` — Bar chart, per-drill scores segmented (readback/decision/touch), confidence whiskers, latency bars
- [ ] **T8.5** Create `app/src/components/assessment/TrendChart.tsx` — Line chart, 6 CBTA competencies over time, exponential decay rolling average
- [ ] **T8.6** Create `app/src/components/assessment/CohortCompare.tsx` — Grouped bar chart, pilot vs P25/P50/P75, filter by accent group/experience level, calls population_cbta_baseline + pilot_percentile_rank RPC
- [ ] **T8.7** Create `app/src/components/assessment/CognitiveLoadIndicator.tsx` — Timeline (x: events, y: composite load 0-100), biomarker sparklines (F0, disfluency, speech rate), calibration badge, color gradient (green→amber→red)
- [ ] **T8.8** Create `app/src/components/assessment/ExportButton.tsx` — Export JSON/CSV of drill history + metrics + CBTA + cognitive load
- [ ] **T8.9** Add concordance rate display — AI-vs-instructor agreement from override data (Strategic Dimension 7)
- [ ] **T8.10** Verify CBTA radar renders all 6 competencies with correct scale
- [ ] **T8.11** Verify population overlay shows P25/P75 from seed data
- [ ] **T8.12** Verify trend lines update after completing a drill
- [ ] **T8.13** Verify cognitive load indicator shows baseline-relative scores
- [ ] **T8.14** Verify all charts use Anthem color palette via CSS variables

**Dashboard Commit**: `feat(dashboard): implement assessment dashboard with CBTA radar, trends, cohort comparison, and cognitive load visualization`

---

## Phase 9: Integration + Polish + Demo Flow
**Goal**: Everything works end-to-end. Demo-ready.

### Integration
- [ ] **T9.1** End-to-end test: drill → voice → assessment → dashboard update
- [ ] **T9.2** Baseline calibration UX: "Calibrating... (N/10 utterances)" progress → "Calibrated" green badge
- [ ] **T9.3** Pre-populate Supabase seed data: 3-4 pilots, different experience levels + accent groups, 5-10 drill results each
- [ ] **T9.4** Graceful degradation: no LiveKit → "Voice Unavailable" badge + keyboard drill mode
- [ ] **T9.5** Graceful degradation: no Supabase → localStorage fallback + "Offline Mode" badge
- [ ] **T9.6** Graceful degradation: no ElevenLabs → window.speechSynthesis + "Demo Voice" badge
- [ ] **T9.7** Touch optimization: verify all interactions on tablet viewport (1024x768 minimum)

**Integration Commit**: `feat(integration): end-to-end drill flow, calibration UX, and graceful degradation`

### Documentation (Strategic Dimensions 2, 3)
- [ ] **T9.8** Create `docs/forge-mapping.md` — Supabase table → Honeywell Forge pipeline entity mapping
- [ ] **T9.9** Create `docs/progression-story.md` — Epic → Epic 3.0 → Anthem training progression
- [ ] **T9.10** Create `docs/demo-script.md` — Step-by-step demo guide (~8 min)

**Docs Commit**: `docs: add Forge mapping, Epic→Anthem progression story, and demo script`

### Final Verification
- [ ] **T9.11** Run complete demo script end-to-end without errors
- [ ] **T9.12** Verify all 7 strategic dimensions are visible in UI or documented
- [ ] **T9.13** Verify dashboard has compelling data from both seed data and live drill
- [ ] **T9.14** Verify no console errors during demo flow
- [ ] **T9.15** Verify graceful degradation for each failure mode

**Final Commit**: `chore: final verification pass — all 7 strategic dimensions confirmed`

---

## Progress Summary

| Phase | Tasks | Complete | Status |
|-------|-------|----------|--------|
| Phase 0: Scaffolding | 16 | 16 | Complete |
| Phase 1: Types + Stores | 18 | 0 | Not Started |
| Phase 2: Shared + Layout | 11 | 0 | Not Started |
| Phase 3: Cockpit Panels | 21 | 0 | Not Started |
| Phase 4: Supabase Backend | 17 | 0 | Not Started |
| Phase 5: Drill System | 21 | 0 | Not Started |
| Phase 6: Voice Infra | 23 | 0 | Not Started |
| Phase 7: Assessment Engine | 12 | 0 | Not Started |
| Phase 8: Dashboard | 14 | 0 | Not Started |
| Phase 9: Integration | 15 | 0 | Not Started |
| **Total** | **168** | **16** | **Phase 0 Complete** |
