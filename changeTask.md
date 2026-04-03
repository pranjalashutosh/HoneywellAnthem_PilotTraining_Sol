# Free Talk: Dual ATC Persona Implementation Checklist

> **Architecture**: Single LiveKit room, single agent, persona switching via data channel  
> **Persona A**: Boston Center (124.350) — ElevenLabs "Adam" (American male)  
> **Persona B**: New York Approach (132.450) — ElevenLabs "Daniel" (British male)

---

## Phase 1: Agent — Persona Configuration

- [x] **1.1** Create `agent/personas.py` — Define `PersonaConfig` dataclass with fields: `id`, `facility`, `sector`, `callsign_prefix`, `voice_id`, `voice_name`, `accent_note`, `frequency`
- [x] **1.2** In `agent/personas.py` — Define `PERSONAS` dict with two entries:
  - `"boston_center"`: facility="Boston Center", sector="Sector 33", voice=`pNInz6obpgDQGcFmaJgB` (Adam), freq=124.350
  - `"ny_approach"`: facility="New York Approach", sector="Sector 56", voice=`onwK4e9ZLuTAKqWW03F9` (Daniel), freq=132.450
- [x] **1.3** In `agent/personas.py` — Add `DEFAULT_PERSONA_ID = "boston_center"` and `get_persona_by_frequency(freq: float) -> PersonaConfig | None` helper

## Phase 2: Agent — Conversational System Prompt

- [x] **2.1** Create `agent/prompts/freetalk_system.py` — Define `FREETALK_SYSTEM_PROMPT` template with placeholders: `{facility}`, `{sector}`, `{callsign}`, `{accent_note}`, `{altitude}`, `{heading}`, `{weather}`
- [x] **2.2** In `agent/prompts/freetalk_system.py` — Add `build_freetalk_prompt(persona, callsign, altitude, heading, weather)` function that formats the template
- [x] **2.3** Prompt must enforce: FAA/ICAO phraseology, concise (2-3 sentences max), number pronunciation rules, no markdown/formatting, natural conversational responses

## Phase 3: Agent — TTS Voice Parameterization

- [x] **3.1** In `agent/tts.py` — Change `create_tts()` signature to `create_tts(voice_id: str = ATC_VOICE_ID) -> TTS`
- [x] **3.2** In `agent/tts.py` — Pass `voice_id` parameter (instead of hardcoded `ATC_VOICE_ID`) to `TTS()` constructor on line 39
- [x] **3.3** Verify backward compatibility: existing callers in `agent/worker.py` (`__init__` line 51) pass no args → still get default Adam voice

## Phase 4: Agent — Free Talk Mode in Worker

### 4A: New Dependency, State & Message Types

- [x] **4.0** In `agent/requirements.txt` — Add `openai>=1.30.0` (not currently in agent deps; the Edge Function uses OpenAI but the Python agent does not yet)
- [x] **4.1** In `agent/worker.py` — Add imports: `openai` (AsyncOpenAI), `PersonaConfig`, `PERSONAS`, `DEFAULT_PERSONA_ID`, `get_persona_by_frequency` from `agent/personas.py`, `build_freetalk_prompt` from `agent/prompts/freetalk_system.py`
- [x] **4.2** In `agent/worker.py` — Add new message type constants:
  - Browser → Agent: `MSG_FREETALK_START`, `MSG_FREETALK_END`, `MSG_SET_PERSONA`
  - Agent → Browser: `MSG_FREETALK_RESPONSE`
- [x] **4.3** In `agent/worker.py` `ATCAgentWorker.__init__()` — Add instance state:
  - `self._freetalk_mode: bool = False`
  - `self._active_persona: PersonaConfig | None = None`
  - `self._persona_tts: dict[str, TTS] = {}` (pre-created per persona)
  - `self._conversation_histories: dict[str, list[dict]] = {}` (per persona)
  - `self._openai: openai.AsyncOpenAI | None = None`
  - `self._is_thinking: bool = False` (lock: True while LLM is generating + TTS is speaking; prevents parallel requests)
  - `self._aircraft_callsign: str = "N389HW"`
  - `self._aircraft_state: dict = {}` (altitude, heading from browser)

### 4B: Message Dispatch

- [x] **4.4** In `agent/worker.py` `_on_data_received()` — Add dispatch cases for `MSG_FREETALK_START`, `MSG_FREETALK_END`, `MSG_SET_PERSONA`

### 4C: Handler — Free Talk Start

- [x] **4.5** In `agent/worker.py` — Implement `_handle_freetalk_start(payload)`:
  - Extract `callsign`, `altitude`, `heading`, `frequency` from payload
  - Set `self._freetalk_mode = True`
  - Lazy-init `self._openai = openai.AsyncOpenAI()` (reads `OPENAI_API_KEY` from env)
  - Pre-create TTS for both personas: `self._persona_tts[pid] = create_tts(voice_id=persona.voice_id)` for each persona in `PERSONAS`
  - Init empty conversation histories for both personas
  - Set `self._active_persona` via `get_persona_by_frequency(frequency)`
  - Store aircraft state for prompt building

