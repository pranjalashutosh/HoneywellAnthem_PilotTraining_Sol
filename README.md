# Honeywell Anthem Cockpit — Pilot Training Prototype

A browser-based functional prototype that replicates Honeywell Anthem's touch-first cockpit interface, combining AI-driven ATC voice communication with decision-making drills to accelerate pilot proficiency on the next-generation flight deck.

## What It Does

- **Touch-first cockpit interface** — Flight plan editing, frequency tuning, mode selection, and PilotPredict interaction via touch
- **AI-generated ATC voice communication** — Claude API generates contextual ATC instructions; ElevenLabs provides realistic voice via LiveKit; pilots respond via push-to-talk
- **Real-time voice assessment** — Deepgram Nova-2 STT (via LiveKit agent) with word-level timestamps measures readback accuracy, response latency, and phraseology adherence
- **Voice biomarker analysis** — Python agent extracts F0, RMS, MFCC, and spectral features via librosa for cognitive load measurement
- **Decision drills** — Timed scenario based decisions (traffic conflicts, weather diversions, PilotPredict traps) mapped to ICAO CBTA competencies
- **Competency dashboard** — shadcn/ui Charts radar visualization of six CBTA competencies (COM, WLM, SAW, KNO, PSD, FPM) with drill history and cohort comparison
- **Avionics map display** — Google Maps dark-themed aviation MFD map with live route overlay, waypoint markers, aircraft position, scenario overlays (weather zones, holding regions, VNAV conflict areas, comms handoff sectors), layer toggles, and info panel. Map re-centers automatically when the active route is changed
- **Condensed flight plan module** — Full avionics-style flight plan page with dynamic procedure states (SID/STAR/APPR promoted from PLN → ACT based on flight phase), training-aware route display (inline badges per waypoint for VNAV/HOLD/FREQ/RWY conflicts), click-to-select waypoint with inline detail, HOLD insert rows, route deviation banner, and a single-source-of-truth route math engine

## Problem

The EPIC-to-Anthem transition is not incremental — it is an architectural generation change: touch interfaces replace physical knobs and buttons, AI-driven features (PilotPredict) anticipate pilot inputs, customizable display layouts replace fixed arrangements, and always-on cloud connectivity redefines cockpit workflows. 73% of pilots have inadvertently selected wrong automation modes, and insufficient crew knowledge of automated systems contributed to over one-third of accidents and serious incidents. Dedicated avionics only transition training is poorly standardized.

## Approach

This project was designed through a **multi-agent adversarial debate** (three Claude Code agents) that stress-tested regulatory, infrastructure, and assessment perspectives to produce an integrated training solution. The prototype implements the key concepts from that synthesis.

See [`Final_Synthesis.md`](brain_StormDocuments/Final_Synthesis.md) for the complete training solution design.

## Repository Structure

```
.
├── CLAUDE.md                  # Project development instructions
├── ARCHITECTURE.md            # Full technical architecture
├── knowledge_map.md           # File catalog grouped by feature pipeline
├── Metrics_research.md        # Empirical evidence for assessment metrics
├── brain_StormDocuments/      # Research reports and synthesis
│   ├── Report_A.md            # FAA frameworks, industry practices, AI frontier
│   ├── Report_B.md            # AI-driven ATC voice analysis for pilot evaluation
│   └── Final_Synthesis.md     # Integrated training solution from multi-agent debate
│
├── agent/                     # LiveKit Agent Worker (Python)
│   ├── worker.py              # Agent entry point + room lifecycle
│   ├── stt.py                 # Deepgram Nova-2 via LiveKit STT plugin
│   ├── tts.py                 # ElevenLabs via LiveKit TTS plugin
│   ├── voice_analysis.py      # F0, RMS, MFCC, spectral (librosa)
│   ├── assessment.py          # Confidence-weighted scoring
│   └── prompts/               # ATC controller persona prompt
│
├── supabase/                  # Supabase project config
│   ├── migrations/            # PostgreSQL schema migrations
│   └── functions/             # Edge Functions (Claude API proxy, LiveKit tokens)
│
└── app/                       # Frontend (React + TypeScript)
    └── src/
        ├── components/
        │   ├── cockpit/       # InteractiveMFD, PFD, FlightPlanTab, AutopilotControlBar
        │   ├── map/           # MapDisplay, RouteOverlay, WaypointMarkers, AircraftMarker,
        │   │                  #   ScenarioOverlay, MapControls, MapInfoPanel, mapTheme
        │   ├── drill/         # DrillDropdownSelector, DrillActiveView, DrillOutcome
        │   ├── assessment/    # CBTARadar, CognitiveLoadIndicator, TrendChart, DrillHistory
        │   ├── voice/         # PTTButton, TranscriptDisplay, VoicePanel, VUMeter
        │   └── shared/        # AnthemButton, AnthemCard, PilotSelector
        ├── data/
        │   ├── flight-plans/  # kteb-kpbi, kjfk-kbos (base + full packages + route-registry)
        │   └── drills/        # Six training drill definitions
        ├── lib/               # flight-plan-utils (route math), scoring, frequency-utils
        ├── services/          # ATC engine, LiveKit client, assessment engine
        ├── stores/            # Zustand stores (cockpit, scenario, assessment, voice, pilot, ui)
        ├── hooks/             # useLiveKit, useDrillRunner, useAltitudeSimulation
        └── types/             # TypeScript domain types (cockpit, flight-plan, map, scenario…)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 4 + CSS variables (Anthem dark theme) |
| State | Zustand |
| Map | Google Maps Platform — Maps JS API (`@vis.gl/react-google-maps`) |
| Audio infra | LiveKit Cloud + JS SDK (WebRTC) |
| Agent runtime | LiveKit Agents (Python) |
| Voice STT | Deepgram Nova-2 (LiveKit plugin) |
| Voice TTS | ElevenLabs (LiveKit plugin) |
| Voice analysis | librosa + numpy (Python agent) |
| LLM | Claude API |
| Charts | shadcn/ui Charts (Recharts) |
| Backend | Supabase (Postgres + Edge Functions) |

## Getting Started

```bash
# Frontend
cd app
cp .env.example .env       # Add Supabase + LiveKit + Google Maps URLs
pnpm install

