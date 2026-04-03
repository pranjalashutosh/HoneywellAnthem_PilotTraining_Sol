# Data Flows & Component Hierarchy

ATC drill cycle, data channel messages, PilotPredict flow, assessment pipeline, and component tree.

---

## ATC Drill Cycle

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

---

## Data Channel Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `PTT_START` | Browser → Agent | Pilot pressed push-to-talk |
| `PTT_END` | Browser → Agent | Pilot released push-to-talk |
| `SET_KEYWORDS` | Browser → Agent | Drill-specific keyword boosting list |
| `ATC_INSTRUCTION` | Browser → Agent | ATC instruction text for TTS |
| `INTERIM_TRANSCRIPT` | Agent → Browser | Live partial STT transcript |
| `FINAL_TRANSCRIPT` | Agent → Browser | Committed STT transcript with confidence |
| `ATC_SPEAK_END` | Agent → Browser | TTS playback complete, PTT available |
| `ASSESSMENT_RESULT` | Agent → Browser | Scored readback + cognitive load + latency. During `atc_instruction` events, triggers readback-gated auto-advance (no manual "Continue" button). |
| `BASELINE_UPDATE` | Agent → Browser | Updated cognitive load baseline after calibration |
| `SET_BASELINE` | Browser → Agent | Restore persisted baseline on reconnect (running sums reconstructed) |
| `ATC_ESCALATION` | Browser → Agent | Escalation text for TTS playback during interactive cockpit events |
| `INTERACTIVE_COCKPIT_RESULT` | Browser → Agent | Final interactive cockpit score sent to agent for drill evaluation |
| `FREETALK_START` | Browser → Agent | Enter Free Talk mode with callsign, altitude, heading, frequency |
| `FREETALK_END` | Browser → Agent | Exit Free Talk mode, clear state |
| `SET_PERSONA` | Browser → Agent | Switch active ATC persona by frequency (COM swap) |
| `FREETALK_RESPONSE` | Agent → Browser | ATC conversational response with persona ID and facility |

---

## PilotPredict Flow

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

---

## Assessment Pipeline

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

## Map & Flight Plan Data Flow

```
Route Selection (FlightPlanTab RoutePicker)
       ↓
handleRouteChange(routeId)
       ├── cockpit-store.loadFlightPlan(config.waypoints)
       ├── cockpit-store.setActiveRouteId(routeId)
       └── cockpit-store.setSpeed(config.aircraft.groundSpeed)
              ↓
MapDisplay subscribes to cockpit-store.activeRouteId
       ├── route-registry.getRoute(id) → FlightPlanPackage + airports + viewport
       ├── RouteChangeController → map.panTo() + map.setZoom()
       ├── RouteOverlay re-renders with new waypoints
       ├── WaypointMarkers re-renders with new airports/fixes
       └── MapInfoPanel updates next WPT bearing/distance/ETE

Flight Plan Enrichment (on every render):
       enrichWaypoints(waypoints, speed) → EnrichedWaypoint[]
              ↓
       computeProgress(enriched, speed) → FlightPlanProgress (single source of truth)
              ↓
       ProgressCard, ProceduresCard, WaypointLegs table consume snapshot

Drill Integration (both tabs):
       scenario-store.activeDrill.id
              ├── FlightPlanTab: maps drill ID → training flags → badge/status changes
              └── MapDisplay: toggles ScenarioOverlay visibility by overlay.kind
```

---

## Component Hierarchy

```
App (single-screen cockpit — no top-level tab routing)
├── StatusBar (clock, active freq, pilot name, drill status)
│
├── AmbientCockpitView (always visible — phase-aware cockpit, auto-switches Radios tab for ATC and frequency cockpit_action events)
│   ├── AutopilotControlBar (FLCH/VNAV/ALT/VS/AP/AUTO + altitude)
│   ├── InteractivePFD (synthetic vision, altitude/speed/heading tapes)
│   ├── ResizeHandle (draggable PFD/MFD split, 300-600px)
│   ├── InteractiveMFD (6 tabs + InlineFrequencyNumpad + embedded drill lifecycle)
│   │   ├── HomeTab
│   │   │   ├── PilotSelector (moved from former TopNavBar)
│   │   │   ├── System Status / All Systems Normal
│   │   │   ├── TrainingSection (drill selection, briefing, HUD, outcome)
│   │   │   └── Assessment access button
│   │   ├── RadiosTab (drill-aware: ATC contact flow + frequency cockpit_action instruction panel)
│   │   ├── FlightPlanTab (route picker, progress, procedures, waypoint legs, training badges)
│   │   │   └── Uses flight-plan-utils.ts: enrichWaypoints() → computeProgress() (pure math, zero React deps)
│   │   ├── MapTab → MapDisplay (Google Maps with dark avionics theme)
│   │   │   ├── AircraftMarker (heading-aware SVG, pulsing halo)
│   │   │   ├── RouteOverlay (flown=dim cyan, ahead=bright cyan, breadcrumb trail)
│   │   │   ├── WaypointMarkers (diamond fixes, ring airports)
│   │   │   ├── ScenarioOverlay (drill zones: weather/holding/vnav/comms)
│   │   │   ├── MapControls (layer toggles: RTE/APT/WPT/TRK/WX, zoom, recenter)
│   │   │   └── MapInfoPanel (callsign, heading, alt, speed, next WPT, ETE)
│   │   └── InlineFrequencyNumpad (bottom panel: digit grid, predictive suggestions, SWAP, collapsible)
│   ├── DrillEventOverlay (non-ATC, non-frequency drill events: decision, predict, non-frequency cockpit action)
│   └── [phase: interactive_cockpit] → InteractiveCockpitView
│       ├── AutopilotControlBar
│       ├── InteractivePFD
│       ├── ResizeHandle
│       ├── InteractiveMFD (6 tabs + InlineFrequencyNumpad)
│       └── ATCCommunicationOverlay
│
└── AssessmentOverlay (fullscreen, triggered from Home tab or drill outcome)
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
