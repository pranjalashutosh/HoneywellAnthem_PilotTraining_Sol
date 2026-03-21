# Knowledge Map — Honeywell Anthem Pilot Training Prototype

Every file in the project, grouped by feature pipeline.

---

## 1. Voice Pipeline (LiveKit, STT, TTS, Voice Analysis)

### Browser Components
- `app/src/components/voice/PTTButton.tsx` — Push-to-talk button with visual feedback and timestamp tracking
- `app/src/components/voice/TranscriptDisplay.tsx` — Interim/final transcripts with confidence annotations
- `app/src/components/voice/VoicePanel.tsx` — Container for PTT, transcript, and voice status UI
- `app/src/components/voice/VoiceStatus.tsx` — LiveKit connection state, recording status, ATC speaking indicator
- `app/src/components/voice/VUMeter.tsx` — Real-time 16-segment VU meter driven by useAudioLevel ref for calibration and PTT feedback

### Browser Services & Hooks
- `app/src/services/livekit-client.ts` — LiveKit SDK wrapper: room connect, track publish/subscribe, data channel messaging
- `app/src/hooks/useLiveKit.ts` — Auto-connect on drill start, data channel message handling, assessment dispatch
- `app/src/hooks/useATCEngine.ts` — React hook wrapping atc-engine for ATC context building and instruction dispatch
- `app/src/hooks/useAudioLevel.ts` — Real-time audio level via Web Audio AnalyserNode (ref-based, no re-renders)
- `app/src/services/atc-engine.ts` — Generates ATC instructions via Supabase /atc Edge Function, sends to agent via data channel

### Browser State & Utilities
- `app/src/stores/voice-store.ts` — PTT state, transcript history, LiveKit connection status, speech onset timestamps
- `app/src/lib/audio-utils.ts` — Audio level monitoring from LiveKit SDK for VU meter PTT visual feedback

### Python Agent
- `agent/worker.py` — LiveKit agent entry point: room lifecycle, data channel dispatch, STT/TTS/voice analysis orchestration
- `agent/stt.py` — Deepgram Nova-2 STT plugin with base aviation vocabulary and drill-specific keyword boosting
- `agent/tts.py` — ElevenLabs TTS plugin for ATC voice synthesis with radio static overlay
- `agent/voice_analysis.py` — Librosa biomarker extraction: F0 (pyin), RMS, MFCC, spectral features with numpy smoothing
- `agent/assessment.py` — Confidence-weighted readback scoring, latency decomposition, cognitive load composite, baseline calibration
- `agent/prompts/atc_system.py` — ATC controller persona prompt with scenario awareness and FAA/ICAO phraseology
- `agent/__init__.py` — Agent package marker
- `agent/prompts/__init__.py` — Prompts package marker

---

## 2. Drill System (Definitions, Runner, UI)

### Drill Definitions
- `app/src/data/drills/descent-conflict.ts` — VNAV descent conflict: 4-event unified scenario (voice readback, decision, confirmation, interactive cockpit)
- `app/src/data/drills/predict-wrong-freq.ts` — PilotPredict suggests wrong frequency to test automation resistance
- `app/src/data/drills/weather-diversion.ts` — Unexpected weather requiring go-around decision
- `app/src/data/drills/runway-change.ts` — Last-minute runway change during approach
- `app/src/data/drills/holding-pattern.ts` — Unexpected hold instruction with entry procedure decision
- `app/src/data/drills/comms-handoff.ts` — Frequency handoff with missed radio check
- `app/src/data/drills/index.ts` — Drill registry exporting all drills as `allDrills`

