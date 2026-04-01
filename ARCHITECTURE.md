# Honeywell Anthem Cockpit Training Prototype — Technical Architecture

## System Overview

A browser-based functional prototype that replicates Anthem's touch-first cockpit interface and combines it with AI-driven ATC voice communication and discrete decision-making drills. The system demonstrates how AI-driven assessment, voice-based cognitive load monitoring, and adaptive training concepts from the Final Synthesis can work in practice.

**What this is:** A combined touch-interface procedure trainer + AI-generated ATC voice system + decision drill engine.

**What this is NOT:** A production training product, a certified simulator, or a replacement for instructor-led training.

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Browser (React + LiveKit JS SDK)                    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Cockpit  │  │  Voice   │  │  Drill   │  │  Assessment       │   │
│  │  Shell   │  │  Panel   │  │  System  │  │  Dashboard        │   │
│  │          │  │          │  │          │  │  (shadcn/ui Charts)│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘   │
│       │              │             │                  │              │
│  ┌────┴──────────────┴─────────────┴──────────────────┴──────────┐  │
│  │                      Zustand Stores                            │  │
│  │  cockpit │ voice │ scenario │ assessment │ pilot │ ui          │  │
│  └──────────┬──────────────────────┬─────────────────────────────┘  │
│             │                      │                                │
│   LiveKit JS SDK               Supabase JS SDK                     │
│   (room, audio tracks,         (@supabase/supabase-js)             │
│    data channel for PTT,        CRUD, analytics RPC,               │
│    receives transcripts +        Edge Functions for                 │
│    biomarker scores)             OpenAI API + LiveKit tokens        │
│             │                      │                                │
└─────────────┼──────────────────────┼────────────────────────────────┘
              │ WebRTC               │ HTTPS
              ▼                      ▼
┌─────────────────────┐   ┌────────────────────────────────────────┐
│   LiveKit Cloud     │   │           Supabase Cloud               │
│                     │   │                                        │
│   ┌─────────────┐   │   │  ┌──────────────┐  ┌──────────────┐   │
│   │ SFU Router  │   │   │  │  PostgreSQL   │  │Edge Functions│   │
│   │ STUN/TURN   │   │   │  │  - pilots     │  │  - /atc      │   │
│   │ Edge Nodes  │   │   │  │  - sessions   │  │    (Claude)  │   │
│   └──────┬──────┘   │   │  │  - drill_res  │  │  - /livekit  │   │
│          │          │   │  │  - readbacks   │  │    (tokens)  │   │
│          ▼          │   │  │  - baselines   │  └──────────────┘   │
│   ┌─────────────┐   │   │  │  - RPC funcs   │                    │
│   │ Agent Worker│   │   │  └──────────────┘                      │
│   │  (Python)   │   │   └────────────────────────────────────────┘
│   │             │   │
│   │ ┌─────────┐ │   │
│   │ │Deepgram │ │   │
│   │ │Nova-2   │ │   │
│   │ │STT      │ │   │
│   │ ├─────────┤ │   │
│   │ │Eleven-  │ │   │
│   │ │Labs TTS │ │   │
│   │ ├─────────┤ │   │
│   │ │Voice    │ │   │
│   │ │Analysis │ │   │
│   │ │(librosa)│ │   │
│   │ │F0, RMS, │ │   │
│   │ │MFCC,    │ │   │
│   │ │spectral │ │   │
│   │ └─────────┘ │   │
│   └─────────────┘   │
└─────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Bundler | Vite 6 | Instant HMR, zero-config for React+TS |
| UI | React 18 + TypeScript | Component model maps naturally to panel-based cockpit layout |
| Styling | Tailwind CSS 4 + CSS variables | Rapid dark aviation theme with design tokens |
| State | Zustand | Domain-sliced stores, surgical re-renders for cockpit panels |
| Charts | shadcn/ui Charts (Recharts) | Radar charts for CBTA, CSS variable theming, copy-paste ownership, TypeScript ChartConfig |
| Audio infra | LiveKit Cloud + JS SDK | WebRTC transport, STUN/TURN, room management, agent dispatch |
| Agent runtime | LiveKit Agents (Python) | STT/TTS/voice analysis pipeline, raw audio frame access |
| Voice STT | Deepgram Nova-2 (LiveKit plugin) | Native streaming, per-word confidence + timestamps, keyword boosting |
| Voice TTS | ElevenLabs (LiveKit plugin) | Realistic ATC voice quality |
| Voice analysis | librosa + numpy (Python agent) | F0 (yin/pyin), RMS, MFCC, spectral — all in one pipeline, research-grade |
| LLM | OpenAI API (gpt-4o-mini) | Contextual ATC instruction generation with scenario awareness |
| Backend | Supabase (Postgres + Edge Functions) | Managed DB, auto-generated REST API, Edge Functions for server-side secrets |
| Package manager | pnpm (app) + pip/uv (agent) | Respective ecosystems |