# Agent
pip install -r agent/requirements.txt

# Development (3 processes)
supabase start             # Local Supabase (Postgres + Edge Functions)
pnpm dev                   # Starts: Vite (:5173) + LiveKit Agent Worker
```

### Required Configuration

**Client-side** (`app/.env`):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key (safe for browser) |
| `VITE_LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps Platform API key (Maps JS API) |

**Server-side** (Supabase Edge Function secrets, set via `supabase secrets set`):

| Secret | Service | Purpose |
|--------|---------|---------|
| `ANTHROPIC_API_KEY` | Anthropic | ATC instruction generation via Claude |
| `ELEVENLABS_API_KEY` | ElevenLabs | Realistic ATC voice synthesis |
| `DEEPGRAM_API_KEY` | Deepgram | Streaming speech-to-text with word timestamps |
| `LIVEKIT_API_KEY` | LiveKit | Room token generation |
| `LIVEKIT_API_SECRET` | LiveKit | Room token signing |

The app degrades gracefully without voice keys — TTS falls back to browser speech synthesis, and drills can run without voice features. The Map tab shows a setup prompt when `VITE_GOOGLE_MAPS_API_KEY` is not configured.

## Map Display Tab

The **Map** tab inside the MFD renders a full-screen dark avionics map powered by Google Maps Platform.

### Features

- **Dark avionics theme** — Custom `AVIONICS_MAP_STYLE` array suppresses all default Google Maps labels and icons; replaces them with a deep-navy palette matching the Anthem cockpit aesthetic
- **Route overlay** — Polyline drawn in two segments: flown legs (dim cyan) and ahead legs (bright cyan). A dashed alternate route polyline renders when an alternate airport is defined. A breadcrumb dot trail marks the aircraft's recent track
- **Aircraft marker** — Heading-aware SVG aircraft silhouette with a pulsing cyan halo, rendered as an `AdvancedMarker`. Position is fixed to the active waypoint in the current route
- **Waypoint markers** — Color-coded diamond markers for enroute fixes; ring markers for departure (green), destination (cyan), and alternate (amber) airports. Clicking any marker opens a `MarkerInfoCard` popup with ICAO, name, role, elevation, and active runway
- **Scenario overlays** — Training drill zones rendered as themed circles/polygons: weather zones (amber), holding regions (fuchsia), VNAV conflict zones (red), and comms handoff sectors (cyan). Clicking any overlay opens an `OverlayInfoCard` popup
- **Layer controls** — Floating avionics control bar (`RTE / APT / WPT / TRK / WX`) toggles each overlay group independently. Zoom +/− and recenter buttons included
- **Info panel** — Bottom status strip showing callsign, heading, altitude, ground speed, next waypoint bearing and distance, ETE to destination, and active scenario badge
- **Route-aware re-centering** — Selecting a different route in the Flight Plan tab triggers `RouteChangeController` inside the map, which calls `map.panTo()` and `map.setZoom()` to fit the new route's viewport

### Route Registry

Both training routes are defined in `app/src/data/flight-plans/route-registry.ts`:

| Route | Aircraft | Default Active Waypoint | Map Zoom |
|-------|----------|------------------------|----------|
| KTEB → KPBI | Citation CJ3+ · N389HW · N271SY | COATE (climb) | 6 |
| KJFK → KBOS | Citation CJ3+ · N389HW · N271SY | JUDDS (cruise) | 7 |

## Flight Plan Module

The **Flight Plan** tab inside the MFD provides a condensed avionics-style route page that serves as the route and training source of truth for the entire dashboard.

### Route Math

All progress metrics derive from a single `computeProgress()` call:

| Metric | Source |
|--------|--------|
| Total route distance | `lastWaypoint.cumulativeDistanceNm` |
| Distance flown | `totalDist − remainingDistNm` |
| Remaining distance | `totalDist − active.cumulativeDistanceNm` |
| Progress % | `active.cumulativeDistanceNm / totalDist × 100` |
| Distance to next fix | `next.cumulativeDistanceNm − active.cumulativeDistanceNm` |
| ETE remaining | `dest.eteMinutes − active.eteMinutes` (cumulative, consistent with leg ETEs) |
| TOD cue (NM) | `remainingDistNm − (cruiseAltFt / 300)` — positive = NM to TOD |

