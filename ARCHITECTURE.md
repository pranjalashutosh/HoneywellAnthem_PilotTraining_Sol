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
├── ARCHITECTURE.md
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
│       │   ├── useAudioLevel.ts   # Real-time mic RMS via Web Audio API (ref-based, no re-renders)
│       │   ├── useAltitudeSimulation.ts  # Mode-dependent altitude animation (VNAV/FLCH/VS rates)
│       │   └── useInteractiveCockpitTracker.ts  # Action tracking, condition evaluation, escalation timer
│       ├── components/
│       │   ├── layout/
│       │   │   ├── CockpitShell.tsx
│       │   │   ├── TopNavBar.tsx
│       │   │   └── StatusBar.tsx
│       │   ├── panels/
│       │   │   ├── FlightPlanPanel.tsx
│       │   │   ├── RadiosPanel.tsx
│       │   │   ├── WaypointRow.tsx
│       │   │   ├── WaypointEditor.tsx
│       │   │   └── FrequencyTuner.tsx
│       │   ├── cockpit/
│       │   │   ├── AmbientCockpitView.tsx   # Default cockpit tab (no drill tracking)
│       │   │   ├── InteractiveCockpitView.tsx  # Drill-tracked: overrides, tracking, composition
│       │   │   ├── InteractivePFD.tsx   # PFD: synthetic vision, tapes, annunciations
│       │   │   ├── InteractiveMFD.tsx   # MFD: 6 tabs + Training Metrics
│       │   │   ├── AutopilotControlBar.tsx  # Mode buttons, AP/AUTO toggles
│       │   │   └── ATCCommunicationOverlay.tsx  # ATC transcript + escalation
│       │   ├── controls/
│       │   │   ├── ModeSelectionBar.tsx
│       │   │   ├── TouchNumpad.tsx
│       │   │   ├── TouchKeyboard.tsx
│       │   │   ├── PilotPredict.tsx
│       │   │   └── PredictSuggestion.tsx
│       │   ├── voice/
│       │   │   ├── VoicePanel.tsx
│       │   │   ├── PTTButton.tsx
│       │   │   ├── TranscriptDisplay.tsx
│       │   │   ├── VoiceStatus.tsx
│       │   │   └── VUMeter.tsx          # 16-segment horizontal VU bar (green/amber/red)
│       │   ├── drill/
│       │   │   ├── DrillDropdownSelector.tsx  # Dropdown drill picker + detail panel
│       │   │   ├── DrillSelector.tsx     # (Legacy) card grid
│       │   │   ├── DrillCard.tsx          # (Legacy) individual card
│       │   │   ├── DrillBriefing.tsx
│       │   │   ├── DrillTimer.tsx
│       │   │   ├── DrillActiveView.tsx   # Core drill execution UI
│       │   │   ├── DrillsTab.tsx         # Drill tab wrapper
│       │   │   ├── CalibrationView.tsx  # Pre-drill voice baseline calibration with VU meter
│       │   │   ├── DecisionPrompt.tsx
│       │   │   └── DrillOutcome.tsx
│       │   ├── assessment/           # Dashboard uses shadcn/ui Charts
│       │   │   ├── AssessmentDashboard.tsx
│       │   │   ├── CBTARadar.tsx      # Radar chart (shadcn/ui)
│       │   │   ├── DrillHistory.tsx   # Bar/line chart
│       │   │   ├── TrendChart.tsx     # Line chart (competency over time)
│       │   │   ├── CohortCompare.tsx  # Grouped bars + percentile
│       │   │   ├── CognitiveLoadIndicator.tsx
│       │   │   ├── ConcordanceRate.tsx   # Assessment concordance display
│       │   │   ├── SessionSummary.tsx # KPI cards (shadcn/ui Card)
│       │   │   └── ExportButton.tsx
│       │   └── shared/
│       │       ├── AnthemButton.tsx
│       │       ├── AnthemCard.tsx
│       │       ├── AnthemInput.tsx
│       │       └── PilotSelector.tsx
│       ├── types/
│       │   ├── index.ts            # Barrel re-export
│       │   ├── scenario.ts
│       │   ├── assessment.ts
│       │   ├── cockpit.ts
│       │   ├── voice.ts
│       │   ├── atc.ts
│       │   ├── cognitive-load.ts
│       │   ├── latency.ts
│       │   ├── pilot.ts
│       │   └── analytics.ts
│       ├── stores/
│       │   ├── cockpit-store.ts
│       │   ├── scenario-store.ts
│       │   ├── voice-store.ts
│       │   ├── assessment-store.ts
│       │   ├── pilot-store.ts
│       │   └── ui-store.ts
│       └── data/
│           ├── drills/
│           │   ├── index.ts              # Barrel re-export of all drills
│           │   ├── descent-conflict.ts
│           │   ├── weather-diversion.ts
│           │   ├── predict-wrong-freq.ts
│           │   ├── runway-change.ts
│           │   ├── holding-pattern.ts
│           │   └── comms-handoff.ts
│           ├── flight-plans/
│           │   ├── kjfk-kbos.ts
│           │   └── kteb-kpbi.ts
│           ├── frequencies.ts
│           ├── waypoints.ts
│           └── phraseology.ts
```

---

## Deepgram STT — LiveKit Agent Plugin

### Why Deepgram as Sole STT Provider

Deepgram Nova-2 runs as a LiveKit STT plugin inside the Python agent worker. It is the sole STT provider.

**Dual STT evaluation and rejection:** Whisper-ATC + Deepgram dual STT was evaluated and rejected. Whisper-ATC requires a self-hosted GPU runtime (faster-whisper), adds Python complexity for marginal prototype benefit. Deepgram provides everything the prototype needs: native streaming (<100ms latency), per-word confidence scores, per-word timestamps, and keyword boosting for aviation terminology.

The ~8-10% pilot WER is acceptable for this prototype. Confidence-weighted scoring (see Assessment Engine) compensates for STT imperfection by excluding low-confidence words from pilot scoring.

### Why Deepgram Over Web Speech API

| Criterion | Deepgram Nova-2 | Web Speech API |
|-----------|-----------------|----------------|
| Accuracy | ~8% WER general, improved with keyword boosting | ~15-20% WER, no tuning |
| Streaming | WebSocket with interim + final results | Event-based, inconsistent timing |
| Word timestamps | Per-word ms-level timestamps | Not available |
| Keyword boosting | Boost aviation terms (callsigns, waypoints) | Not supported |
| Browser support | All browsers (WebSocket) | Chrome-only reliable |
| API key security | Server-side in Python agent | N/A (browser-native) |

### Keyword Boosting Configuration

Keyword boosting is configured in the Python agent (`agent/stt.py`), not browser-side. The agent receives the active drill's keyword list via LiveKit data channel at drill start and applies it to the Deepgram connection.

```python
# agent/stt.py — Deepgram Nova-2 via LiveKit STT plugin
deepgram_options = {
    "model": "nova-2",
    "language": "en",
    "smart_format": True,
    "punctuate": True,           # Enabled for better transcript readability
    "interim_results": True,     # Show live transcript as pilot speaks
    "utterance_end_ms": 1500,    # Detect end of utterance for auto-commit
    "channels": 1,
    "sample_rate": 16000,
    "encoding": "linear16",
    # Dynamic per-drill keyword boosting:
    "keywords": [
        "flight level",
        "descend and maintain",
        "climb and maintain",
        "roger",
        "wilco",
        "squawk",
        "approach",
        "departure",
        "tower",
        "ground",
        # + injected per drill: callsign, active frequencies, waypoint IDs
    ],
}
```

### Latency Measurement — Agent-Side Decomposition

Response latency is decomposed into pilot cognitive time and system overhead. The pilot's score is based **only** on locally-measured values — no network dependency.

PTT press and release events are communicated from the browser to the Python agent via LiveKit data channel messages (`PTT_START` / `PTT_END`). The agent captures raw audio frames from the pilot's audio track and detects speech onset server-side using RMS threshold analysis on the incoming frames.

**Latency decomposition:**
- `pilotReactionMs` = PTT press timestamp - ATC audio end timestamp (purely local browser measurement)
- `speechOnsetMs` = speech onset timestamp - PTT press timestamp (agent-side detection on raw audio frames)

```typescript
// Latency decomposition — pilotReactionMs is local browser, speechOnsetMs from agent
interface LatencyDecomposition {
  // Pilot cognitive latency (used for scoring)
  pilotReactionMs: number;       // atcAudioEnd → PTT press (purely local)
  speechOnsetMs: number;         // PTT press → first voiced sound (agent-side detection)
  totalPilotLatencyMs: number;   // Sum of above — the assessment score input