### Drill UI Components
- `app/src/components/drill/DrillDropdownSelector.tsx` — Dropdown drill picker with detail panel, event list, and start button
- `app/src/components/drill/DrillSelector.tsx` — (Legacy) Grid of available drills with difficulty/competency tags
- `app/src/components/drill/DrillCard.tsx` — (Legacy) Individual drill card: title, description, duration, start button
- `app/src/components/drill/DrillBriefing.tsx` — Pre-drill briefing with scenario overview and objectives
- `app/src/components/drill/DrillActiveView.tsx` — Live drill: event rendering, voice panel, decision prompts, cockpit actions
- `app/src/components/drill/DecisionPrompt.tsx` — Decision point display with pilot options
- `app/src/components/drill/DrillOutcome.tsx` — Post-drill results with competency scores and feedback
- `app/src/components/drill/DrillTimer.tsx` — Timer for timed decision points
- `app/src/components/drill/CalibrationView.tsx` — Pre-drill baseline calibration flow with VU meter and 5 ATC phrases
- `app/src/components/drill/DrillsTab.tsx` — Tab interface for drill selection, calibration gate, and history

### Drill Runner
- `app/src/services/scenario-runner.ts` — Drill lifecycle: init, start, event execution, decision scoring, outcome finalization
- `app/src/hooks/useDrillRunner.ts` — React hook wrapping scenario-runner, subscribes to phase/event changes

---

## 3. Assessment Engine (Scoring, CBTA, Cognitive Load)

### Assessment Logic
- `app/src/lib/scoring.ts` — CBTA competency scoring (COM/WLM/SAW/KNO/PSD/FPM), confidence-weighted readback accuracy, exponential decay rollup, WER estimation
- `app/src/services/assessment-engine.ts` — Parses agent assessment results, computes DrillMetrics, rolls up CBTA with decay, writes to stores

### Assessment State
- `app/src/stores/assessment-store.ts` — Current drill metrics, session history, CBTA scores, cognitive load baselines, Supabase persistence

---

## 4. Dashboard (Assessment Charts, Visualization)

- `app/src/components/assessment/AssessmentDashboard.tsx` — Full assessment view: CBTA radar, trends, history, export
- `app/src/components/assessment/CBTARadar.tsx` — Radar chart for CBTA competency scores (fixed height: 300px)
- `app/src/components/assessment/CognitiveLoadIndicator.tsx` — Cognitive load timeline with biomarker sparklines (fixed height: 200px)
- `app/src/components/assessment/TrendChart.tsx` — Line chart: CBTA score trends over drills (fixed height: 250px)
- `app/src/components/assessment/DrillHistory.tsx` — Table of past drill results with sortable columns (fixed height: 250px)
- `app/src/components/assessment/CohortCompare.tsx` — Pilot vs cohort percentiles grouped bar chart (fixed height: 250px)
- `app/src/components/assessment/ConcordanceRate.tsx` — Pilot vs AI scoring agreement metric
- `app/src/components/assessment/SessionSummary.tsx` — Drill-level score summary: readback accuracy, latency, cognitive load
- `app/src/components/assessment/ExportButton.tsx` — Export assessment data to CSV/JSON

---

## 5. Cockpit UI (Panels, Controls)

### Panels (Legacy — superseded by InteractiveMFD tabs)
- `app/src/components/panels/FlightPlanPanel.tsx` — (Legacy) Scrollable waypoint list with active/inactive highlighting
- `app/src/components/panels/RadiosPanel.tsx` — (Legacy) Active/standby frequency display with swap and editing
- `app/src/components/panels/WaypointEditor.tsx` — (Legacy) Edit single waypoint details
- `app/src/components/panels/WaypointRow.tsx` — (Legacy) Individual waypoint row in flight plan
- `app/src/components/panels/FrequencyTuner.tsx` — (Legacy) Frequency selector with 0.025 MHz stepping and numpad entry

### Interactive Cockpit (2-Panel Flight Deck)
- `app/src/components/cockpit/AmbientCockpitView.tsx` — Default cockpit tab landing page: composes PFD + MFD + control bar without drill tracking (ambient/free mode)
- `app/src/components/cockpit/InteractiveCockpitView.tsx` — Drill-tracked interactive cockpit: composes AutopilotControlBar + PFD + MFD + ATC overlay, applies cockpit overrides, tracks success conditions
- `app/src/components/cockpit/InteractivePFD.tsx` — Primary Flight Display: synthetic vision, altitude/speed/heading tapes, mode annunciations, flight path marker, VNAV constraint warning
- `app/src/components/cockpit/InteractiveMFD.tsx` — Multi-Function Display: 6 tabs (Home, Audio, Flight Plan, Checklists, Synoptics, Messages) + Training Metrics panel
- `app/src/components/cockpit/AutopilotControlBar.tsx` — Autopilot mode buttons (FLCH, VNAV, ALT, V/S, AP, AUTO) + altitude/frequency display, writes to cockpit-store
- `app/src/components/cockpit/ATCCommunicationOverlay.tsx` — Floating ATC transcript panel with escalation message display
- `app/src/hooks/useAltitudeSimulation.ts` — Interval-based altitude animation: mode-dependent descent rates, VNAV respects constraint floor, FLCH/VS override it
- `app/src/hooks/useInteractiveCockpitTracker.ts` — Cockpit action tracker: subscribes to store changes, evaluates CockpitSuccessConditions, manages escalation timer, computes InteractiveCockpitScore

