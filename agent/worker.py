# T6.1 — LiveKit agent entry point
# Room lifecycle, data channel message dispatch, STT/TTS/voice analysis pipeline

from __future__ import annotations

import asyncio
import json
import logging
import time

import numpy as np
from livekit import agents, rtc

from .assessment import (
    CognitiveLoadBaseline,
    compute_cognitive_load,
    compute_latency,
    score_readback,
)
from .prompts.atc_system import build_atc_prompt
from .stt import STTConfig, count_disfluencies, create_stt, extract_word_confidences
from .tts import apply_radio_static, create_tts
from .voice_analysis import SAMPLE_RATE, extract_biomarkers

logger = logging.getLogger("anthem.worker")

# Data channel message types (browser → agent)
MSG_PTT_START = "PTT_START"
MSG_PTT_END = "PTT_END"
MSG_SET_KEYWORDS = "SET_KEYWORDS"
MSG_ATC_INSTRUCTION = "ATC_INSTRUCTION"
MSG_SET_BASELINE = "SET_BASELINE"
MSG_ATC_ESCALATION = "ATC_ESCALATION"
MSG_INTERACTIVE_COCKPIT_RESULT = "INTERACTIVE_COCKPIT_RESULT"

# Data channel message types (agent → browser)
MSG_INTERIM_TRANSCRIPT = "INTERIM_TRANSCRIPT"
MSG_FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT"
MSG_ATC_SPEAK_END = "ATC_SPEAK_END"
MSG_ASSESSMENT_RESULT = "ASSESSMENT_RESULT"
MSG_BASELINE_UPDATE = "BASELINE_UPDATE"