  // System overhead (displayed for transparency, NOT in scoring)
  networkLatencyMs: number;      // Calibrated WebRTC round-trip estimate
  deepgramProcessingMs: number;  // Estimated Deepgram overhead

  // Raw values for debugging
  atcAudioEndTimestamp: number;
  pttPressTimestamp: number;
  localSpeechOnsetTimestamp: number;  // From agent-side detection via data channel
  deepgramFirstWordStart: number;     // Cross-check only
}
```

**Assessment thresholds (from FAA research / Report B):**
- < 200ms speech onset: possibly pre-rehearsed (noted, not penalized)
- 200-400ms: normal reaction time
- 400-3000ms: acceptable but elevated
- \> 3000ms: cognitive load indicator → WLM competency impact

---

## ElevenLabs TTS — LiveKit TTS Plugin

### Architecture

ATC instruction audio is generated and delivered through the LiveKit agent pipeline:

```
1. ATC instruction text generated (via OpenAI API / Supabase Edge Function)
       ↓
2. Instruction text sent to Python agent via LiveKit data channel
       ↓
3. Agent sends text to ElevenLabs via LiveKit TTS plugin
       ↓
4. Agent applies radio static overlay before/after speech frames
       ↓
5. Audio frames played into the LiveKit room as an audio track
       ↓
6. Browser hears ATC instruction via LiveKit audio track subscription
       ↓
7. On playback complete → agent sends ATC_SPEAK_END via data channel
   → browser starts latency timer, PTT becomes available