### 4D: Handler — Free Talk End

- [x] **4.6** In `agent/worker.py` — Implement `_handle_freetalk_end(payload)`:
  - Set `self._freetalk_mode = False`
  - Set `self._is_thinking = False`
  - Clear `self._active_persona`
  - Clear `self._conversation_histories`
  - Clear `self._persona_tts` (release TTS instances)

### 4E: Handler — Persona Switch (on COM swap)

- [x] **4.7** In `agent/worker.py` — Implement `_handle_set_persona(payload)`:
  - Extract `frequency` from payload
  - Look up persona via `get_persona_by_frequency(frequency)`
  - Set `self._active_persona` to matched persona
  - Log the switch (facility name, voice name)

### 4F: Conversational Audio Processing

- [x] **4.8** In `agent/worker.py` `_handle_ptt_end()` — Add branch: if `self._freetalk_mode`:
  - If `self._is_thinking` is True → log warning and **ignore** the audio (drop the buffer, do not process). This prevents parallel LLM requests and the agent talking over itself
  - Otherwise → call `self._process_freetalk_audio()`
- [x] **4.9** In `agent/worker.py` — Implement `_process_freetalk_audio()`:
  1. Set `self._is_thinking = True` at the top
  2. Concatenate `self._audio_buffer` → run `self._run_stt(audio)`
  3. Send `MSG_FINAL_TRANSCRIPT` to browser (pilot's words in transcript)
  4. If transcript empty/too short → set `self._is_thinking = False`, return early
  5. Append `{"role": "user", "content": transcript}` to active persona's conversation history
  6. Build system prompt via `build_freetalk_prompt(self._active_persona, self._aircraft_callsign, ...)`
  7. Call `self._openai.chat.completions.create()` with system prompt + conversation history, model=`gpt-4o-mini`, max_tokens=256
  8. Extract response text from OpenAI
  9. Append `{"role": "assistant", "content": response_text}` to active persona's history
  10. Send `MSG_FREETALK_RESPONSE` to browser with `{ text, personaId, facility }`
  11. Call `self._speak_atc(response_text, tts_override=self._persona_tts[self._active_persona.id])`
  12. Set `self._is_thinking = False` only AFTER `_speak_atc()` completes (in a `finally` block to guarantee reset even on error)
  13. Cap each persona's history at 20 exchanges (40 messages)

### 4G: Speak ATC — TTS Override Support

- [x] **4.10** In `agent/worker.py` `_speak_atc()` — Change signature to `async def _speak_atc(self, text: str, tts_override: TTS | None = None)`
- [x] **4.11** In `agent/worker.py` `_speak_atc()` — Use `tts = tts_override or self._tts` on the TTS synthesize call (line 331)
- [x] **4.12** Verify existing callers of `_speak_atc(text)` (lines 231, and escalation handler) still work with no second arg

---

## Phase 5: Frontend — Types & Store

- [x] **5.1** Create `app/src/types/freetalk.ts` — Define `ATCPersona` interface (`id, facility, sector, frequency, voiceName`) and `FreeTalkPhase` type (`'idle' | 'connecting' | 'active'`)
- [x] **5.2** In `app/src/types/index.ts` — Re-export types from `freetalk.ts`
- [x] **5.3** Create `app/src/stores/freetalk-store.ts` — Zustand store with:
  - State: `phase: FreeTalkPhase`, `activePersonaId: string | null`, `personas: ATCPersona[]` (pre-populated with Boston Center + NY Approach), `conversationLog: TranscriptEntry[]`
  - Actions: `startFreeTalk()` (set phase→connecting), `setConnected()` (set phase→active), `stopFreeTalk()` (set phase→idle, clear log), `setActivePersona(id)`, `appendConversation(entry)`, `reset()`

## Phase 6: Frontend — LiveKit Data Channel

- [x] **6.1** In `app/src/services/livekit-client.ts` — Add message constants: `MSG_FREETALK_START = 'FREETALK_START'`, `MSG_FREETALK_END = 'FREETALK_END'`, `MSG_SET_PERSONA = 'SET_PERSONA'`, `MSG_FREETALK_RESPONSE = 'FREETALK_RESPONSE'`
- [x] **6.2** In `app/src/services/livekit-client.ts` — Add sender function `sendFreeTalkStart(callsign: string, altitude: number, heading: number, frequency: number): void` — calls `sendDataMessage(MSG_FREETALK_START, { callsign, altitude, heading, frequency })`
- [x] **6.3** In `app/src/services/livekit-client.ts` — Add sender function `sendFreeTalkEnd(): void`
- [x] **6.4** In `app/src/services/livekit-client.ts` — Add sender function `sendSetPersona(frequency: number): void` — calls `sendDataMessage(MSG_SET_PERSONA, { frequency })`

## Phase 7: Frontend — LiveKit Hook Integration

- [x] **7.1** In `app/src/hooks/useLiveKit.ts` — Import `useFreeTalkStore` and the new sender functions
- [x] **7.2** In `app/src/hooks/useLiveKit.ts` — Subscribe to `freetalkPhase` from freetalk-store
- [x] **7.3** In `app/src/hooks/useLiveKit.ts` — Add `useEffect` for Free Talk connection: when `freetalkPhase === 'connecting'` and not connected → fetch token (roomName = `freetalk-<pilotId>`), connect to LiveKit, then call `sendFreeTalkStart()` with cockpit state, then `freetalkStore.setConnected()`
- [x] **7.4** In `app/src/hooks/useLiveKit.ts` — Add `useEffect` for Free Talk disconnect: when `freetalkPhase === 'idle'` and connected → call `sendFreeTalkEnd()`, disconnect
- [x] **7.5** In `app/src/hooks/useLiveKit.ts` data message handler — Add case for `MSG_FREETALK_RESPONSE`: create `TranscriptEntry` with `speaker: 'atc'`, commit to voice store via `commitTranscript()`, and append to `freetalkStore.appendConversation()`

## Phase 8: Frontend — Frequency ↔ Persona Sync

- [x] **8.1** Create `app/src/hooks/useFreeTalkSync.ts` — Hook that:
  - Subscribes to `useCockpitStore((s) => s.activeFrequency)`
  - Subscribes to `useFreeTalkStore((s) => s.phase)`
  - When `phase === 'active'` and `activeFrequency.value` changes → call `sendSetPersona(activeFrequency.value)`
  - Update `freetalkStore.setActivePersona()` to match the new frequency's persona

## Phase 9: Frontend — UI Components

### 9A: Free Talk Entry Point

- [x] **9.1** In `app/src/components/cockpit/InteractiveMFD.tsx` `TrainingSection` — When `phase === 'idle'` and drill list is NOT shown, add a **"Free Talk"** button below "Start Drill"
- [x] **9.2** Style the Free Talk button distinctly (secondary teal/purple, radio icon from lucide-react)
- [x] **9.3** On click: set cockpit frequencies to 124.350 (COM1 active) + 132.450 (COM2 standby), then call `freetalkStore.startFreeTalk()`
- [x] **9.4** Auto-switch MFD to Radios tab on Free Talk start

### 9B: Free Talk Panel

- [x] **9.5** Create `app/src/components/cockpit/FreeTalkPanel.tsx` with:
  - **Active Controller header**: Show persona facility name + frequency with a glowing status indicator
  - **COM1/COM2 row**: Display both frequencies, highlight active, include **Swap** button that calls `cockpitStore.swapFrequencies()`
  - **Conversation transcript**: Scrolling log of pilot/ATC exchanges (reuse `TranscriptDisplay` rendering pattern)
  - **PTT area**: Reuse existing `PTTButton` component
  - **End Session button**: Calls `freetalkStore.stopFreeTalk()`
- [x] **9.6** Use `useFreeTalkSync` hook inside `FreeTalkPanel` to wire frequency swaps to persona switching

### 9C: MFD Tab Routing

- [x] **9.7** In `app/src/components/cockpit/InteractiveMFD.tsx` — When `freetalkPhase === 'active'` and `activeTab === 'radios'`, render `FreeTalkPanel` **below** the existing `RadiosTab` content (lower half of the tab). The RadiosTab COM1/COM2 tuning UI and inline numpad must remain accessible so the pilot can still punch in frequencies during Free Talk
- [x] **9.8** In `app/src/components/cockpit/InteractiveMFD.tsx` `TrainingSection` — When `freetalkPhase === 'active'`, show a compact "Free Talk Active" status card (similar to "Active Drill" HUD) with persona name and "End" button
- [x] **9.9** In `app/src/components/cockpit/InteractiveMFD.tsx` `TrainingSection` — When `freetalkPhase === 'connecting'`, show "Connecting..." indicator

---

## Phase 10: Validation & Regression

- [x] **10.1** Run `cd app && npx tsc --noEmit` — zero errors
- [x] **10.2** Run `cd app && pnpm lint` — zero errors
- [x] **10.3** Run `cd app && pnpm build` — successful build
- [ ] **10.4** Verify VNAV Descent Conflict drill still works end-to-end (no regression)
- [ ] **10.5** Verify Free Talk button appears in MFD Home tab when idle
- [ ] **10.6** Verify COM swap during Free Talk sends `MSG_SET_PERSONA` over data channel

## Phase 11: Documentation Update

- [x] **11.1** Update `ARCHITECTURE.md` directory structure — add new files (`agent/personas.py`, `agent/prompts/freetalk_system.py`, `app/src/types/freetalk.ts`, `app/src/stores/freetalk-store.ts`, `app/src/hooks/useFreeTalkSync.ts`, `app/src/components/cockpit/FreeTalkPanel.tsx`)
- [x] **11.2** Update `docs/arch-voice-pipeline.md` — document Free Talk conversational pipeline (STT → Claude → TTS)
- [x] **11.3** Update `docs/arch-stores.md` — document freetalk-store interface