### Controls
- `app/src/components/controls/ModeSelectionBar.tsx` — (Legacy) Autopilot mode selector; replaced by AutopilotControlBar
- `app/src/components/controls/TouchNumpad.tsx` — 10-digit touchpad for frequency/altitude entry
- `app/src/components/controls/TouchKeyboard.tsx` — On-screen QWERTY keyboard for callsign/waypoint input
- `app/src/components/controls/PilotPredict.tsx` — AI suggestion container with accept/reject gesture targets
- `app/src/components/controls/PredictSuggestion.tsx` — Individual AI suggestion display (correct or trap)

### Cockpit State
- `app/src/stores/cockpit-store.ts` — Flight plan, frequencies, altitude, heading, speed, autopilot mode, selected waypoint, desiredAltitude, vnavConstraint, autopilot/autoThrottle state

---

## 6. Layout & Navigation

- `app/src/components/layout/TopNavBar.tsx` — Header: tab switcher (Cockpit, Drills, Assessment), pilot selector
- `app/src/components/layout/CockpitShell.tsx` — (Legacy) Old cockpit layout with FlightPlan/Radios panels; replaced by AmbientCockpitView
- `app/src/components/layout/StatusBar.tsx` — Footer: UTC clock, frequency, active drill name with green indicator, LiveKit connection, degradation badges

---

## 7. State Management (Zustand Stores)

- `app/src/stores/cockpit-store.ts` — Flight plan, frequencies, altitude, heading, speed, autopilot mode, desiredAltitude, vnavConstraint, autopilot/autoThrottle
- `app/src/stores/scenario-store.ts` — Drill phase, active drill, current event, event results, drill history
- `app/src/stores/assessment-store.ts` — Drill metrics, CBTA scores, cognitive load baselines, interactive cockpit scores, Supabase sync
- `app/src/stores/voice-store.ts` — PTT, transcript history, LiveKit connection, ATC speaking
- `app/src/stores/pilot-store.ts` — Selected pilot profile, experience level, accent group
- `app/src/stores/ui-store.ts` — Active tab, sidebar visibility, UI preferences

---

## 8. Data Layer (Static Data, API, Services)

### Static Data
- `app/src/data/frequencies.ts` — Nav aid frequencies (VOR, ILS, NDB) for major US airports
- `app/src/data/waypoints.ts` — Named waypoints/intersections with coordinates and altitude restrictions
- `app/src/data/phraseology.ts` — Standard ATC phraseology templates and pilot readback patterns
- `app/src/data/flight-plans/kteb-kpbi.ts` — KTEB to KPBI flight plan with waypoints
- `app/src/data/flight-plans/kjfk-kbos.ts` — KJFK to KBOS flight plan with waypoints

### API & Services
- `app/src/services/api-client.ts` — Supabase CRUD: pilot profiles, drill results, cognitive load baselines, population analytics RPC
- `app/src/services/pilot-predict.ts` — AI suggestion generation and trap detection evaluation

---

## 9. Shared Components & Config

### Shared Components
- `app/src/components/shared/AnthemButton.tsx` — Themed button (Anthem dark, 44x44 touch target minimum)
- `app/src/components/shared/AnthemCard.tsx` — Themed card container with shadow and border
- `app/src/components/shared/AnthemInput.tsx` — Themed text input with dark background and cyan border
- `app/src/components/shared/PilotSelector.tsx` — Pilot selection dropdown with inline create, triggers assessment data loading