```

### Fallback

If ElevenLabs API is unavailable or no API key configured, the browser falls back to `window.speechSynthesis` (Web SpeechSynthesis). Quality is lower but functional for development and demo without API keys.

### Voice Selection

Uses a male voice with moderate pace and slightly clipped cadence to simulate ATC radio communication style. Radio static audio overlay applied by the agent before and after speech to reinforce the communication context.

---

## OpenAI API — ATC Generation

### System Prompt Design

The ATC persona prompt (`agent/prompts/atc_system.py`) establishes:

- **Role:** TRACON or Center controller for the scenario's airspace
- **Facility and sector:** Derived from the drill's geographic context
- **Callsign format:** Standard FAA format (e.g., "November-one-two-three-four-alpha")
- **Phraseology rules:** ICAO/FAA standard phrases only, no conversational language
- **Scenario constraints:** What the controller knows (traffic, weather, runway status) passed per drill
- **Expected behavior:** Issue one instruction at a time, wait for readback, correct errors

### Request Flow

ATC generation requests go through a Supabase Edge Function (`supabase/functions/atc/index.ts`), which holds the `OPENAI_API_KEY` server-side.

```typescript
// atc-engine.ts — calls Supabase Edge Function
async function generateATCInstruction(context: ATCContext): Promise<ATCInstruction> {
  const { data } = await supabase.functions.invoke('atc', {
    body: {
      systemPrompt: buildSystemPrompt(context.facility, context.sector),
      messages: context.conversationHistory,
      drillConstraints: context.drill.atcConstraints,
      pilotCallsign: context.callsign,
      currentState: {
        altitude: context.altitude,
        heading: context.heading,
        frequency: context.frequency,
        phase: context.flightPhase,
      },
    },
  });
  // Returns: { instruction: string, expectedReadback: string, requiredActions: Action[] }
  return data;
}
```

### Expected Readback Generation

Claude generates both the ATC instruction and the expected pilot readback. The expected readback is used by the assessment engine for scoring — it is NOT shown to the pilot. The assessment engine uses fuzzy matching against it, accounting for STT transcription errors.

---

## Zustand Store Design

### Store Slices

```typescript
// cockpit-store.ts — Aircraft and cockpit instrument state
interface CockpitStore {
  flightPlan: Waypoint[];
  activeFrequency: Frequency;
  standbyFrequency: Frequency;
  selectedMode: CockpitMode; // NAV | APR | HDG | ALT | VS
  altitude: number;
  heading: number;
  speed: number;
  // Actions
  setFrequency: (freq: Frequency, slot: 'active' | 'standby') => void;
  swapFrequencies: () => void;
  updateWaypoint: (index: number, waypoint: Partial<Waypoint>) => void;
  setMode: (mode: CockpitMode) => void;
  setAltitude: (alt: number) => void;
  setHeading: (hdg: number) => void;
  setSpeed: (spd: number) => void;
  loadFlightPlan: (plan: Waypoint[]) => void;
  reset: () => void;
}

// scenario-store.ts — Active drill state
interface ScenarioStore {
  availableDrills: DrillDefinition[];
  activeDrill: DrillDefinition | null;
  phase: DrillPhase; // 'idle' | 'briefing' | 'active' | 'decision' | 'outcome'
  currentEventIndex: number;
  eventResults: EventResult[];
  startTime: number | null;
  // Actions
  setAvailableDrills: (drills: DrillDefinition[]) => void;
  selectDrill: (drillId: string) => void;
  startDrill: () => void;
  advanceEvent: () => void;
  recordEventResult: (result: EventResult) => void;
  completeDrill: () => void;
  reset: () => void;
}

// voice-store.ts — Voice communication state
interface VoiceStore {
  isPTTPressed: boolean;
  isRecording: boolean;
  isATCSpeaking: boolean;
  interimTranscript: string;
  transcriptHistory: TranscriptEntry[]; // Now includes ConfidenceAnnotatedWord[]
  pttPressTimestamp: number | null;
  atcSpeakEndTimestamp: number | null;
  localSpeechOnsetTimestamp: number | null; // From agent via data channel
  livekitConnected: boolean;
  // Actions
  pressPTT: () => void;
  releasePTT: () => void;
  setInterimTranscript: (text: string) => void;
  commitTranscript: (entry: TranscriptEntry) => void;
  setATCSpeaking: (speaking: boolean) => void;
  setLocalSpeechOnset: (timestamp: number) => void;
  setLivekitConnected: (connected: boolean) => void;
  clearTranscripts: () => void;
  reset: () => void;
}

// assessment-store.ts — Scoring and metrics
interface AssessmentStore {
  currentDrillMetrics: DrillMetrics | null;
  sessionHistory: DrillResult[];
  cbta: CBTAScores;
  cognitiveLoadBaseline: CognitiveLoadBaseline | null;
  currentEventCognitiveLoad: CognitiveLoadScore[];
  activePilotId: string | null;
  activeSessionId: string | null;  // Created on first drill save, reused within session
  // Actions
  recordReadbackScore: (score: ReadbackScore) => void;
  recordCognitiveLoadScore: (score: CognitiveLoadScore) => void;
  recordDecisionScore: (score: DecisionScore) => void;
  recordTrapScore: (score: TrapScore) => void;
  recordTouchScore: (score: TouchScore) => void;
  initDrillMetrics: (drillId: string) => void;
  finalizeDrillMetrics: () => void;
  setCBTA: (scores: CBTAScores) => void;
  setCognitiveLoadBaseline: (baseline: CognitiveLoadBaseline) => void;
  setActivePilotId: (pilotId: string | null) => void;
  loadFromServer: (pilotId: string) => Promise<void>;   // Loads from Supabase
  saveToServer: () => Promise<void>;                     // Saves to Supabase
  reset: () => void;
}

// pilot-store.ts — Active pilot profile
interface PilotStore {
  activePilot: PilotProfile | null;
  pilots: PilotProfile[];
  // Actions
  selectPilot: (id: string) => void;
  createPilot: (profile: Omit<PilotProfile, 'id' | 'createdAt' | 'lastActiveAt'>) => Promise<void>;
  loadPilots: () => Promise<void>;
}

// ui-store.ts — UI state
interface UIStore {
  activeTab: 'cockpit' | 'drills' | 'assessment';
  activePanel: 'flight-plan' | 'radios';
  numpadOpen: boolean;
  numpadTarget: string | null;
  // Actions
  setActiveTab: (tab: string) => void;
  setActivePanel: (panel: string) => void;
  openNumpad: (target: string) => void;
  closeNumpad: () => void;
}
```

### Store Interaction Pattern

Stores are independent slices. Services read from stores directly (Zustand's `getState()`), and components subscribe to specific fields via selectors to avoid unnecessary re-renders.

```
Component → useStore(selector) → reactive to specific field
Service  → store.getState()   → reads snapshot, no subscription
Service  → store.setState()   → writes update, triggers subscriptions
```

---

## Drill Scenario Schema

### Type Definition

```typescript
interface DrillDefinition {
  id: string;
  title: string;
  description: string;
  duration: number;              // Expected duration in seconds (180-300)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  competencies: CBTACompetency[]; // Which CBTA areas this drill tests
  flightPlan: string;            // Reference to flight plan data file
  initialState: CockpitState;    // Cockpit state at drill start
  events: DrillEvent[];          // Ordered sequence of events
  atcContext: {
    facility: string;            // e.g., "New York TRACON"
    sector: string;              // e.g., "Approach Control"
    callsign: string;            // Pilot's callsign
    traffic: string[];           // Other traffic for context
    weather: string;             // METAR or description
  };
}