---

## Directory Structure

```
/Users/ashutoshpranjal/HPT_Sol/
├── CLAUDE.md
├── ARCHITECTURE.md              ← This file (slim index)
├── docs/                        ← Detailed architecture sub-documents
│   ├── arch-voice-pipeline.md   # Deepgram STT, ElevenLabs TTS, OpenAI ATC, latency
│   ├── arch-stores.md           # All 6 Zustand store interfaces
│   ├── arch-drill-system.md     # Drill schema, event types, interactive cockpit
│   ├── arch-assessment.md       # Readback scoring, voice biomarkers, CBTA mapping
│   ├── arch-theme.md            # Anthem CSS theme tokens and design principles
│   ├── arch-supabase.md         # Backend, schema, Edge Functions, analytics
│   ├── arch-data-flows.md       # Data flows, data channel messages, component hierarchy
│   └── arch-map-flight-plan.md  # Map Display and Flight Plan module architecture
├── Metrics_research.md
├── README.md
├── brain_StormDocuments/
│
├── agent/                          # LiveKit Agent Worker (Python)
│   ├── requirements.txt            # livekit-agents, livekit-plugins-deepgram, librosa, numpy
│   ├── worker.py                   # Agent entry point + room lifecycle
│   ├── stt.py                      # Deepgram Nova-2 via LiveKit STT plugin
│   ├── tts.py                      # ElevenLabs TTS via LiveKit TTS plugin + radio static overlay
│   ├── voice_analysis.py           # F0, RMS, MFCC, spectral (all librosa)
│   ├── assessment.py               # Confidence-weighted scoring, latency decomposition
│   └── prompts/
│       └── atc_system.py           # ATC controller persona prompt
│
├── supabase/                       # Supabase project config
│   ├── config.toml                 # Supabase CLI config
│   ├── migrations/                 # PostgreSQL schema migrations
│   │   └── 001_initial_schema.sql  # pilots, sessions, drill_results, readback_scores, baselines
│   ├── functions/                  # Edge Functions (Deno)
│   │   ├── atc/index.ts            # OpenAI API proxy (OPENAI_API_KEY)
│   │   └── livekit-token/index.ts  # LiveKit room token generation
│   └── seed.sql                    # Sample drill data (optional)
│
├── app/                            # Frontend (NO server/ directory)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── .env.example                # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_LIVEKIT_URL
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts         # Supabase client init
│       │   ├── scoring.ts          # Simplified (server-side primary)
│       │   ├── cockpit-action-utils.ts # Evaluates CockpitAction against cockpit store state (auto-detection)
│       │   ├── frequency-utils.ts  # Frequency helpers: action classifier, COM validation, predictive matching
│       │   ├── flight-plan-utils.ts # Pure math: haversine, bearing, waypoint enrichment, progress computation
│       │   ├── audio-utils.ts      # Simplified (LiveKit SDK handles audio)
│       │   ├── storage.ts          # Offline fallback (localStorage)
│       │   └── telemetry-mock.ts   # Anthem telemetry event emitter (console-only prototype)
│       ├── services/
│       │   ├── livekit-client.ts   # LiveKit room setup, PTT data channel
│       │   ├── atc-engine.ts       # Calls Supabase Edge Function instead of Express
│       │   ├── assessment-engine.ts # Simplified — heavy lifting in Python agent
│       │   ├── scenario-runner.ts  # Drill lifecycle manager
│       │   ├── pilot-predict.ts    # Predictive input suggestion logic
│       │   └── api-client.ts       # Supabase SDK calls instead of fetch()
│       ├── hooks/
│       │   ├── useLiveKit.ts       # Room connection, track subscription
│       │   ├── useATCEngine.ts     # ATC generation + streaming response
│       │   ├── useDrillRunner.ts   # Drill lifecycle orchestration
│       │   ├── useTimer.ts         # Countdown / elapsed timer
│       │   ├── useAudioLevel.ts    # Real-time mic RMS via Web Audio API (ref-based, no re-renders)
│       │   ├── useAltitudeSimulation.ts  # Mode-dependent altitude animation (VNAV/FLCH/VS rates)
│       │   └── useInteractiveCockpitTracker.ts  # Action tracking, condition evaluation, escalation timer
│       ├── components/
│       │   ├── layout/             # CockpitShell, TopNavBar (deprecated), StatusBar
│       │   ├── panels/             # FlightPlanPanel, RadiosPanel, FrequencyTuner, Waypoint*
│       │   ├── cockpit/            # AmbientCockpitView, InteractiveCockpitView, InteractiveMFD, AutopilotControlBar
│       │   │   ├── ATCCommunicationOverlay.tsx  # Inline ATC communication panel
│       │   │   ├── FlightPlanTab.tsx            # Avionics-style flight plan page with route math
│       │   │   ├── ResizeHandle.tsx             # Draggable PFD/MFD split control
│       │   │   └── pfd/           # Primary Flight Display — Figma-accurate glass cockpit instruments
│       │   │       ├── index.ts                      # Barrel export
│       │   │       ├── pfd-constants.ts              # Centralized design tokens (dimensions, colors, fonts from Figma)
│       │   │       ├── InteractivePFD.tsx            # Orchestrator — store subscriptions, derived state, z-order rendering
│       │   │       ├── SyntheticVisionBackground.tsx # Sky/ground gradient + terrain image with pitch/roll transform
│       │   │       ├── SpeedTape.tsx                 # Left-side speed tape (exact Figma node 43-533 SVG shapes)
│       │   │       ├── AltitudeTape.tsx              # Right-side altitude tape (exact Figma nodes 37-47, 37-93, 38-181, 41-405, 39-352)
│       │   │       ├── HeadingCompass.tsx            # Circular compass rose — cardinal/degree labels, course line, aircraft silhouette
│       │   │       ├── TopHeadingArc.tsx             # Roll scale — computed bank angle ticks at 0°/±10°/±20°/±30°/±45°/±60° + index triangle
│       │   │       ├── FlightDirector.tsx            # Yellow chevron (Figma node 11-690) + horizontal reference lines + pitch bars
│       │   │       └── ModeAnnunciations.tsx         # Mode/status pills, VNAV constraint warning, V/S button
│       │   ├── map/                # Google Maps-based avionics map display
│       │   │   ├── MapDisplay.tsx              # Map orchestrator with API key gating
│       │   │   ├── AircraftMarker.tsx          # Heading-aware SVG aircraft with pulsing halo
│       │   │   ├── MapControls.tsx             # Layer toggles (RTE/APT/WPT/TRK/WX), zoom, recenter
│       │   │   ├── MapInfoPanel.tsx            # Bottom status strip: callsign, heading, alt, speed, ETE
│       │   │   ├── mapTheme.ts                 # AVIONICS_MAP_STYLE dark theme, MAP_COLORS palette
│       │   │   ├── RouteOverlay.tsx            # Polyline route: flown (dim cyan) + ahead (bright cyan)
│       │   │   ├── ScenarioOverlay.tsx         # Training drill zones (weather, holding, VNAV, comms)
│       │   │   └── WaypointMarkers.tsx         # Diamond enroute fixes, ring airport markers
│       │   ├── controls/           # ModeSelectionBar, TouchNumpad, InlineFrequencyNumpad, PilotPredict, PredictSuggestion, TouchKeyboard
│       │   ├── voice/              # VoicePanel, PTTButton, TranscriptDisplay, VUMeter, VoiceStatus
│       │   ├── drill/              # DrillSelector, DrillBriefing, DrillActiveView, CalibrationView, DecisionPrompt, DrillOutcome, DrillCard, DrillDropdownSelector, DrillEventOverlay, DrillsTab, DrillTimer
│       │   ├── assessment/         # AssessmentDashboard, AssessmentOverlay, CBTARadar, CognitiveLoadIndicator, ConcordanceRate, DrillHistory, ExportButton, SessionSummary, TrendChart, CohortCompare
│       │   └── shared/             # AnthemButton, AnthemCard, AnthemInput, PilotSelector
│       ├── types/                  # scenario, assessment, cockpit, voice, atc, cognitive-load, latency, pilot, analytics, map, flight-plan
│       ├── assets/
│       │   └── pfd/               # PFD assets: terrain-mountain.png, SVG reference shapes (compass, speed, alt, flight-director)
│       ├── stores/                 # cockpit-store, scenario-store, voice-store, assessment-store, pilot-store, ui-store
│       └── data/
│           ├── drills/             # descent-conflict, weather-diversion, predict-wrong-freq, runway-change, holding-pattern, comms-handoff
│           ├── flight-plans/       # Route data and registry
│           │   ├── kjfk-kbos.ts           # Raw waypoints for KJFK→KBOS
│           │   ├── kjfk-kbos-full.ts      # Full FlightPlanPackage for KJFK→KBOS
│           │   ├── kteb-kpbi.ts           # Raw waypoints for KTEB→KPBI
│           │   ├── kteb-kpbi-full.ts      # Full FlightPlanPackage for KTEB→KPBI (SID RUUDY5, STAR PBIE3, ILS 10L)
│           │   └── route-registry.ts      # Route config registry with map viewport + aircraft state
│           ├── map-mock-data.ts    # Mock aircraft state, airports, waypoints, scenario overlays
│           ├── frequencies.ts
│           ├── waypoints.ts
│           └── phraseology.ts
```

