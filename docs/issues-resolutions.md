# Issues & Resolutions Log

Comprehensive log of all issues encountered during development and their resolutions. Organized chronologically by discovery date.

---

## Phase 0-8: Foundation & Feature Build

### ISS-001: MCP `fetch` Server Failing

**Status:** RESOLVED
**Date:** 2026-03-15
**Symptom:** `fetch · ✗ failed` in `/mcp` output.

**Root Cause:** The npm package `@anthropic-ai/mcp-server-fetch` does not exist. The official fetch MCP server is Python-based, published as `mcp-server-fetch` on PyPI.

**Resolution:**
1. Install `uv` (provides `uvx`): `brew install uv`
2. Configure `.mcp.json` to use `uvx mcp-server-fetch`:
```json
{
  "fetch": {
    "command": "/opt/homebrew/bin/uvx",
    "args": ["mcp-server-fetch"]
  }
}
```

---

### ISS-002: MCP `supabase-mcp` Server Failing

**Status:** RESOLVED
**Date:** 2026-03-15
**Symptom:** `supabase-mcp · ✗ failed` in `/mcp` output.

**Root Cause:** `mcp-remote@0.1.38` depends on `undici@7` which requires Node.js >= 20.18.1. The system PATH defaulted to Node v18 via nvm.

**Resolution:** Inject Node v20 into PATH via the `env` field in `.mcp.json`:
```json
{
  "supabase-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.supabase.com/mcp"],
    "env": {
      "PATH": "/Users/ashutoshpranjal/.nvm/versions/node/v20.20.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
    }
  }
}
```
`mcp-remote` handles OAuth authentication on first connection (opens browser window).

---

### ISS-003: Recharts Infinite Scroll / Resize Loop

**Status:** RESOLVED
**Date:** 2026-03-17
**Symptom:** Dashboard charts cause infinite layout recalculation and page freeze.

**Root Cause:** `ResponsiveContainer` with `height="100%"` inside flex/grid cells without a fixed height constraint triggers an infinite resize observer loop.

**Resolution:** All 5 chart components (CBTARadar, CognitiveLoadIndicator, TrendChart, DrillHistory, CohortCompare) now use fixed pixel heights instead of percentage-based heights.

---

### ISS-004: useLiveKit Not Mounted

**Status:** RESOLVED
**Date:** 2026-03-17
**Symptom:** LiveKit never connects — no audio, no data channel, drills can't communicate with agent.

**Root Cause:** `useLiveKit()` hook was not called in any mounted component, so the LiveKit room was never initialized.

**Resolution:** `useLiveKit()` is now mounted in `App.tsx` to ensure LiveKit auto-connects when drills start.

---

### ISS-005: useATCEngine Not Wired

**Status:** RESOLVED
**Date:** 2026-03-17
**Symptom:** ATC instructions from the agent never trigger TTS playback in the browser.

**Root Cause:** `useATCEngine` hook was not called in `DrillActiveView.tsx`.

**Resolution:** Added `useATCEngine()` call in `DrillActiveView.tsx` to trigger TTS on `atc_instruction` events.

---

### ISS-006: Agent AudioStream Not Created

**Status:** RESOLVED
**Date:** 2026-03-17
**Symptom:** Python agent receives no audio frames from the pilot's microphone.

**Root Cause:** `worker.py` was not creating `rtc.AudioStream` in `_on_track_subscribed()`.

**Resolution:** Added `rtc.AudioStream` creation and `_consume_audio_frames()` async iterator in the track subscription handler.

---

### ISS-007: PilotSelector Not Loading Assessment Data

**Status:** RESOLVED
**Date:** 2026-03-17
**Symptom:** Assessment dashboard shows empty data even when drill results exist in Supabase.

**Root Cause:** `PilotSelector` only called `selectPilot()` but not `assessment-store.loadFromServer(pilotId)`.

**Resolution:** Added `loadFromServer(pilotId)` call in `PilotSelector` on pilot selection and creation.

---

## Phase 9: Bug Fixes & Calibration UI

### ISS-008: Pilot Profiles Lost on Refresh (Bug 3)

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Selected pilot disappears from dropdown after page refresh; pilots list is empty.