type DrillEvent =
  | ATCInstructionEvent
  | DecisionPointEvent
  | PredictSuggestionEvent
  | CockpitActionEvent
  | InteractiveCockpitEvent;

interface ATCInstructionEvent {
  type: 'atc_instruction';
  prompt: string;                // Context hint for Claude to generate instruction
  expectedActions: CockpitAction[]; // What pilot should do after readback
  keywords: string[];            // Additional Deepgram keyword boosts for this event
}

interface DecisionPointEvent {
  type: 'decision_point';
  prompt: string;                // Situation description shown to pilot
  options: DecisionOption[];     // 2-4 choices
  correctOptionId: string;
  timeLimitSeconds: number;      // Decision timer (15-30s typical)
}

interface PredictSuggestionEvent {
  type: 'predict_suggestion';
  suggestion: string;            // What PilotPredict suggests (intentionally wrong)
  correctAction: string;         // What pilot should actually do
  context: string;               // Why the suggestion is wrong
}

interface CockpitActionEvent {
  type: 'cockpit_action';
  instruction: string;           // What to tell the pilot to do
  expectedAction: CockpitAction; // The correct touch action
  timeLimitSeconds: number;
}

interface InteractiveCockpitEvent {
  type: 'interactive_cockpit';
  description: string;                        // Situation context shown to pilot
  initialCockpitOverrides: Partial<CockpitState>; // State applied on mount
  successConditions: CockpitSuccessCondition[];   // All must be met to pass
  timeLimitSeconds: number;                   // Max time before auto-fail (60s typical)
  escalationPrompt?: string;                  // ATC escalation if pilot is slow
  escalationDelaySeconds?: number;            // Delay before escalation fires (30s typical)
}

interface CockpitSuccessCondition {
  field: keyof CockpitState;                  // e.g., 'selectedMode', 'desiredAltitude'
  operator: 'eq' | 'lte' | 'gte' | 'neq' | 'in';
  value: number | string | string[];
  label: string;                              // Human-readable description
}