---

## Architecture Sub-Documents

Detailed specifications are split into focused files in `docs/`:

| Document | Contents |
|----------|----------|
| [arch-voice-pipeline.md](docs/arch-voice-pipeline.md) | Deepgram STT config, keyword boosting, latency decomposition, ElevenLabs TTS pipeline, OpenAI ATC generation, expected readback |
| [arch-stores.md](docs/arch-stores.md) | All 6 Zustand store interfaces (cockpit, scenario, voice, assessment, pilot, ui) and interaction patterns |
| [arch-drill-system.md](docs/arch-drill-system.md) | DrillDefinition schema, all event types (ATC, decision, predict, cockpit_action, interactive_cockpit), CockpitSuccessCondition, example drill, interactive cockpit subsystem |
| [arch-assessment.md](docs/arch-assessment.md) | Confidence-weighted readback scoring, confidence tiers, abstention rule, voice biomarker extraction, cognitive load measurement, calibration flow, CBTA competency mapping, decision/trap scoring |
| [arch-theme.md](docs/arch-theme.md) | Tailwind 4 @theme tokens, color palette, background/accent/text/border variables, design principles |
| [arch-supabase.md](docs/arch-supabase.md) | Edge Functions, env vars, security, PostgreSQL schema, migration map, analytics RPC, pilot profiles, population analytics |
| [arch-data-flows.md](docs/arch-data-flows.md) | ATC drill cycle diagram, data channel message types, PilotPredict flow, assessment pipeline, component hierarchy tree |
| [arch-map-flight-plan.md](docs/arch-map-flight-plan.md) | Map Display component architecture, Google Maps setup, dark avionics theme, layer system, Flight Plan module, route math engine, route registry, store integration |