### Styling & Config
- `app/src/globals.css` — Tailwind config, Anthem CSS variables (cyan/green/magenta palette), monospace font for data
- `app/src/vite-env.d.ts` — Vite environment variable type definitions
- `app/tsconfig.json` — TypeScript strict mode, path aliases
- `app/vite.config.ts` — Vite bundler config, dev server, build settings
- `app/package.json` — Dependencies and build scripts (includes dev:agent with env var export)
- `.mcp.json` — MCP server configuration (fetch, supabase-mcp)

### App Entry
- `app/src/main.tsx` — React app entry point, root component mount
- `app/src/App.tsx` — Main app: tab routing (cockpit→AmbientCockpitView, drills, assessment), useLiveKit() mount

---

## 10. Types (TypeScript Domain Models)

- `app/src/types/index.ts` — Barrel export of all types
- `app/src/types/cockpit.ts` — FlightPlan, Waypoint, Frequency, CockpitMode (incl. VNAV/FLCH), CockpitState (incl. desiredAltitude, vnavConstraint, autopilot, autoThrottle)
- `app/src/types/scenario.ts` — DrillDefinition, Event, EventResult, DecisionOption, Trap, InteractiveCockpitEvent, CockpitSuccessCondition
- `app/src/types/assessment.ts` — DrillMetrics, CBTAScores, ReadbackScore, DecisionScore, TrapScore, TouchScore, InteractiveCockpitScore
- `app/src/types/voice.ts` — TranscriptEntry, ConfidenceAnnotatedWord, VoiceMetrics
- `app/src/types/cognitive-load.ts` — CognitiveLoadBaseline, CognitiveLoadScore, VoiceBiomarkers
- `app/src/types/latency.ts` — LatencyDecomposition, ResponseLatency
- `app/src/types/atc.ts` — ATCContext, ATCInstruction, ATCConstraint
- `app/src/types/pilot.ts` — PilotProfile, AccentGroup, ExperienceLevel
- `app/src/types/analytics.ts` — PopulationBaseline, PercentileRank, DrillMetrics

---

## 11. Supabase (Database, Edge Functions)

### Database
- `supabase/migrations/001_initial_schema.sql` — pilots, sessions, drill_results, readback_scores, cognitive_load_baselines tables
- `supabase/seed.sql` — Demo pilots, sample drill results, population baseline data

### Edge Functions
- `supabase/functions/atc/index.ts` — OpenAI API proxy (gpt-4o-mini): ATCContext → ATC instruction + expected readback
- `supabase/functions/livekit-token/index.ts` — LiveKit room access token generation, scoped to room + pilot

---

## 12. Telemetry

- `app/src/lib/telemetry-mock.ts` — Mock Anthem avionics telemetry abstraction (placeholder for real data)

---

## 13. Documentation

- `ARCHITECTURE.md` — System diagrams, data flows, store design, drill schema, CSS theme, assessment engine, integration specs
- `CLAUDE.md` — Development instructions, context loading protocol, validation loop, MCP tools, git commit protocol
- `knowledge_map.md` — This file: every file's functionality grouped by feature pipeline
- `implementation_plan.md` — 10-phase implementation strategy and strategic dimensions (reference only)
- `implementation_tasks.md` — Task checklist with progress tracking (reference only)
- `Metrics_research.md` — Empirical evidence for assessment metrics and biomarker weights
- `README.md` — Project overview and getting started
- `brain_StormDocuments/Report_A.md` — FAA regulatory architecture, training ecosystem gaps
- `brain_StormDocuments/Report_B.md` — AI voice analysis, cognitive load biomarkers, CBTA mapping
- `brain_StormDocuments/Final_Synthesis.md` — Integrated training solution from multi-agent debate
- `docs/demo-script.md` — Demo walkthrough script and talking points
- `docs/progression-story.md` — Training progression narrative and drill sequencing
- `docs/forge-mapping.md` — Honeywell Forge training ecosystem integration mapping
- `docs/issues-resolutions.md` — Comprehensive log of all issues encountered and their resolutions