interface InteractiveCockpitScore {
  conditionsMet: string[];        // Labels of conditions satisfied
  allConditionsMet: boolean;
  totalTimeMs: number;
  timedOut: boolean;
  modeChanges: { mode: string; timeMs: number }[];
  altitudeChanges: { altitude: number; timeMs: number }[];
  escalationTriggered: boolean;
}
```

### Example Drill: VNAV Descent Conflict

A unified 4-event scenario where a pilot at 14,000ft in VNAV mode has an 11,000ft VNAV constraint blocking descent to 8,000ft. Pilot must recognize the constraint, decide to override, confirm with ATC, then physically switch modes and set altitude on the interactive cockpit.

```typescript
const descentConflict: DrillDefinition = {
  id: 'descent-conflict',
  title: 'VNAV Descent Conflict',
  description: 'VNAV constraint blocks ATC-cleared descent to 8,000ft. ' +
    'Tests mode awareness, knowledge, communication, and flight path management.',
  duration: 300,
  difficulty: 'intermediate',
  competencies: ['COM', 'SAW', 'KNO', 'PSD', 'FPM'],
  flightPlan: 'kteb-kpbi',
  initialState: {
    altitude: 14000, heading: 234, speed: 157,
    selectedMode: 'VNAV',
    desiredAltitude: 14000,
    vnavConstraint: 11000,
    activeFrequency: { value: 119.1, label: 'JAX Center' },
  },
  events: [
    // Event 1: ATC voice instruction — "Descend and maintain 8,000"
    { type: 'atc_instruction', ... },
    // Event 2: Decision — recognize VNAV constraint, choose FLCH/VS override
    { type: 'decision_point', timeLimitSeconds: 20, ... },
    // Event 3: ATC confirmation — "Confirm you are descending to 8,000"
    { type: 'atc_instruction', ... },
    // Event 4: Interactive cockpit — pilot operates PFD/MFD to execute descent
    {
      type: 'interactive_cockpit',
      description: 'Execute the mode change and set altitude to 8,000 feet',
      initialCockpitOverrides: {
        altitude: 14000, selectedMode: 'VNAV',
        desiredAltitude: 14000, vnavConstraint: 11000,
      },
      successConditions: [
        { field: 'selectedMode', operator: 'in', value: ['FLCH', 'VS'],
          label: 'Switch from VNAV to FLCH or VS mode' },
        { field: 'desiredAltitude', operator: 'eq', value: 8000,
          label: 'Set altitude to 8,000 feet' },
      ],
      timeLimitSeconds: 60,
      escalationPrompt: 'Expedite your descent to 8,000, traffic below you.',
      escalationDelaySeconds: 30,
    },
  ],
  atcContext: { ... },
};
```

---

## Interactive Cockpit Subsystem

When a drill contains an `interactive_cockpit` event, the system renders a 2-panel flight deck UI adapted from the Honeywell Anthem cockpit. The pilot physically operates mode buttons and altitude controls on an interactive PFD + MFD, while the system tracks every action and evaluates success conditions.

### Component Architecture

```
InteractiveCockpitView (top-level container)
├── AutopilotControlBar           — FLCH/VNAV/ALT/VS mode buttons + AP/AUTO toggles + altitude display
├── InteractivePFD (left, ~70%)   — Synthetic vision, altitude/speed/heading tapes, mode annunciations
├── InteractiveMFD (right, ~30%)  — 6 tabs (Home, Audio, Flight Plan, Checklists, Synoptics, Messages) + Training Metrics
└── ATCCommunicationOverlay       — Floating ATC transcript panel with escalation messages
```

### Data Flow

1. **On mount:** `InteractiveCockpitView` applies `initialCockpitOverrides` to `cockpit-store` (once, via ref guard)
2. **Altitude simulation:** `useAltitudeSimulation` runs a 500ms interval, moving `altitude` toward `desiredAltitude` at mode-dependent rates:
   - VNAV: 100ft/tick (respects `vnavConstraint` — won't descend below constraint altitude)
   - FLCH: 200ft/tick (overrides constraint)
   - VS: 150ft/tick (overrides constraint)
3. **Action tracking:** `useInteractiveCockpitTracker` subscribes to cockpit-store, records mode/altitude changes with timestamps, evaluates `CockpitSuccessCondition`s on every change
4. **Escalation:** If pilot hasn't met all conditions within `escalationDelaySeconds`, an ATC escalation message fires
5. **Completion:** When all conditions met OR `timeLimitSeconds` expires → produces `InteractiveCockpitScore` → recorded to `assessment-store`

### CockpitState Extensions

Fields added for interactive cockpit support:
- `desiredAltitude: number` — Target altitude set by pilot (MCP altitude window)
- `vnavConstraint: number` — VNAV altitude floor (blocks descent in VNAV mode)
- `autopilot: boolean` — AP engaged/disengaged
- `autoThrottle: boolean` — Auto-throttle engaged/disengaged
- `CockpitMode` union extended with `'VNAV' | 'FLCH'`

### Scoring Integration

`InteractiveCockpitScore` feeds into FPM (Flight Path Management) CBTA competency:
- Conditions met percentage → base score
- Time penalty: >30s average → -10 points
- Escalation penalty: -5 points if escalation triggered
- When both `touchScores` and `interactiveCockpitScores` exist: 40% touch + 60% interactive

---

## Assessment Engine

### Readback Scoring — Confidence-Weighted

Uses confidence-weighted fuzzy token comparison. Deepgram's per-word confidence scores prevent STT errors from being scored as pilot errors. See `Metrics_research.md` for full empirical justification.

```typescript
interface ReadbackScore {
  rawAccuracy: number;                  // 0-100, original LCS score (for reference)
  confidenceAdjustedAccuracy: number;   // 0-100, used for CBTA rollup
  latency: LatencyDecomposition;        // Agent-side decomposition (see Latency section)
  phraseology: number;                  // 0-100, ICAO standard phrase adherence
  callsignCorrect: boolean;
  transcriptConfidence: number;         // Mean Deepgram confidence for transcript
  estimatedWER: number;                 // Estimated WER for this transcript
  scoringBasis: 'confident' | 'uncertain' | 'abstained';
  uncertainElements: UncertainElement[];
  criticalElements: {
    element: string;
    matched: boolean;
    weight: number;
    matchConfidence: number;  // Deepgram confidence of the matching word
    discounted: boolean;      // True if excluded due to low STT confidence
  }[];
}

interface UncertainElement {
  element: string;           // The critical element (e.g., "FL240")
  transcribedAs: string;     // What Deepgram heard
  confidence: number;        // Deepgram confidence
  flaggedForReview: boolean; // Marked for instructor review
}
```

**Confidence tiers:**

| Tier | Deepgram Confidence | Scoring Treatment |
|------|-------------------|-------------------|
| High | >= 0.85 | Full weight (1.0x) in scoring |
| Medium | 0.60-0.84 | Half weight (0.5x) |
| Low | < 0.60 | Excluded (0.0x), flagged for instructor review |

**Abstention rule:** If mean transcript confidence < 0.50 OR > 40% of words are low-confidence → `scoringBasis: 'abstained'`. Score is NOT counted toward CBTA rollup. UI shows: "Transcript quality too low — instructor review required."

**Estimated WER per transcript:**
```
estimatedWER ≈ Σ(1 - confidence_i) / totalWords
```

**Scoring algorithm:**
1. Tokenize expected readback and actual transcript (with confidence annotations)
2. Identify critical elements (altitudes, headings, frequencies, callsign) — weight 2x
3. Run LCS on token sequences
4. In scoring phase, weight each token match/mismatch by its confidence tier
5. Low-confidence mismatches → zero penalty (likely STT error, not pilot error)
6. High-confidence mismatches → full penalty (likely real pilot error)
7. Apply phraseology bonus for standard ICAO phrasing
8. Deduct for incorrect or omitted callsign
9. Report both raw and confidence-adjusted scores

### Voice Biomarker Extraction — Cognitive Load Measurement

All voice biomarker extraction happens in the Python agent via librosa and numpy. See `Metrics_research.md` for complete empirical evidence and weight derivation.

**Audio capture pipeline:**
```
LiveKit Room → Agent Worker receives pilot's audio track
  ├── Audio → Deepgram Nova-2 STT (streaming, per-word confidence + timestamps)
  └── Raw audio frames → librosa (F0, RMS, MFCC, spectral extraction)
                        → numpy (smoothing, octave correction)
                        → Assessment scores → data channel → browser