The summary card, progress strip, active-leg strip, and waypoint table all read from this same snapshot — no numeric inconsistencies between sections.

### Sections

| Section | What it shows |
|---------|--------------|
| **Route Picker** | Buttons to switch between KTEB→KPBI and KJFK→KBOS; switching re-centers the Map tab |
| **Summary Card** | Callsign · aircraft type · tail number · departure → destination → alternate · FL/speed/total dist/total ETE · distance flown |
| **Progress Card** | Phase chip (color-coded: green=climb, amber=descent) · progress bar · dep/dest labels with flown vs remaining NM · active→next waypoint strip with dist-to-next · ETE remaining · TOD cue (`TOD XNM`) or descent alert (`↓ DESCEND NOW`) · route deviation banner when drill active |
| **Procedures Card** | SID / STAR / APPR each with code, transition, and live status badge (PLN/ACT/CHG/PND). DEP RWY and ARR RWY strip. Status is derived dynamically from flight phase — SID becomes ACT during climb, STAR during descent, APPR during approach. Runway-change drill flips STAR and APPR to CHG |
| **Waypoint Table** | "CONDENSED ROUTE · N legs" label · columns: icon / WPT / ANNO / AWY / LEG / BRG / ALT · passed rows dimmed (40% opacity) · active row cyan-highlighted with left border · selected row slate-highlighted with ◈ icon · click any row to select / deselect · selected row expands an inline detail strip (cumulative dist, ETE-to-fix, notes, speed constraint) · ANNO column carries training badges without displacing leg distance |
| **Training Status** | Drill name badge · flag grid (VNAV CONFLICT / ROUTE DEV / WRONG FREQ / RWY CHANGE / HOLDING / COMMS HO) — border turns amber when any flag is active |

### Training Integration Into the Route

| Drill flag | Visual effect in Flight Plan |
|-----------|------------------------------|
| `vnavConflict` | Altitude column on WITNY/JIPIR/BRUWN turns amber; ANNO badge shows `VNAV` |
| `routeDeviation` | Progress card border turns red, pulsing `⚠ OFF ROUTE` chip appears; `OFF ROUTE · DEV DETECTED` banner inserted before active waypoint in table; APPR procedure status flips to PND |
| `runwayChange` | STAR and APPR procedure badges flip to CHG; ARR RWY gains a separate CHG badge |
| `holding` | ANNO badge `HOLD` on JIPIR or JUDDS; a `⟳ HOLD · RGHT TURNS · EFC +10MIN` insert row appears below the assigned fix |
| `wrongFrequency` | ANNO badge `FREQ?` on LANNA (KTEB→KPBI) or MERIT (KJFK→KBOS) |
| `commsHandoff` | ANNO badge `FREQ` (magenta) on JIPIR or BRUWN |

### Waypoint Selection and Map Compatibility

- Selected waypoint ID is written to `cockpit-store.selectedWaypointId`
- Map tab can subscribe to this value to highlight the selected fix
- Route switching clears the selection and re-centers the map
- The enriched `Waypoint[]` format is fully compatible with the existing map overlay rendering

## Six Starter Drills

1. **Descent with Traffic Conflict** — ATC clears descent while TCAS shows traffic. Tests: SAW, PSD, COM
2. **Weather Diversion** — Destination weather drops below minimums mid-approach. Tests: PSD, COM, WLM
3. **PilotPredict Wrong Frequency** — PilotPredict suggests wrong ATC frequency during handoff. Tests: SAW, KNO
4. **Runway Change** — ATC assigns new runway, pilot must update approach. Tests: FPM, COM, WLM
5. **Holding Pattern Entry** — ATC issues hold, pilot determines entry type. Tests: KNO, FPM, COM
6. **Comms Handoff** — Frequency change to approach control with readback. Tests: COM, WLM

## Key Data Points

| Metric | Value | Source |
|--------|-------|--------|
| Pilot inadvertent mode selection rate | 73% | 1999 Australian survey (Report A) |
| Accidents linked to insufficient automation knowledge | >33% | PARC/CAST (Report A) |
| Controller speech recognition WER | 3–5% | HAAWAII (Report B) |
| Pilot speech recognition WER | 8–10% | HAAWAII (Report B) |
| ICAO Communication OBs automatable | 9 of 10 | IATA framework (Report B) |
| Cognitive load F0 shift | +7–12 Hz | Huttunen et al. (Report B) |

## Status

| Module | Status |
|--------|--------|
| Research & Debate | Complete |
| Final Synthesis | Complete |
| Architecture | Complete |
| Interactive Cockpit (PFD + MFD) | Complete |
| Six Training Drills | Complete |
| ATC Voice Engine | Complete |
| Assessment Dashboard (CBTA) | Complete |
| Map Display Tab | Complete |
| Flight Plan Module | Complete |
| Supabase Persistence | In progress |
| LiveKit Voice Integration | In progress |