**Root Cause:** `loadPilots()` was never called on app mount. The Zustand store started with `pilots: []` and the active pilot selection was not persisted.

**Resolution:**
- Added `saveActivePilotId()` / `loadActivePilotId()` helpers in `app/src/lib/storage.ts`
- Added `useEffect` in `PilotSelector.tsx` that on mount: calls `loadPilots()`, restores active pilot from localStorage, and calls `loadAssessment(pilotId)`
- Pilot selection changes and new pilot creation now persist the active ID to localStorage

**Files Changed:** `app/src/lib/storage.ts`, `app/src/components/shared/PilotSelector.tsx`

---

### ISS-009: Drill Results Not Reaching Supabase (Bug 5)

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Completing drills doesn't persist data to Supabase. Assessment dashboard has no historical data.

**Root Cause:** `saveToServer()` in assessment-store never called `api.saveDrillResult()` — only baseline was being POSTed. Also `sessionId: ''` violated the NOT NULL REFERENCES FK constraint on the `sessions` table.

**Resolution:**
- Added `activeSessionId: string | null` to the assessment store interface and default state
- `saveToServer()` now creates a session via `api.createSession()` if none exists, then calls `api.saveDrillResult()` with all required fields (sessionId, pilotId, drillId, overallScore, metrics, cbta, cognitiveLoad, transcriptConfidence, estimatedWer)
- Baseline persistence via `api.saveCognitiveLoadBaseline()` continues after drill result save

**Files Changed:** `app/src/stores/assessment-store.ts`

---