```

**Extraction methods (all in `agent/voice_analysis.py`):**
- **F0 extraction:** `librosa.yin()` or `librosa.pyin()` on raw PCM (16kHz)
- **RMS intensity:** `librosa.feature.rms()`
- **MFCC:** `librosa.feature.mfcc()` for voice quality characterization
- **Spectral features:** `librosa.feature.spectral_centroid()`, `spectral_rolloff()`, `spectral_flatness()`

The agent receives raw audio frames from LiveKit, processes them through the librosa pipeline, and sends computed scores to the browser via LiveKit data channel.

```typescript
interface VoiceBiomarkers {
  f0Mean: number;            // Hz — fundamental frequency mean
  f0Peak: number;            // Hz — peak F0 in utterance
  f0Range: number;           // Hz — max minus min (narrowing = load)
  f0Std: number;             // Hz — standard deviation
  vocalIntensityRMS: number; // dB relative to baseline
  speechRateWPM: number;     // Words per minute (from Deepgram word timestamps)
  articulationRateWPM: number; // WPM excluding pauses > 200ms
  disfluencyCount: number;   // "um", "uh", "er", "ah" count
  disfluencyRate: number;    // Per 100 words
  utteranceDurationMs: number;
}

interface CognitiveLoadBaseline {
  pilotId: string;
  sampleCount: number;       // Utterances in baseline
  f0Mean: number; f0Std: number; f0RangeMean: number;
  intensityMean: number; intensityStd: number;
  speechRateMean: number; speechRateStd: number;
  disfluencyRateMean: number; disfluencyRateStd: number;
  isCalibrated: boolean;     // True after 10+ utterances
}

