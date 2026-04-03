# Voice Pipeline Architecture

Deepgram STT, ElevenLabs TTS, OpenAI ATC generation, and latency measurement.

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
interface LatencyDecomposition {
  pilotReactionMs: number;       // atcAudioEnd → PTT press (purely local)
  speechOnsetMs: number;         // PTT press → first voiced sound (agent-side detection)
  totalPilotLatencyMs: number;   // Sum of above — the assessment score input
  networkLatencyMs: number;      // Calibrated WebRTC round-trip estimate
  deepgramProcessingMs: number;  // Estimated Deepgram overhead
  atcAudioEndTimestamp: number;
  pttPressTimestamp: number;
  localSpeechOnsetTimestamp: number;
  deepgramFirstWordStart: number;
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
  return data;
}
```

### Expected Readback Generation

Claude generates both the ATC instruction and the expected pilot readback. The expected readback is used by the assessment engine for scoring — it is NOT shown to the pilot. The assessment engine uses fuzzy matching against it, accounting for STT transcription errors.

---

## Free Talk — Conversational ATC Pipeline

### Overview

Free Talk mode enables open-ended conversational practice with dual ATC personas outside of structured drills. The pilot communicates via PTT; the agent processes audio through STT, generates a contextual response via OpenAI, and speaks it back with a persona-specific TTS voice.

### Persona Architecture

Two ATC personas are defined in `agent/personas.py`:

| Persona | Facility | Frequency | ElevenLabs Voice | Accent |
|---------|----------|-----------|-----------------|--------|
| `boston_center` | Boston Center, Sector 33 | 124.350 | Adam (`pNInz6obpgDQGcFmaJgB`) | American male |
| `ny_approach` | New York Approach, Sector 56 | 132.450 | Daniel (`onwK4e9ZLuTAKqWW03F9`) | British male |

The active persona switches when the pilot swaps COM1/COM2 frequencies in the cockpit. Each persona maintains an independent conversation history (capped at 20 exchanges).

### Pipeline Flow

```
1. Pilot presses PTT → audio captured in agent buffer
2. Pilot releases PTT → agent runs Deepgram STT on buffer
3. Transcript sent to browser (FINAL_TRANSCRIPT)
4. Transcript appended to active persona's conversation history
5. System prompt built from persona config + aircraft state
6. OpenAI chat.completions.create() with gpt-4o-mini
7. Response text appended to persona's history
8. FREETALK_RESPONSE sent to browser (text + personaId + facility)
9. Response spoken via persona-specific ElevenLabs TTS voice
10. _is_thinking lock released — next PTT accepted
```

### Concurrency Guard

A `_is_thinking` boolean lock prevents parallel LLM requests. If the pilot presses PTT while the agent is still generating or speaking a response, the audio buffer is dropped and a warning is logged. The lock is released in a `finally` block to guarantee reset even on error.