### ISS-010: ATC Audio Not Playing / PTT Locked (Bugs 1+2)

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** No ATC voice audio plays. After a failed TTS attempt, PTT remains disabled (spacebar doesn't work in drills).

**Root Cause:** In `worker.py` `_speak_atc()`, if TTS fails, the `except` block logged but never sent `MSG_ATC_SPEAK_END`. The browser stays in `isATCSpeaking=true`, which disables PTT (`disabled = isATCSpeaking || !livekitConnected`).

**Resolution:**
1. **`worker.py`**: Moved `MSG_ATC_SPEAK_END` dispatch to a `finally` block so it always fires regardless of TTS success/failure
2. **`useATCEngine.ts`**: Added 30-second safety timeout — if `isATCSpeaking` is still true after 30s, it auto-resets to false
3. **`DrillActiveView.tsx`**: Removed `speakATCInstruction` from `useEffect` deps to prevent re-triggers (the `atcSpokenRef` guard already handles deduplication)

**Files Changed:** `agent/worker.py`, `app/src/hooks/useATCEngine.ts`, `app/src/components/drill/DrillActiveView.tsx`

---

### ISS-011: Baseline Calibration Not Persisting (Bug 4)

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Cognitive load baseline computed during one session is lost when a new session starts or the agent reconnects.

**Root Cause:** The agent created a fresh `CognitiveLoadBaseline(pilot_id="unknown")` each session. No mechanism existed to restore a previously-computed baseline from Supabase or the browser store.

**Resolution:**
1. **New data channel message `SET_BASELINE`**: Browser sends stored baseline to agent when LiveKit connects
2. **`worker.py`**: Added `_handle_set_baseline()` method that restores all baseline fields and reconstructs running sums (`_f0_sum`, `_f0_sq_sum`, `_sr_sum`, `_sr_sq_sum`, `_disf_sum`, `_disf_sq_sum`) from mean/std values
3. **`useLiveKit.ts`**: After `setLivekitConnected(true)`, checks assessment store for existing baseline and sends it via `sendBaseline()`
4. **`livekit-client.ts`**: Added `MSG_SET_BASELINE` constant and `sendBaseline()` convenience function
5. **Track subscription**: Agent updates `pilot_id` from participant identity on track subscribe

**Files Changed:** `agent/worker.py`, `app/src/hooks/useLiveKit.ts`, `app/src/services/livekit-client.ts`

---

### ISS-012: Blank Screen on Tab Switch

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Switching between Cockpit/Drills/Assessment tabs causes a white screen crash. Page recovers on refresh.

**Root Cause:** Supabase seed data had incomplete `metrics_json` — missing `cognitiveLoadScores`, `decisionScores`, `trapScores`, and `touchScores` fields. Dashboard components called `.filter()` on `undefined`, causing a TypeError that crashed the React tree.

**Resolution:**
- `fetchDrillHistory()` in `api-client.ts` now defensively normalizes `metrics_json`, filling in defaults for all missing fields:
  ```typescript
  const rawMetrics = (row.metrics_json ?? {}) as Partial<DrillMetrics>;
  const metrics: DrillMetrics = {
    drillId: rawMetrics.drillId ?? row.drill_id,
    readbackScores: rawMetrics.readbackScores ?? [],
    decisionScores: rawMetrics.decisionScores ?? [],
    // ... all fields with defaults
  };
  ```
- `SessionSummary.tsx` added a guard on latency access: `.filter((r) => r.latency)` before mapping

**Files Changed:** `app/src/services/api-client.ts`, `app/src/components/assessment/SessionSummary.tsx`

---

### ISS-013: VU Meter Not Responding to Voice

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** During baseline calibration, the VU meter segments stay dark regardless of microphone input.

**Root Cause:** `AudioContext.resume()` was called without `await`. Chrome suspends new AudioContexts by default, so `getFloatTimeDomainData()` returned all zeros until the context actually resumed.

**Resolution:**
- Made `start()` in `useAudioLevel.ts` an async function that `await`s `ctx.resume()`
- Adjusted `smoothingTimeConstant` to 0.3 for faster response
- RMS normalization set to `/ 0.15` (speech RMS is typically 0.01-0.15)
- `Float32Array` ref typed as `Float32Array<ArrayBuffer>` to satisfy TypeScript strict mode

**Files Changed:** `app/src/hooks/useAudioLevel.ts`

---

### ISS-014: `python: command not found` for Agent

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** `pnpm dev:agent` fails with `sh: python: command not found`.

**Root Cause:** macOS does not have `python` on PATH — only `python3` is available.

**Resolution:** Changed `python` to `python3` in the `dev:agent` script in `app/package.json`.

**Files Changed:** `app/package.json`

---

### ISS-015: Duplicate Pilot Profiles in Database

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Multiple duplicate "Ash" pilot entries visible in the pilot selector dropdown.

**Root Cause:** During testing, `createPilot()` was called multiple times (likely from repeated form submissions or React StrictMode double-mount effects).

**Resolution:** Deleted 4 duplicate pilot rows from Supabase via SQL. The `saveActivePilotId` fix (ISS-008) prevents creating new pilots when one already exists and is restored from localStorage.

**Files Changed:** Database cleanup only (Supabase `pilots` table)

---

### ISS-016: Agent Crash — ElevenLabs TTS `model_id` Parameter Renamed

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Agent crashes immediately on every job with `TypeError: TTS.__init__() got an unexpected keyword argument 'model_id'`. No ATC audio plays. Agent process exits with "job crashed".

**Root Cause:** `livekit-plugins-elevenlabs` v1.4.6 renamed the constructor parameter from `model_id` to `model`. The code in `agent/tts.py` was using the old name.

**Resolution:** Changed `model_id=ATC_MODEL_ID` to `model=ATC_MODEL_ID` in `create_tts()`.

**Files Changed:** `agent/tts.py`

---

### ISS-017: Agent TTS Fails — Wrong ElevenLabs API Key Env Var Name

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** After fixing ISS-016, TTS initialization fails with "ElevenLabs API key is required". The `.env` file has the key set, yet the plugin doesn't find it.

**Root Cause:** The `livekit-plugins-elevenlabs` SDK reads `ELEVEN_API_KEY` from the environment, but the project's `.env` exports `ELEVENLABS_API_KEY`. The `pnpm dev:agent` script exports all non-`VITE_` vars from `.env`, so `ELEVENLABS_API_KEY` is exported — but the plugin never reads that name.

**Resolution:** `create_tts()` now reads from either `ELEVEN_API_KEY` or `ELEVENLABS_API_KEY` (whichever is set) and passes it explicitly via the `api_key=` constructor parameter.

**Files Changed:** `agent/tts.py`

---

### ISS-018: TTS Audio Sample Rate Mismatch (22050 Hz vs 16000 Hz)

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Even with ISS-016 and ISS-017 fixed, ATC audio would play back garbled — wrong pitch and ~38% slower than intended.

**Root Cause:** The ElevenLabs TTS plugin defaults to `mp3_22050_32` encoding (22050 Hz output), but the agent's `AudioSource`, `apply_radio_static()`, and `SAMPLE_RATE` constant all assume 16000 Hz. The mismatch meant 22050 Hz audio was being reinterpreted as 16000 Hz data — pitch-shifted and time-stretched.

**Resolution:** Explicitly set `encoding="pcm_16000"` in the TTS constructor so the output sample rate matches `SAMPLE_RATE` (16000 Hz) used throughout the voice pipeline.

**Files Changed:** `agent/tts.py`

---

### ISS-019: ATC Audio Track Unpublished Before Playback Completes

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Agent runs TTS successfully (logs show audio frames generated), but browser never hears the audio. The `TrackSubscribed` event fires but audio element plays silence.

**Root Cause:** In `worker.py` `_speak_atc()`, a new `AudioSource` + `LocalAudioTrack` was created for every instruction, all frames were queued via `capture_frame()` (near-instantly), then `unpublish_track()` was called immediately. Since `capture_frame()` only *queues* frames and WebRTC streams them in real-time (~20ms per chunk), unpublishing killed the track before any audio was transmitted. Additionally, each new track triggered a subscribe/unsubscribe cycle on the browser, racing with audio element attachment.

**Resolution:**
1. **Persistent ATC audio track**: A single `AudioSource` + `LocalAudioTrack` is now created and published once in `start()`, then reused for all instructions. The browser subscribes once and the `<audio>` element stays attached.
2. **Playback wait**: After queuing all frames, the agent now `await asyncio.sleep(audio_duration + 0.3s)` — waiting for real-time WebRTC transmission to complete before sending `ATC_SPEAK_END`.
3. **Lazy fallback**: If the track isn't published by `start()`, `_speak_atc()` publishes it on first use.

**Files Changed:** `agent/worker.py`

---

### ISS-020: Browser Autoplay Policy Blocks ATC Audio Element

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** ATC audio element is attached to the DOM but produces no sound. Browser console shows no errors (autoplay failures are silent in some browsers).

**Root Cause:** When LiveKit's `track.attach()` creates an `<audio>` element, modern browsers may block autoplay if no prior user gesture has been registered for audio. The previous code never called `element.play()` or handled the rejection.

**Resolution:**
- After attaching the audio element, explicitly call `element.play()` with `.catch()` handler
- If autoplay is blocked, register one-time `click` and `keydown` listeners to resume audio on the next user interaction (guaranteed since pilot uses PTT spacebar)
- Set `element.volume = 1.0` explicitly
- Remove any previously attached `atc-audio` element before creating a new one

**Files Changed:** `app/src/services/livekit-client.ts`

---

### ISS-021: Insufficient Logging Across Voice Pipeline

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** When ATC audio failed, there was no way to determine which stage of the pipeline broke — Edge Function, data channel, TTS, audio track publishing, or browser playback. Debugging required guesswork.

**Root Cause:** The voice pipeline spans 6+ files across browser and agent, with minimal logging at integration boundaries. Failures were silent or produced generic error messages without pipeline context.

**Resolution:** Added structured `[TAG]` logging at every integration point across the pipeline:

| File | Tags Added |
|------|-----------|
| `agent/worker.py` | `[INIT]`, `[ATC-TRACK]`, `[DATA-CH]`, `[ATC]`, `[ATC-SPEAK]` — logs TTS duration, frame count, audio duration, capture timing, playback wait, send confirmation |
| `agent/tts.py` | `[TTS]` — logs API key presence, voice/model/encoding config |
| `app/src/services/livekit-client.ts` | `[livekit]` — logs track subscribe/unsubscribe with kind/name/participant, connection state changes, data messages sent/received, autoplay handling |
| `app/src/hooks/useLiveKit.ts` | `[useLiveKit]` — logs connection flow (token request, room connect, ready), all agent message types dispatched |
| `app/src/hooks/useATCEngine.ts` | `[useATCEngine]` — logs instruction trigger, keyword updates, generation result |
| `app/src/services/atc-engine.ts` | `[atc-engine]` — logs Edge Function invocation and response |
| `app/src/components/drill/DrillActiveView.tsx` | `[DrillActiveView]` — logs ATC event detection, trigger conditions (livekit connected, already spoken) |

**Files Changed:** `agent/worker.py`, `agent/tts.py`, `app/src/services/livekit-client.ts`, `app/src/hooks/useLiveKit.ts`, `app/src/hooks/useATCEngine.ts`, `app/src/services/atc-engine.ts`, `app/src/components/drill/DrillActiveView.tsx`

---

### ISS-022: Agent Crash on Room Join — Two Startup Bugs

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** LiveKit agent crashes immediately (~3ms) when a drill room is joined. Logs show two sequential errors: `Exception: cannot access local participant before connecting` followed by `ValueError` from `.on()` receiving an async callback.

**Root Cause:** Two bugs in the agent startup sequence:

1. **Room not connected when publishing ATC track:** `entrypoint()` called `await worker.start(ctx)` *before* `await ctx.connect()`. Inside `start()`, `_publish_atc_track()` tried to access `self._room.local_participant` on a room that wasn't connected yet.

2. **Async callback registered with `.on()`:** `_on_track_subscribed` was declared as `async def` but registered via `ctx.room.on("track_subscribed", ...)`. The LiveKit SDK's `.on()` only accepts synchronous callbacks and raises `ValueError`.

**Resolution:**
1. Reordered `entrypoint()` to call `await ctx.connect()` **before** creating the worker and calling `await worker.start(ctx)`
2. Converted `_on_track_subscribed` from `async def` to a sync `def` that wraps its async work (`_consume_audio_frames()`) in `asyncio.create_task()` instead of `asyncio.ensure_future()`

**Files Changed:** `agent/worker.py`

---

### ISS-023: Data Channel Broken — LiveKit SDK v1.1.2 API Changes

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Agent runs without errors after ISS-022 fix, but ATC audio never plays. The entire data channel pipeline is silently broken — the agent neither receives browser messages nor sends messages back.

**Root Cause:** Two breaking API changes in `livekit` v1.1.2 (vs the older SDK the code was written for):

1. **`data_received` event signature changed:** The event now passes a single `DataPacket` object (with `.data`, `.participant`, `.kind`, `.topic` fields) instead of three separate arguments `(data: bytes, participant: RemoteParticipant, kind: DataPacketKind)`. The EventEmitter's `emit()` detected the argument count mismatch and raised `TypeError` (which it re-raises), silently preventing the handler from ever being called. The agent never received `ATC_INSTRUCTION`, `PTT_START`, `SET_BASELINE`, or any other browser message.

2. **`publish_data()` `kind=` parameter renamed to `reliable=`:** The method now uses `reliable: bool = True` instead of `kind: DataPacketKind`. Passing `kind=rtc.DataPacketKind.KIND_RELIABLE` raised `TypeError: unexpected keyword argument 'kind'`. The agent could not send `ATC_SPEAK_END`, `FINAL_TRANSCRIPT`, `ASSESSMENT_RESULT`, or `BASELINE_UPDATE` back to the browser.

**Resolution:**
1. Updated `_on_data_received(self, data_packet: rtc.DataPacket)` to accept the single `DataPacket` argument, accessing `.data`, `.participant`, `.kind` from it
2. Changed `_send_message()` from `kind=rtc.DataPacketKind.KIND_RELIABLE` to `reliable=True`

**Files Changed:** `agent/worker.py`

---

### ISS-024: No Audio Captured During PTT — Mic Track Never Published

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** Every PTT cycle ends with "No audio captured during PTT" in agent logs. The agent never receives pilot microphone audio.

**Root Cause:** `publishMicTrack()` in `livekit-client.ts` was defined but never called. The browser connected to the LiveKit room and sent PTT data messages, but never published its microphone audio track. Without it:
- Agent's `_on_track_subscribed()` never fired
- `_audio_stream` was never created, `_consume_audio_frames()` never started
- `_audio_buffer` was always empty when PTT ended

**Resolution:**
1. **`useLiveKit.ts`**: Imported `publishMicTrack` and `unpublishMicTrack` from `livekit-client`
2. **Auto-connect path**: Added `await publishMicTrack()` after `connectToRoom()`, before `setLivekitConnected(true)`
3. **Manual connect callback**: Same — `await publishMicTrack()` after `connectToRoom()`
4. **Disconnect paths**: Added `unpublishMicTrack()` before `disconnect()` with `.catch()` guard to handle already-disconnected state

**Files Changed:** `app/src/hooks/useLiveKit.ts`

---

### ISS-025: ATC Instruction Never Reaches Agent — Silent Fire-and-Forget Chain

**Status:** RESOLVED
**Date:** 2026-03-19
**Symptom:** No `[DATA-CH] Received ATC_INSTRUCTION` in agent logs. TTS never runs, ATC track stays silent. No errors visible in browser console.

**Root Cause:** The `speakATCInstruction()` call chain used fire-and-forget (`void`) at multiple levels, silently swallowing all errors:
- `DrillActiveView.tsx`: `void speakATCInstruction(...)` dropped rejections
- `livekit-client.ts`: `void sendDataMessage(...)` inside `sendATCInstruction` dropped errors
- No try/catch in `useATCEngine.speakATCInstruction` around `buildContext()`

If any step failed (Edge Function timeout, room not ready, context build error), the entire chain silently failed and no `ATC_INSTRUCTION` message was sent.

**Resolution:**
1. **`livekit-client.ts`**: Changed `sendATCInstruction` from `void sendDataMessage(...)` to `await sendDataMessage(...)` (made function async, returns Promise)
2. **`atc-engine.ts`**: Added `await` before `sendATCInstruction(...)` so errors propagate through `generateAndSpeakATCInstruction`
3. **`useATCEngine.ts`**: Wrapped `buildContext()` in try/catch to surface context-building failures
4. **`DrillActiveView.tsx`**: Replaced `void speakATCInstruction(...)` with `.catch((err) => console.error(...))` so failures appear in the browser console

**Files Changed:** `app/src/services/livekit-client.ts`, `app/src/services/atc-engine.ts`, `app/src/hooks/useATCEngine.ts`, `app/src/components/drill/DrillActiveView.tsx`

---

## Phase 10: VNAV Escalation & Drill Flow Fixes

### ISS-026: Continue Buttons Disrupting Natural Drill Flow

**Status:** RESOLVED
**Date:** 2026-03-28
**Symptom:** During the VNAV Descent Conflict drill, "Continue" buttons appear between every drill event (after ATC readback, after frequency actions). The pilot must click "Continue" to advance, breaking the natural cockpit simulation feel.

**Root Cause:** The drill was designed with manual advancement via Continue buttons at multiple points:
1. In `InteractiveMFD.tsx` RadiosTab — after ATC voice readback is given, a "Continue" button appeared
2. In `InteractiveMFD.tsx` RadiosTab — after frequency cockpit_action is completed, a "Continue" button appeared
3. In `DrillActiveView.tsx` — same Continue button existed for the ATC voice path (though DrillActiveView was NOT mounted via `AmbientCockpitView`, so this was dead code)

**Resolution:**
1. Removed all Continue buttons from ATC instruction flow in `InteractiveMFD.tsx` RadiosTab
2. Removed Continue button from frequency action flow — replaced with auto-advance after 1.5s delay showing success/failure feedback
3. Added `readbackReceived` flag to `scenario-store.ts` — set by `processAssessmentResult()` in `assessment-engine.ts` when `ASSESSMENT_RESULT` arrives during an `atc_instruction` event
4. Added auto-advance `useEffect` in RadiosTab that fires when `readbackReceived` is true
5. Converted `handleAdvanceOrComplete` and `handleAcceptContact` to `useCallback` to satisfy hook dependency rules
6. Removed the `decision_point` event from `descent-conflict.ts` drill definition (was 4 events, now 3: atc_instruction → atc_instruction → interactive_cockpit)

**Files Changed:** `app/src/components/cockpit/InteractiveMFD.tsx`, `app/src/components/drill/DrillActiveView.tsx`, `app/src/stores/scenario-store.ts`, `app/src/services/assessment-engine.ts`, `app/src/data/drills/descent-conflict.ts`

---

### ISS-027: Drill Stuck After Readback — Auto-Advance Never Fires

**Status:** IN PROGRESS
**Date:** 2026-03-28
**Symptom:** After removing Continue buttons (ISS-026), the VNAV drill gets permanently stuck after the pilot gives a voice readback. The pilot speaks, the transcript appears (e.g., "okay got you"), but the drill never advances to the next event.

**Screenshot evidence:** Radios tab shows ATC instruction, pilot PLT transcript visible, PTT button available, but no advancement happens.

**Root Cause (multi-layered):**

1. **`DrillActiveView` is never mounted:** The auto-advance `useEffect` was originally added to `DrillActiveView.tsx`, but `DrillActiveView` is only imported by `DrillsTab.tsx` — which is NEVER imported by any other component. It is dead code. The actual ATC UI the pilot interacts with is the RadiosTab inside `InteractiveMFD.tsx`, rendered by `AmbientCockpitView`. So the `DrillActiveView` auto-advance effect never runs.

2. **`ASSESSMENT_RESULT` may never arrive:** The auto-advance mechanism relies on the Python LiveKit agent receiving the pilot's audio, running Deepgram STT + readback scoring, and sending an `ASSESSMENT_RESULT` data channel message. This chain can fail silently if:
   - The agent is not running or has crashed (numpy import error, venv not activated)
   - Deepgram STT processing fails
   - The agent's assessment computation throws an error
   - The data channel message fails to send
   When the Continue button existed, it was the manual fallback. Without it, there is no fallback.

3. **Vite HMR failure masked the fix:** Even after adding auto-advance to `InteractiveMFD.tsx` RadiosTab, the browser showed 500 errors (`Failed to load resource: the server responded with a status of 500`) and `TypeError: Importing the module script failed` — Vite's hot module replacement failed to reload the file. The browser was still running the OLD code without any auto-advance logic.

4. **Shared timer ref bug:** When a second auto-advance mechanism (fallback based on `FINAL_TRANSCRIPT`) was added alongside the `ASSESSMENT_RESULT` trigger, both used the same `autoAdvanceTimerRef`. React effect cleanup in the ASSESSMENT_RESULT effect could accidentally clear the fallback timer when dependencies changed, preventing either path from firing.

**Steps Taken So Far:**

| Step | Action | Result |
|------|--------|--------|
| 1 | Removed Continue from DrillActiveView.tsx ATC voice path | No effect — DrillActiveView not mounted |
| 2 | Discovered RadiosTab in InteractiveMFD.tsx was the actual rendering path | Identified correct file to fix |
| 3 | Removed Continue from InteractiveMFD.tsx RadiosTab, added auto-advance via `readbackReceived` | Fix not applied — Vite HMR failed (500 error) |
| 4 | Killed dev server, cleared Vite cache, restarted | HMR now works |
| 5 | Added fallback auto-advance using `FINAL_TRANSCRIPT` (pilot transcript) detection after PTT release — 5s timeout | Shared timer ref bug: ASSESSMENT_RESULT effect cleanup clears fallback timer |
| 6 | Split into separate timer refs (`autoAdvanceTimerRef` + `fallbackTimerRef`), added `advancedRef` double-advance guard | tsc/lint/build all pass, but NOT YET TESTED by user |

**Current State of Fix (untested):**

Two auto-advance paths now exist in RadiosTab:
- **Fast path (1.5s):** `ASSESSMENT_RESULT` from agent → `readbackReceived=true` → advance after 1.5s
- **Fallback path (5s):** Pilot `FINAL_TRANSCRIPT` appears in `transcriptHistory` + PTT released → advance after 5s if no ASSESSMENT_RESULT

Both paths use `advancedRef` guard to prevent double-advance.

Event reset logic clears all timers and snapshots transcript count when `currentEventIndex` changes.

**What Still Needs Verification:**
1. Does the fallback auto-advance actually fire in the browser after a hard refresh?
2. Does the drill successfully advance through all 3 events (ATC → ATC → interactive_cockpit)?
3. Does the interactive cockpit phase start correctly after the second ATC readback?
4. Edge case: what happens if pilot speaks during interim transcripts but no FINAL_TRANSCRIPT commits?

**Key Files:**
- `app/src/components/cockpit/InteractiveMFD.tsx` — RadiosTab with auto-advance logic (lines 660-720)
- `app/src/services/assessment-engine.ts` — sets `readbackReceived` on ASSESSMENT_RESULT (line 137-142)
- `app/src/stores/scenario-store.ts` — `readbackReceived` state + `setReadbackReceived` action
- `app/src/hooks/useLiveKit.ts` — data channel handler dispatches ASSESSMENT_RESULT to processAssessmentResult
- `app/src/stores/voice-store.ts` — `transcriptHistory` used for fallback detection
- `app/src/components/drill/DrillActiveView.tsx` — has auto-advance logic but IS NOT MOUNTED (dead code)
- `app/src/components/drill/DrillsTab.tsx` — only consumer of DrillActiveView, itself never imported

---

### ISS-028: Cockpit State Not Applied on Drill Start

**Status:** RESOLVED
**Date:** 2026-03-30
**Symptom:** Starting the VNAV Descent Conflict drill leaves the cockpit in NAV/36000/280 instead of configuring to VNAV/14000/157 as the drill's initialState specifies.

**Root Cause:** Both `DrillBriefing.tsx` and `InteractiveMFD.tsx` TrainingSection called `useScenarioStore.startDrill()` directly, which only sets the drill phase and start time. The correct function `scenario-runner.startDrill(drillId)` — which calls `cockpit.applyCockpitState(drill.initialState)` — was never invoked by either UI component.

**Resolution:**
1. `DrillBriefing.tsx`: Changed from `useScenarioStore((s) => s.startDrill)` to `useDrillRunner().startDrill`, wired button to call `runnerStart(drill.id)`
2. `InteractiveMFD.tsx`: Added `import { startDrill as runnerStartDrill } from '@/services/scenario-runner'`, changed `onStart` from `selectDrill(drill.id)` to `runnerStartDrill(drill.id)`

**Files Changed:** `app/src/components/drill/DrillBriefing.tsx`, `app/src/components/cockpit/InteractiveMFD.tsx`

---

### ISS-029: Redundant "Begin Drill" Button in MFD Flow

**Status:** RESOLVED
**Date:** 2026-03-30
**Symptom:** After clicking "Start Drill" and selecting a drill from the list, the MFD showed a briefing panel with another "Begin Drill" button. Users had to click Begin Drill twice.

**Root Cause:** The old flow was: `onStart` → `selectDrill(drill.id)` → sets phase to 'briefing' → MFD renders briefing panel → user clicks "Begin Drill" again. The briefing panel was a redundant intermediate step in the cockpit MFD context.

**Resolution:**
1. Changed MFD drill list `onStart` to call `runnerStartDrill(drill.id)` directly — drills now start immediately when selected from the list
2. Removed the entire MFD briefing panel (`if (phase === 'briefing' && activeDrill)` block, ~48 lines)
3. Cleaned up unused `selectDrill` and `resetDrill` store subscriptions from TrainingSection

Note: The standalone `DrillBriefing.tsx` component (used by `DrillsTab.tsx`) is preserved for the non-cockpit drill view.

**Files Changed:** `app/src/components/cockpit/InteractiveMFD.tsx`

---

## Open / Known Limitations

### LIM-001: Agent Requires Python Virtual Environment

**Status:** OPEN
**Symptom:** `pnpm dev:agent` fails if agent dependencies are not installed in a virtual environment.

**Workaround:** Manually activate the venv before running:
```bash
cd agent && source .venv/bin/activate
cd .. && pnpm dev:agent
```

**Notes:** ATC audio playback and drill-mode PTT depend on the Python agent running. The calibration spacebar works independently because it uses its own `getUserMedia` flow.

### LIM-002: Cognitive Load Scoring Unreliable Without Full Calibration

**Status:** BY DESIGN
**Description:** The first 5 calibration phrases establish a partial baseline. Full calibration (10+ samples) requires completing drills. Until then, cognitive load scores carry a `partial` calibration status badge.

### LIM-003: No Authentication

**Status:** BY DESIGN
**Description:** This is a prototype — pilot identity is trust-based via the pilot selector dropdown. No login, no session tokens, no RLS policies on Supabase tables.