---

## Build and Dev Commands

```bash
# Install dependencies
pnpm install                  # Frontend
pip install -r agent/requirements.txt  # Agent

# Development (3 processes)
supabase start                # Local Supabase (Postgres + Edge Functions)
pnpm dev                      # Starts: Vite (:5173) + LiveKit Agent Worker

# Or separately:
pnpm dev:frontend             # Vite dev server
pnpm dev:agent                # LiveKit agent worker (Python)
supabase functions serve      # Edge Functions (local)

# Production build
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

The browser talks directly to Supabase Cloud and LiveKit Cloud — there is no local API proxy to configure. Vite serves the frontend and the LiveKit agent worker runs as a separate Python process.

---

## Key Architectural Decisions

| Decision | Chosen | Alternative | Rationale |
|----------|--------|-------------|-----------|
| STT provider | Deepgram Nova-2 (sole, via LiveKit plugin) | Whisper-ATC + Deepgram dual | Dual STT requires self-hosted GPU; Deepgram provides streaming, per-word confidence, keyword boosting — sufficient for prototype |
| Audio infrastructure | LiveKit Cloud (WebRTC) | DIY WebSocket + MediaRecorder | WebRTC transport, STUN/TURN, raw audio frame access in Python agent, PTT via data channel |
| Agent runtime | LiveKit Agents (Python) | Browser-side AudioWorklet | Production-grade F0 via librosa, unified STT/TTS/analysis pipeline, numpy post-processing |
| TTS provider | ElevenLabs (via LiveKit TTS plugin) | Web SpeechSynthesis only | Realistic ATC voice; fallback keeps prototype functional without API key |
| ATC generation | OpenAI API (gpt-4o-mini via Supabase Edge Function) | Pre-scripted responses | Natural variation per drill run; Edge Function keeps API key server-side |
| State management | Zustand | Redux / React Context | Surgical re-renders needed; minimal boilerplate; no provider nesting |
| Maps | Google Maps (`@vis.gl/react-google-maps`) | Mapbox / Leaflet | AdvancedMarkerElement API, dark theme styling, native polyline/circle overlays |
| Backend | Supabase (Postgres + Edge Functions) | Express + SQLite | Managed DB, auto REST API, Edge Functions for secrets, zero server ops |
| Charts | shadcn/ui Charts (Recharts) | Tremor / raw Recharts | Radar chart support (Tremor lacks it), CSS variable theming, copy-paste ownership |
| Voice analysis | librosa + numpy (Python agent) | Meyda.js (browser) / AudioWorklet | Meyda.js lacks F0; librosa is research-grade for all biomarkers; zero extra infra since Python agent already exists |
| API key handling | Supabase Edge Functions + LiveKit server-side | Browser env vars | Secrets never in browser; Edge Functions for Claude/LiveKit tokens |
| Readback scoring | Confidence-weighted LCS | Raw LCS / exact match | Per-word confidence prevents STT errors from penalizing pilots; abstains when uncertain |
| Latency measurement | Agent-side speech onset detection | Browser AudioWorklet VAD | Agent already processes raw audio; consistent measurement in one location |
| Cognitive load baseline | Per-speaker calibration | Population norms | NASA Ames found zero cross-individual correlation; per-speaker is the only valid approach |
| Drill definitions | Declarative data objects | Imperative code | Easier to author new drills; separates content from execution logic |
| CSS approach | Tailwind + CSS variables | CSS-in-JS / styled-components | Fast iteration; theme variables enable consistent Anthem aesthetic |