interface CognitiveLoadScore {
  eventIndex: number;
  biomarkers: VoiceBiomarkers;
  deviations: {              // Z-scores relative to pilot's own baseline
    f0Deviation: number;     // Positive = higher pitch = more load
    intensityDeviation: number;
    speechRateDeviation: number; // Negative = slower = more load
    f0RangeDeviation: number;    // Negative = narrower = more load
    disfluencyDeviation: number; // Positive = more disfluencies = more load
  };
  compositeLoad: number;     // 0-100 weighted composite
  confidence: number;        // 0-1 based on calibration status + signal quality
  calibrationStatus: 'uncalibrated' | 'partial' | 'calibrated';
}
```

**Composite load weights:** F0 deviation 0.35, disfluency rate 0.25, F0 range narrowing 0.15, speech rate decrease 0.15, vocal intensity 0.10. Derived from relative evidence strength — see `Metrics_research.md` Section 1.6.

**Calibration:** A dedicated pre-drill calibration flow (`CalibrationView.tsx`) runs before the pilot's first drill. The pilot reads 5 standard ATC phrases while a real-time VU meter (`VUMeter.tsx`, driven by `useAudioLevel` hook via Web Audio API `AnalyserNode` RMS) provides visual mic feedback. After 5 phrases → partial baseline (confidence 0.3-0.65). After 10+ utterances (including drill speech) → calibrated (confidence 0.7-1.0). Baseline is stored per-pilot in Supabase PostgreSQL and restored to the Python agent on LiveKit reconnect via the `SET_BASELINE` data channel message (running sums are reconstructed from mean/std values).

### CBTA Competency Mapping

Each drill maps to 2-3 CBTA competencies. Individual event scores roll up into competency scores:

| Competency | Code | Measured By |
|-----------|------|-------------|
| Communication | COM | Confidence-adjusted readback accuracy, phraseology, callsign usage, response latency |
| Workload Management | WLM | Task completion time, cognitive load composite (inverted), sequential task ordering |
| Situational Awareness | SAW | Decision correctness with conflicting information, PilotPredict trap detection, cognitive load context |
| Knowledge | KNO | Procedural correctness, PilotPredict trap detection, holding pattern entry |
| Problem Solving & Decision Making | PSD | Decision correctness, time-to-decision, clarification requests |
| Flight Path Management | FPM | Flight plan modifications, altitude/heading selections, mode selections |

**Aggregation:** Weighted rolling average (exponential decay, 0.95^(N-i)) across last 20 drill attempts. Stored server-side in Supabase PostgreSQL. Radar chart (shadcn/ui Charts) displays all six competencies with optional population P25/P75 overlay.

### Decision Scoring

```typescript
interface DecisionScore {
  correct: boolean;
  timeToDecision: number;    // ms from prompt display to selection
  timedOut: boolean;         // Did the timer expire?
  optionSelected: string;    // Which option was chosen
}
```

### PilotPredict Trap Scoring

```typescript
interface TrapScore {
  detected: boolean;         // Did pilot reject the wrong suggestion?
  timeToReject: number;      // ms (if rejected)
  acceptedWrong: boolean;    // Did pilot accept the trap?
}
```

---

## Anthem CSS Theme

Derived from Anthem cockpit visual design — dark background with cyan, green, and magenta accent colors.

```css
/* Tailwind 4 @theme block — variable names use --color-anthem-* prefix */
/* In Tailwind utilities: bg-anthem-bg-primary, text-anthem-cyan, etc. */
@theme {
  /* Background layers */
  --color-anthem-bg-primary: #0a0e17;      /* Main cockpit background */
  --color-anthem-bg-secondary: #111827;    /* Panel background */
  --color-anthem-bg-tertiary: #1a2235;     /* Card/elevated surface */
  --color-anthem-bg-input: #0d1321;        /* Input field background */

  /* Primary accent — Cyan (active elements, selected state) */
  --color-anthem-cyan: #00d4ff;
  --color-anthem-cyan-dim: #0891b2;

  /* Secondary accent — Green (positive/confirmed state) */
  --color-anthem-green: #22c55e;
  --color-anthem-green-dim: #16a34a;

  /* Tertiary accent — Magenta (warnings, attention) */
  --color-anthem-magenta: #e040fb;
  --color-anthem-magenta-dim: #ab47bc;

  /* Alert — Amber (cautions) */
  --color-anthem-amber: #f59e0b;

  /* Alert — Red (warnings) */
  --color-anthem-red: #ef4444;

  /* Text hierarchy */
  --color-anthem-text-primary: #e2e8f0;    /* Primary text */
  --color-anthem-text-secondary: #94a3b8;  /* Secondary/label text */
  --color-anthem-text-muted: #475569;      /* Disabled/inactive text */

  /* Borders */
  --color-anthem-border: #1e293b;
  --color-anthem-border-active: #00d4ff;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}

/* Additional non-theme CSS custom properties */
:root {
  --anthem-cyan-glow: rgba(0, 212, 255, 0.15);
  --anthem-touch-min: 44px;          /* Minimum touch target size */
}
```

### Design Principles

- **Dark-first:** All backgrounds are dark navy/charcoal. No light mode.
- **High contrast text:** Primary text is near-white on dark backgrounds.
- **Color-coded states:** Cyan = active/selected, Green = confirmed/correct, Magenta = attention/highlight, Amber = caution, Red = warning/error.
- **Touch-optimized:** All interactive elements minimum 44x44px. Generous padding. Ripple feedback on touch.
- **Monospace data:** Frequencies, altitudes, waypoint IDs displayed in monospace font. Labels in sans-serif.
- **Glow effects:** Active elements use subtle cyan glow (box-shadow) to simulate avionics display aesthetic.

---

## Supabase Backend

### Overview

Supabase replaces the Express + SQLite stack entirely. There is no `app/server/` directory. The browser talks directly to Supabase Cloud (for data CRUD and analytics) and LiveKit Cloud (for real-time audio). Secret-dependent operations use Supabase Edge Functions.

### Edge Functions

Edge Functions run on Deno and access secrets via `Deno.env.get()`. The browser calls them via `supabase.functions.invoke()`.

**`supabase/functions/atc/index.ts`** — OpenAI API proxy. Receives scenario context from the browser, calls OpenAI (gpt-4o-mini) with the `OPENAI_API_KEY`, returns ATC instruction + expected readback.

**`supabase/functions/livekit-token/index.ts`** — LiveKit room token generation. Uses `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` to mint a short-lived access token for the browser to join a LiveKit room.

### Environment Variables

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

### Security

- All API keys stored as Supabase Edge Function secrets — never exposed in browser code
- `.env` contains only public Supabase URL/anon key and LiveKit URL (safe for browser)
- Edge Functions access secrets via `Deno.env.get()` at runtime
- LiveKit tokens are short-lived and scoped to a specific room
- Supabase anon key is safe for browser — Row Level Security (RLS) controls data access

---

## Supabase PostgreSQL — Population-Level Storage

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

### Analytics via PostgreSQL RPC Functions

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

### Data Flow

```
assessment-store → api-client.ts → supabase.from(...) → Supabase PostgreSQL
```

**Offline fallback:** `storage.ts` retains localStorage. If Supabase is unreachable, data queues locally and syncs when connection becomes available.

### Pilot Profiles

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

Selection via `PilotSelector.tsx` in TopNavBar. No auth — trust-based identity (prototype constraint).

### Population Analytics

`CBTARadar.tsx` (shadcn/ui Charts radar) accepts optional `populationBaseline` prop → renders P25/P75 band behind the pilot's individual scores. `CohortCompare.tsx` enables accent group comparison, experience level comparison, and per-drill difficulty analysis.

---

## Data Flow Diagrams

### ATC Drill Cycle

```
1. Browser → LiveKit JS SDK: connect to room, publish mic track
2. ScenarioRunner triggers ATC event → calls Supabase Edge Function /atc → Claude returns instruction
3. Instruction text → sent to agent via data channel
4. Agent Worker:
   a. Receives instruction text
   b. Sends to ElevenLabs TTS → audio frames played into room
   c. Browser hears ATC instruction via LiveKit audio track
   d. ATC_SPEAK_END sent in `finally` block (always fires, even on TTS failure)
   e. Browser has 30s safety timeout — resets `isATCSpeaking` if ATC_SPEAK_END never arrives

5. Pilot presses PTT → browser sends PTT_START via data channel
6. Agent Worker:
   a. Captures raw audio frames from pilot's track
   b. Streams audio to Deepgram → real-time transcripts (per-word confidence + timestamps)
   c. Interim transcripts sent to browser via data channel → live TranscriptDisplay
   d. Runs F0, RMS, MFCC, spectral extraction (librosa) on audio frames

7. Pilot releases PTT → browser sends PTT_END via data channel
8. Agent Worker:
   a. Deepgram final transcript with per-word confidence + timestamps
   b. Computes: readback accuracy (confidence-weighted), speech rate, disfluency rate
   c. Computes: cognitive load score (F0 deviation + RMS + spectral vs baseline)
   d. Computes: latency decomposition
   e. Sends assessment payload to browser via data channel (ASSESSMENT_RESULT)
   f. Sends cognitive load baseline update via data channel (BASELINE_UPDATE)
   g. Persists to Supabase via REST API (service role key)

9. Browser receives assessment → updates Zustand stores → renders shadcn/ui Charts
```

### Data Channel Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `PTT_START` | Browser → Agent | Pilot pressed push-to-talk |
| `PTT_END` | Browser → Agent | Pilot released push-to-talk |
| `SET_KEYWORDS` | Browser → Agent | Drill-specific keyword boosting list |
| `ATC_INSTRUCTION` | Browser → Agent | ATC instruction text for TTS |
| `INTERIM_TRANSCRIPT` | Agent → Browser | Live partial STT transcript |
| `FINAL_TRANSCRIPT` | Agent → Browser | Committed STT transcript with confidence |
| `ATC_SPEAK_END` | Agent → Browser | TTS playback complete, PTT available |
| `ASSESSMENT_RESULT` | Agent → Browser | Scored readback + cognitive load + latency |
| `BASELINE_UPDATE` | Agent → Browser | Updated cognitive load baseline after calibration |
| `SET_BASELINE` | Browser → Agent | Restore persisted baseline on reconnect (running sums reconstructed) |

### PilotPredict Flow

```
ScenarioRunner triggers predict_suggestion event
       ↓
pilot-predict service generates suggestion
(intentionally wrong for training trap)
       ↓
PilotPredict component shows suggestion chip
       ↓
       ├── Pilot REJECTS → assessment: trap detected ✓
       │                    correct action prompted
       │
       └── Pilot ACCEPTS → assessment: trap missed ✗
                            feedback shown, correct action explained
```

### Assessment Pipeline

```
Event scores (per-event)
  ├── ReadbackScore
  │     ├── Confidence-weighted accuracy (raw + adjusted)
  │     ├── Latency decomposition (agent-side)
  │     ├── Phraseology, callsign, estimated WER
  │     └── Scoring basis: confident | uncertain | abstained
  ├── CognitiveLoadScore
  │     ├── F0 deviation, disfluency rate, speech rate, intensity (z-scores)
  │     ├── Composite load (0-100, weighted)
  │     └── Calibration status + confidence
  ├── DecisionScore (correct, time, timed_out)
  ├── TrapScore (detected, time_to_reject)
  └── TouchScore (correct, task_time, errors)
       │
       ▼
DrillMetrics (per-drill aggregate)
  ├── Overall score (0-100)
  ├── Per-event breakdown
  ├── Per-competency scores
  └── Cognitive load timeline
       │
       ▼
CBTAScores (rolling session aggregate, exponential decay)
  ├── COM: 0-100  (readback accuracy + phraseology + latency)
  ├── WLM: 0-100  (task time + cognitive load inverted)
  ├── SAW: 0-100  (decision correctness + trap detection)
  ├── KNO: 0-100  (procedural correctness + trap detection)
  ├── PSD: 0-100  (decision correctness + time-to-decision)
  └── FPM: 0-100  (flight plan mods + mode selections)
       │
       ▼
Server-side persistence (Supabase PostgreSQL via api-client)
  ├── Drill results with full metrics
  ├── Per-pilot CBTA running averages
  ├── Cognitive load baselines (per-pilot)
  └── Population analytics (aggregated)
```

---

## Component Hierarchy

```
App
├── TopNavBar (tabs: Cockpit | Drills | Assessment)
├── StatusBar (clock, active freq, drill status)
│
├── [tab: cockpit]
│   └── AmbientCockpitView (default landing — interactive flight deck)
│       ├── AutopilotControlBar (FLCH/VNAV/ALT/VS/AP/AUTO + altitude)
│       ├── InteractivePFD (synthetic vision, altitude/speed/heading tapes)
│       ├── InteractiveMFD (6 tabs + Training Metrics, ambient mode)
│       └── ATCCommunicationOverlay (ATC transcripts)
│
├── [tab: drills]
│   └── DrillsTab
│       ├── CalibrationView (shown before first drill if no baseline)
│       │   └── VUMeter (real-time mic level, useAudioLevel hook)
│       ├── DrillDropdownSelector (dropdown + detail panel + start button)
│       ├── DrillBriefing (when drill selected)
│       ├── DrillActiveView (during active drill)
│       │   ├── DrillTimer
│       │   ├── DecisionPrompt (modal, conditional)
│       │   └── InteractiveCockpitView (for interactive_cockpit events)
│       │       ├── AutopilotControlBar
│       │       ├── InteractivePFD (synthetic vision, tapes, annunciations)
│       │       ├── InteractiveMFD (6 tabs + Training Metrics)
│       │       └── ATCCommunicationOverlay
│       └── DrillOutcome (when drill complete)
│
└── [tab: assessment]
    └── AssessmentDashboard
        ├── CBTARadar (shadcn/ui radar chart + population P25/P75 overlay)
        ├── CognitiveLoadIndicator (timeline + sparklines)
        ├── DrillHistory (bar/line chart with confidence + latency decomposition)
        ├── TrendChart (competency over time)
        ├── CohortCompare (accent group, experience level drill-down)
        ├── ConcordanceRate (assessment concordance display)
        ├── SessionSummary (KPI cards)
        └── ExportButton (JSON/CSV)
```

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
| Backend | Supabase (Postgres + Edge Functions) | Express + SQLite | Managed DB, auto REST API, Edge Functions for secrets, zero server ops |
| Charts | shadcn/ui Charts (Recharts) | Tremor / raw Recharts | Radar chart support (Tremor lacks it), CSS variable theming, copy-paste ownership |
| Voice analysis | librosa + numpy (Python agent) | Meyda.js (browser) / AudioWorklet | Meyda.js lacks F0; librosa is research-grade for all biomarkers; zero extra infra since Python agent already exists |
| API key handling | Supabase Edge Functions + LiveKit server-side | Browser env vars | Secrets never in browser; Edge Functions for Claude/LiveKit tokens |
| Readback scoring | Confidence-weighted LCS | Raw LCS / exact match | Per-word confidence prevents STT errors from penalizing pilots; abstains when uncertain |
| Latency measurement | Agent-side speech onset detection | Browser AudioWorklet VAD | Agent already processes raw audio; consistent measurement in one location |
| Cognitive load baseline | Per-speaker calibration | Population norms | NASA Ames found zero cross-individual correlation; per-speaker is the only valid approach |
| Drill definitions | Declarative data objects | Imperative code | Easier to author new drills; separates content from execution logic |
| CSS approach | Tailwind + CSS variables | CSS-in-JS / styled-components | Fast iteration; theme variables enable consistent Anthem aesthetic |
