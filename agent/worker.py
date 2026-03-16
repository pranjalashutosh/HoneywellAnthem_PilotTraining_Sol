# T6.1 — LiveKit agent entry point
# Room lifecycle, data channel message dispatch, STT/TTS/voice analysis pipeline

from __future__ import annotations

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

    async def start(self, ctx: agents.JobContext) -> None:
        """Called when the agent joins a room."""
        logger.info("Agent starting in room %s", ctx.room.name)
        self._room = ctx.room

        # Set pilot ID from room metadata if available
        if ctx.room.metadata:
            try:
                meta = json.loads(ctx.room.metadata)
                pilot_id = meta.get("pilotId", "unknown")
                self._baseline = CognitiveLoadBaseline(pilot_id=pilot_id)
                logger.info("Pilot ID from room metadata: %s", pilot_id)
            except json.JSONDecodeError:
                pass

        # Listen for data channel messages from browser
        ctx.room.on("data_received", self._on_data_received)

        # Listen for track subscriptions (pilot's mic)
        ctx.room.on("track_subscribed", self._on_track_subscribed)

        logger.info("Agent ready, waiting for participants")

    async def _on_track_subscribed(
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

    def _on_data_received(
        self,
        data: bytes,
        participant: rtc.RemoteParticipant | None,
        kind: rtc.DataPacketKind,
    ) -> None:
        """Dispatch incoming data channel messages."""
        try:
            message = json.loads(data.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Invalid data channel message")
            return

        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == MSG_PTT_START:
            self._handle_ptt_start(payload)
        elif msg_type == MSG_PTT_END:
            self._handle_ptt_end(payload)
        elif msg_type == MSG_SET_KEYWORDS:
            self._handle_set_keywords(payload)
        elif msg_type == MSG_ATC_INSTRUCTION:
            self._handle_atc_instruction(payload)
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
        import asyncio

        asyncio.ensure_future(self._process_pilot_audio())

    def _handle_set_keywords(self, payload: dict) -> None:
        """Update STT keyword boosting for current drill."""
        keywords = payload.get("keywords", [])
        self._stt_config.drill_keywords = keywords
        self._stt = create_stt(self._stt_config)
        logger.info("Updated drill keywords: %d terms", len(keywords))

    def _handle_atc_instruction(self, payload: dict) -> None:
        """Synthesize ATC instruction and play into room."""
        text = payload.get("text", "")
        self._expected_readback = payload.get("expectedReadback", "")

        if not text:
            logger.warning("Empty ATC instruction")
            return

        logger.info("ATC instruction: %s", text[:80])

        import asyncio

        asyncio.ensure_future(self._speak_atc(text))

    async def _speak_atc(self, text: str) -> None:
        """Synthesize and play ATC instruction with radio static."""
        if not self._room:
            return

        try:
            # Generate TTS audio
            tts_stream = self._tts.synthesize(text)
            audio_frames: list[np.ndarray] = []

            async for event in tts_stream:
                if event.frame:
                    frame_data = np.frombuffer(event.frame.data, dtype=np.int16)
                    audio_frames.append(frame_data)

            if not audio_frames:
                logger.warning("TTS produced no audio")
                return

            # Concatenate and apply radio static effect
            full_audio = np.concatenate(audio_frames)
            processed = apply_radio_static(full_audio, sample_rate=SAMPLE_RATE)

            # Publish audio to room
            source = rtc.AudioSource(SAMPLE_RATE, 1)
            track = rtc.LocalAudioTrack.create_audio_track("atc-audio", source)
            options = rtc.TrackPublishOptions()
            await self._room.local_participant.publish_track(track, options)

            # Send processed audio frames
            chunk_size = SAMPLE_RATE // 50  # 20ms chunks
            for i in range(0, len(processed), chunk_size):
                chunk = processed[i : i + chunk_size]
                frame = rtc.AudioFrame(
                    data=chunk.tobytes(),
                    sample_rate=SAMPLE_RATE,
                    num_channels=1,
                    samples_per_channel=len(chunk),
                )
                await source.capture_frame(frame)

            # Unpublish the track after playback
            await self._room.local_participant.unpublish_track(track.sid)

            # Record ATC speak end timestamp and notify browser
            self._atc_speak_end_ts = time.time()
            await self._send_message(
                MSG_ATC_SPEAK_END, {"timestamp": self._atc_speak_end_ts}
            )
            logger.info("ATC playback complete")

        except Exception:
            logger.exception("Error during ATC speech synthesis")

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

            # Use the STT recognize method
            result = await self._stt.recognize(frame)

            text = result.text if result else ""
            words = []
            if result and hasattr(result, "words"):
                words = [
                    {
                        "word": w.word,
                        "confidence": w.confidence,
                        "start": w.start_time,
                        "end": w.end_time,
                    }
                    for w in result.words
                ]

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
            return

        message = json.dumps({"type": msg_type, "payload": payload})
        await self._room.local_participant.publish_data(
            message.encode("utf-8"),
            kind=rtc.DataPacketKind.KIND_RELIABLE,
        )

    def on_audio_frame(self, frame: rtc.AudioFrame) -> None:
        """Called for each incoming audio frame when PTT is active."""
        if not self._ptt_active:
            return

        audio_data = np.frombuffer(frame.data, dtype=np.int16)
        self._audio_buffer.append(audio_data)


# ─── Agent entrypoint ──────────────────────────────────────


async def entrypoint(ctx: agents.JobContext) -> None:
    """LiveKit agent entrypoint."""
    logger.info("Agent entrypoint called for room %s", ctx.room.name)

    worker = ATCAgentWorker()
    await worker.start(ctx)

    # Keep agent alive
    await ctx.connect()


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