class ATCAgentWorker:
    """LiveKit agent that handles ATC voice, STT, voice analysis, and assessment."""

    def __init__(self) -> None:
        self._stt_config = STTConfig()
        self._stt = create_stt(self._stt_config)
        self._tts = create_tts()

        # Per-session state
        self._baseline = CognitiveLoadBaseline(pilot_id="unknown")
        self._ptt_active = False
        self._ptt_start_ts: float = 0.0
        self._atc_speak_end_ts: float = 0.0
        self._audio_buffer: list[np.ndarray] = []
        self._event_index: int = 0
        self._expected_readback: str = ""
        self._room: rtc.Room | None = None
        self._participant: rtc.RemoteParticipant | None = None
        self._audio_stream: rtc.AudioStream | None = None

        # Interactive cockpit result (from browser, fire-and-forget)
        self._last_interactive_score: dict | None = None

        # Persistent ATC audio track — published once, reused for all instructions
        self._atc_source: rtc.AudioSource | None = None
        self._atc_track: rtc.LocalAudioTrack | None = None
        self._atc_track_published: bool = False

    async def start(self, ctx: agents.JobContext) -> None:
        """Called when the agent joins a room."""
        logger.info("=== Agent starting in room %s ===", ctx.room.name)
        self._room = ctx.room

        # Set pilot ID from room metadata if available
        if ctx.room.metadata:
            try:
                meta = json.loads(ctx.room.metadata)
                pilot_id = meta.get("pilotId", "unknown")
                self._baseline = CognitiveLoadBaseline(pilot_id=pilot_id)
                logger.info("[INIT] Pilot ID from room metadata: %s", pilot_id)
            except json.JSONDecodeError:
                logger.warning("[INIT] Could not parse room metadata")

        # Pre-publish a persistent ATC audio track so the browser subscribes once
        await self._publish_atc_track()

        # Listen for data channel messages from browser
        ctx.room.on("data_received", self._on_data_received)

        # Listen for track subscriptions (pilot's mic)
        ctx.room.on("track_subscribed", self._on_track_subscribed)

        # Handle tracks that were already subscribed before this handler was registered.
        # This happens when the browser joins the room before the agent — the
        # track_subscribed event fires during ctx.connect(), before start() runs.
        for participant in ctx.room.remote_participants.values():
            for pub in participant.track_publications.values():
                if pub.track and pub.track.kind == rtc.TrackKind.KIND_AUDIO:
                    logger.info(
                        "[INIT] Found pre-existing audio track from %s — subscribing",
                        participant.identity,
                    )
                    self._on_track_subscribed(pub.track, pub, participant)

        logger.info("[INIT] Agent ready — ATC track published, waiting for participants")

    async def _publish_atc_track(self) -> None:
        """Create and publish a persistent audio track for ATC voice output."""
        if not self._room or self._atc_track_published:
            return

        try:
            self._atc_source = rtc.AudioSource(SAMPLE_RATE, 1)
            self._atc_track = rtc.LocalAudioTrack.create_audio_track(
                "atc-audio", self._atc_source
            )
            options = rtc.TrackPublishOptions()
            await self._room.local_participant.publish_track(
                self._atc_track, options
            )
            self._atc_track_published = True
            logger.info(
                "[ATC-TRACK] Published persistent ATC audio track (sample_rate=%d)",
                SAMPLE_RATE,
            )
        except Exception:
            logger.exception("[ATC-TRACK] Failed to publish ATC audio track")

    def _on_track_subscribed(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        """Handle subscription to pilot's audio track."""
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return

        logger.info("Subscribed to audio track from %s", participant.identity)
        self._participant = participant

        # Update pilot_id from participant identity if still unknown
        if self._baseline.pilot_id == "unknown" and participant.identity:
            self._baseline = CognitiveLoadBaseline(pilot_id=participant.identity)
            logger.info("Set pilot_id from participant: %s", participant.identity)

        # Start consuming audio frames in background
        self._audio_stream = rtc.AudioStream(
            track, sample_rate=16000, num_channels=1
        )
        asyncio.create_task(self._consume_audio_frames())

    def _on_data_received(self, data_packet: rtc.DataPacket) -> None:
        """Dispatch incoming data channel messages."""
        try:
            message = json.loads(data_packet.data.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("[DATA-CH] Invalid data channel message (raw=%d bytes)", len(data_packet.data))
            return

        msg_type = message.get("type")
        payload = message.get("payload", {})
        sender = data_packet.participant.identity if data_packet.participant else "unknown"
        logger.info("[DATA-CH] Received %s from %s", msg_type, sender)

        if msg_type == MSG_PTT_START:
            self._handle_ptt_start(payload)
        elif msg_type == MSG_PTT_END:
            self._handle_ptt_end(payload)
        elif msg_type == MSG_SET_KEYWORDS:
            self._handle_set_keywords(payload)
        elif msg_type == MSG_ATC_INSTRUCTION:
            self._handle_atc_instruction(payload)
        elif msg_type == MSG_SET_BASELINE:
            self._handle_set_baseline(payload)
        elif msg_type == MSG_ATC_ESCALATION:
            self._handle_atc_escalation(payload)
        elif msg_type == MSG_INTERACTIVE_COCKPIT_RESULT:
            self._handle_interactive_cockpit_result(payload)
        else:
            logger.warning("Unknown message type: %s", msg_type)

    def _handle_ptt_start(self, payload: dict) -> None:
        """Pilot pressed PTT — start capturing audio."""
        self._ptt_active = True
        self._ptt_start_ts = payload.get("timestamp", time.time())
        self._audio_buffer = []
        logger.info("PTT START at %.3f", self._ptt_start_ts)

    def _handle_ptt_end(self, payload: dict) -> None:
        """Pilot released PTT — process captured audio."""
        if not self._ptt_active:
            return

        self._ptt_active = False
        ptt_end_ts = payload.get("timestamp", time.time())
        logger.info("PTT END at %.3f", ptt_end_ts)

        # Process audio asynchronously
        asyncio.ensure_future(self._process_pilot_audio())

    def _handle_set_keywords(self, payload: dict) -> None:
        """Update STT keyword boosting for current drill."""
        keywords = payload.get("keywords", [])
        self._stt_config.drill_keywords = keywords
        old_stt = self._stt
        self._stt = create_stt(self._stt_config)
        # Explicitly close old STT to release Deepgram connections
        if old_stt is not None and hasattr(old_stt, "aclose"):
            asyncio.ensure_future(old_stt.aclose())
        logger.info("Updated drill keywords: %d terms", len(keywords))

    def _handle_atc_instruction(self, payload: dict) -> None:
        """Synthesize ATC instruction and play into room."""
        text = payload.get("text", "")
        self._expected_readback = payload.get("expectedReadback", "")

        if not text:
            logger.warning("[ATC] Empty ATC instruction received — ignoring")
            return

        logger.info("[ATC] Received instruction to speak: '%s'", text[:100])
        logger.info("[ATC] Expected readback: '%s'", self._expected_readback[:100])
        logger.info("[ATC] Track published: %s, source ready: %s",
                     self._atc_track_published, self._atc_source is not None)

        asyncio.ensure_future(self._speak_atc(text))

    def _handle_set_baseline(self, payload: dict) -> None:
        """Restore a previously-saved cognitive load baseline from the browser."""
        baseline_data = payload.get("baselineData", payload)
        pilot_id = baseline_data.get("pilotId", self._baseline.pilot_id)
        sample_count = baseline_data.get("sampleCount", 0)

        if sample_count < 1:
            logger.info("Ignoring empty baseline for %s", pilot_id)
            return

        self._baseline = CognitiveLoadBaseline(pilot_id=pilot_id)
        self._baseline.sample_count = sample_count
        self._baseline.f0_mean = baseline_data.get("f0Mean", 0.0)
        self._baseline.f0_std = baseline_data.get("f0Std", 0.0)
        self._baseline.f0_range_mean = baseline_data.get("f0RangeMean", 0.0)
        self._baseline.intensity_mean = baseline_data.get("intensityMean", 0.0)
        self._baseline.intensity_std = baseline_data.get("intensityStd", 0.0)
        self._baseline.speech_rate_mean = baseline_data.get("speechRateMean", 0.0)
        self._baseline.speech_rate_std = baseline_data.get("speechRateStd", 0.0)
        self._baseline.disfluency_rate_mean = baseline_data.get("disfluencyRateMean", 0.0)
        self._baseline.disfluency_rate_std = baseline_data.get("disfluencyRateStd", 0.0)
        self._baseline.is_calibrated = baseline_data.get("isCalibrated", False)

        # Restore running sums from means/stds so future updates are correct
        n = self._baseline.sample_count
        self._baseline._f0_sum = self._baseline.f0_mean * n
        self._baseline._f0_sq_sum = (self._baseline.f0_std ** 2 + self._baseline.f0_mean ** 2) * n
        self._baseline._f0_range_sum = self._baseline.f0_range_mean * n
        self._baseline._intensity_sum = self._baseline.intensity_mean * n
        self._baseline._intensity_sq_sum = (self._baseline.intensity_std ** 2 + self._baseline.intensity_mean ** 2) * n
        self._baseline._sr_sum = self._baseline.speech_rate_mean * n
        self._baseline._sr_sq_sum = (self._baseline.speech_rate_std ** 2 + self._baseline.speech_rate_mean ** 2) * n
        self._baseline._disf_sum = self._baseline.disfluency_rate_mean * n
        self._baseline._disf_sq_sum = (self._baseline.disfluency_rate_std ** 2 + self._baseline.disfluency_rate_mean ** 2) * n

        logger.info(
            "Baseline restored for %s: %d samples, calibrated=%s",
            pilot_id,
            sample_count,
            self._baseline.is_calibrated,
        )

    def _handle_atc_escalation(self, payload: dict) -> None:
        """Speak ATC escalation via TTS and update expected readback + STT keywords."""
        text = payload.get("text", "")
        expected_readback = payload.get("expectedReadback", "")
        keywords = payload.get("keywords", [])

        if not text:
            logger.warning("[ESCALATION] Empty escalation text — ignoring")
            return

        self._expected_readback = expected_readback
        self._stt_config.drill_keywords = keywords
        old_stt = self._stt
        self._stt = create_stt(self._stt_config)
        if old_stt is not None and hasattr(old_stt, "aclose"):
            asyncio.ensure_future(old_stt.aclose())

        logger.info("[ESCALATION] Speaking: '%s', keywords=%d", text[:80], len(keywords))
        asyncio.ensure_future(self._speak_atc(text))

    def _handle_interactive_cockpit_result(self, payload: dict) -> None:
        """Log and store the interactive cockpit score from the browser."""
        score = payload.get("score", {})
        logger.info(
            "[COCKPIT-RESULT] allMet=%s, totalTimeMs=%d, timedOut=%s, escalation=%s, modeChanges=%d",
            score.get("allConditionsMet", False),
            score.get("totalTimeMs", 0),
            score.get("timedOut", False),
            score.get("escalationTriggered", False),
            len(score.get("modeChanges", [])),
        )
        self._last_interactive_score = score

    async def _speak_atc(self, text: str) -> None:
        """Synthesize and play ATC instruction with radio static.

        Uses a persistent audio track (published once in start()) so the browser
        subscribes once and the audio element stays attached. Waits for the full
        audio duration to elapse before signalling ATC_SPEAK_END.
        """
        if not self._room:
            logger.error("[ATC-SPEAK] No room — cannot speak")
            return

        # Ensure ATC track is published (lazy fallback if start() didn't do it)
        if not self._atc_track_published or not self._atc_source:
            logger.warning("[ATC-SPEAK] ATC track not ready — publishing now")
            await self._publish_atc_track()
            if not self._atc_source:
                logger.error("[ATC-SPEAK] Failed to publish ATC track — aborting")
                return

        try:
            # ── Step 1: Generate TTS audio (with timeout) ─────────
            logger.info("[ATC-SPEAK] Requesting TTS for: '%s'", text[:80])
            tts_start = time.time()
            tts_stream = self._tts.synthesize(text)
            audio_frames: list[np.ndarray] = []

            async def _collect_tts_frames():
                async for event in tts_stream:
                    if event.frame:
                        frame_data = np.frombuffer(event.frame.data, dtype=np.int16)
                        audio_frames.append(frame_data)

            try:
                await asyncio.wait_for(_collect_tts_frames(), timeout=20.0)
            except asyncio.TimeoutError:
                logger.error("[ATC-SPEAK] TTS timed out after 20s — aborting")
                return

            tts_elapsed = time.time() - tts_start

            if not audio_frames:
                logger.warning("[ATC-SPEAK] TTS produced no audio frames (elapsed=%.2fs)", tts_elapsed)
                return

            total_samples = sum(len(f) for f in audio_frames)
            logger.info(
                "[ATC-SPEAK] TTS produced %d frames, %d samples (%.2fs of audio) in %.2fs",
                len(audio_frames),
                total_samples,
                total_samples / SAMPLE_RATE,
                tts_elapsed,
            )

            # ── Step 2: Apply radio static effect ─────────────────
            full_audio = np.concatenate(audio_frames)
            processed = apply_radio_static(full_audio, sample_rate=SAMPLE_RATE)
            audio_duration_sec = len(processed) / SAMPLE_RATE
            logger.info(
                "[ATC-SPEAK] Post-processing complete — %.2fs of audio ready to stream",
                audio_duration_sec,
            )

            # ── Step 3: Capture frames to persistent AudioSource ──
            chunk_size = SAMPLE_RATE // 50  # 20ms chunks
            num_chunks = 0
            capture_start = time.time()

            for i in range(0, len(processed), chunk_size):
                chunk = processed[i : i + chunk_size]
                frame = rtc.AudioFrame(
                    data=chunk.tobytes(),
                    sample_rate=SAMPLE_RATE,
                    num_channels=1,
                    samples_per_channel=len(chunk),
                )
                await self._atc_source.capture_frame(frame)
                num_chunks += 1

            capture_elapsed = time.time() - capture_start
            logger.info(
                "[ATC-SPEAK] Queued %d chunks (%.2fs) to AudioSource in %.3fs",
                num_chunks,
                audio_duration_sec,
                capture_elapsed,
            )

            # ── Step 4: Wait for real-time playback to complete ───
            # capture_frame() queues frames but WebRTC streams them in real-time.
            # We must wait for the full audio duration before signalling end,
            # otherwise the browser hears nothing (the old bug).
            wait_sec = max(0, audio_duration_sec - capture_elapsed + 0.3)
            logger.info("[ATC-SPEAK] Waiting %.2fs for real-time playback to finish", wait_sec)
            await asyncio.sleep(wait_sec)

            logger.info("[ATC-SPEAK] Playback complete for: '%s'", text[:60])

        except Exception:
            logger.exception("[ATC-SPEAK] Error during ATC speech synthesis")
        finally:
            # Always send ATC_SPEAK_END so the browser unlocks PTT
            self._atc_speak_end_ts = time.time()
            try:
                await self._send_message(
                    MSG_ATC_SPEAK_END, {"timestamp": self._atc_speak_end_ts}
                )
                logger.info("[ATC-SPEAK] Sent ATC_SPEAK_END to browser")
            except Exception:
                logger.warning("[ATC-SPEAK] Failed to send ATC_SPEAK_END")

    async def _process_pilot_audio(self) -> None:
        """Process captured pilot audio: STT + voice analysis + assessment."""
        if not self._audio_buffer:
            logger.info("No audio captured during PTT")
            return

        try:
            # Combine audio buffer
            audio = np.concatenate(self._audio_buffer)
            duration_ms = len(audio) / SAMPLE_RATE * 1000

            # Run STT
            stt_result = await self._run_stt(audio)
            transcript = stt_result.get("text", "")
            words = stt_result.get("words", [])
            word_confidences = extract_word_confidences(words)
            word_count = len(transcript.split()) if transcript else 0

            # Detect speech onset from audio (RMS threshold)
            speech_onset_ts = self._detect_speech_onset(audio)

            # Send final transcript to browser
            mean_conf = (
                float(np.mean([w["confidence"] for w in word_confidences]))
                if word_confidences
                else 0.0
            )
            await self._send_message(
                MSG_FINAL_TRANSCRIPT,
                {
                    "text": transcript,
                    "words": word_confidences,
                    "meanConfidence": mean_conf,
                    "timestamp": time.time(),
                },
            )

            # Count disfluencies
            disfluency_count = count_disfluencies(transcript)

            # Extract voice biomarkers
            biomarkers = extract_biomarkers(
                audio,
                sample_rate=SAMPLE_RATE,
                word_count=word_count,
                disfluency_count=disfluency_count,
                duration_ms=duration_ms,
            )

            # Update cognitive load baseline
            self._baseline.update(biomarkers)

            # Compute cognitive load
            cog_load = compute_cognitive_load(
                biomarkers, self._baseline, self._event_index
            )

            # Score readback if we have expected text
            readback = None
            if self._expected_readback:
                readback = score_readback(
                    self._expected_readback, transcript, word_confidences
                )

            # Compute latency
            latency = compute_latency(
                atc_audio_end_ts=self._atc_speak_end_ts,
                ptt_press_ts=self._ptt_start_ts,
                speech_onset_ts=speech_onset_ts,
            )

            # Build assessment payload
            assessment = {
                "readbackScore": (
                    {
                        "rawAccuracy": readback.raw_accuracy,
                        "confidenceAdjustedAccuracy": readback.confidence_adjusted_accuracy,
                        "scoringBasis": readback.scoring_basis,
                        "estimatedWER": readback.estimated_wer,
                        "confidenceWords": readback.confidence_words,
                    }
                    if readback
                    else None
                ),
                "cognitiveLoadScore": {
                    "eventIndex": cog_load.event_index,
                    "biomarkers": cog_load.biomarkers,
                    "deviations": cog_load.deviations,
                    "compositeLoad": cog_load.composite_load,
                    "confidence": cog_load.confidence,
                    "calibrationStatus": cog_load.calibration_status,
                },
                "latencyDecomposition": {
                    "pilotReactionMs": latency.pilot_reaction_ms,
                    "speechOnsetMs": latency.speech_onset_ms,
                    "totalPilotLatencyMs": latency.total_pilot_latency_ms,
                },
                "voiceBiomarkers": {
                    "f0Mean": biomarkers.f0_mean,
                    "f0Peak": biomarkers.f0_peak,
                    "f0Range": biomarkers.f0_range,
                    "f0Std": biomarkers.f0_std,
                    "vocalIntensityRMS": biomarkers.vocal_intensity_rms,
                    "speechRateWPM": biomarkers.speech_rate_wpm,
                    "articulationRateWPM": biomarkers.articulation_rate_wpm,
                    "disfluencyCount": biomarkers.disfluency_count,
                    "disfluencyRate": biomarkers.disfluency_rate,
                    "utteranceDurationMs": biomarkers.utterance_duration_ms,
                },
            }

            await self._send_message(MSG_ASSESSMENT_RESULT, assessment)

            # Send baseline update
            await self._send_message(
                MSG_BASELINE_UPDATE,
                {
                    "baselineData": {
                        "pilotId": self._baseline.pilot_id,
                        "sampleCount": self._baseline.sample_count,
                        "f0Mean": self._baseline.f0_mean,
                        "f0Std": self._baseline.f0_std,
                        "f0RangeMean": self._baseline.f0_range_mean,
                        "intensityMean": self._baseline.intensity_mean,
                        "intensityStd": self._baseline.intensity_std,
                        "speechRateMean": self._baseline.speech_rate_mean,
                        "speechRateStd": self._baseline.speech_rate_std,
                        "disfluencyRateMean": self._baseline.disfluency_rate_mean,
                        "disfluencyRateStd": self._baseline.disfluency_rate_std,
                        "isCalibrated": self._baseline.is_calibrated,
                    }
                },
            )

            self._event_index += 1
            logger.info(
                "Assessment complete: cognitive_load=%.1f, readback=%s",
                cog_load.composite_load,
                f"{readback.raw_accuracy:.1f}%" if readback else "N/A",
            )

        except Exception:
            logger.exception("Error processing pilot audio")

    async def _run_stt(self, audio: np.ndarray) -> dict:
        """Run STT on audio buffer and return transcript + words."""
        try:
            # Create audio frame for STT
            frame = rtc.AudioFrame(
                data=audio.astype(np.int16).tobytes(),
                sample_rate=SAMPLE_RATE,
                num_channels=1,
                samples_per_channel=len(audio),
            )

            # Use the STT recognize method — returns a SpeechEvent (with timeout)
            try:
                event = await asyncio.wait_for(self._stt.recognize(frame), timeout=15.0)
            except asyncio.TimeoutError:
                logger.error("[STT] recognize() timed out after 15s")
                return {"text": "", "words": []}

            # SpeechEvent stores results in .alternatives (list[SpeechData])
            text = ""
            words = []
            if event and event.alternatives:
                best = event.alternatives[0]
                text = best.text
                if best.words:
                    for w in best.words:
                        # TimedString attrs may be NOT_GIVEN (falsy sentinel)
                        conf = w.confidence if w.confidence else 0.0
                        start = w.start_time if w.start_time else 0.0
                        end = w.end_time if w.end_time else 0.0
                        words.append({
                            "word": str(w),
                            "confidence": conf,
                            "start": start,
                            "end": end,
                        })

            return {"text": text, "words": words}

        except Exception:
            logger.exception("STT error")
            return {"text": "", "words": []}

    def _detect_speech_onset(self, audio: np.ndarray) -> float:
        """Detect speech onset from audio using RMS threshold."""
        if len(audio) == 0:
            return self._ptt_start_ts

        # Convert to float32 for RMS calculation
        audio_float = audio.astype(np.float32)
        if audio.dtype == np.int16:
            audio_float = audio_float / 32768.0

        # Frame-wise RMS with 20ms frames
        frame_size = int(SAMPLE_RATE * 0.02)
        num_frames = len(audio_float) // frame_size

        if num_frames == 0:
            return self._ptt_start_ts

        rms_values = []
        for i in range(num_frames):
            frame = audio_float[i * frame_size : (i + 1) * frame_size]
            rms_values.append(float(np.sqrt(np.mean(frame**2))))

        # Threshold: 2x the minimum RMS (noise floor)
        noise_floor = np.percentile(rms_values, 10)
        threshold = noise_floor * 3.0

        # Find first frame above threshold
        for i, rms in enumerate(rms_values):
            if rms > threshold:
                onset_offset_sec = i * 0.02  # 20ms per frame
                return self._ptt_start_ts + onset_offset_sec

        return self._ptt_start_ts

    async def _send_message(self, msg_type: str, payload: dict) -> None:
        """Send a data channel message to the browser."""
        if not self._room:
            logger.warning("[DATA-CH] Cannot send %s — no room", msg_type)
            return

        message = json.dumps({"type": msg_type, "payload": payload})
        await self._room.local_participant.publish_data(
            message.encode("utf-8"),
            reliable=True,
        )
        logger.debug("[DATA-CH] Sent %s (%d bytes)", msg_type, len(message))

    async def _consume_audio_frames(self) -> None:
        """Consume audio frames from the AudioStream, buffering when PTT active."""
        if not self._audio_stream:
            return

        logger.info("Audio frame consumer started")
        async for event in self._audio_stream:
            if not self._ptt_active:
                continue
            audio_data = np.frombuffer(event.frame.data, dtype=np.int16)
            self._audio_buffer.append(audio_data)


# ─── Agent entrypoint ──────────────────────────────────────


async def entrypoint(ctx: agents.JobContext) -> None:
    """LiveKit agent entrypoint."""
    logger.info("Agent entrypoint called for room %s", ctx.room.name)

    await ctx.connect()
    worker = ATCAgentWorker()
    await worker.start(ctx)


def main() -> None:
    """Start the LiveKit agent worker."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )


if __name__ == "__main__":
    main()
