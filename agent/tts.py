# T6.3 — ElevenLabs via LiveKit TTS plugin
# Radio static overlay, ATC_SPEAK_END data channel message

from __future__ import annotations

import logging
import numpy as np

from livekit.plugins.elevenlabs import TTS

logger = logging.getLogger("anthem.tts")

# ATC voice configuration
ATC_VOICE_ID = "pNInz6obpgDQGcFmaJgB"  # "Adam" — professional male voice
ATC_MODEL_ID = "eleven_turbo_v2"


def create_tts() -> TTS:
    """Create an ElevenLabs TTS instance configured for ATC voice."""
    logger.info("Creating ElevenLabs TTS with voice=%s", ATC_VOICE_ID)
    return TTS(
        voice_id=ATC_VOICE_ID,
        model_id=ATC_MODEL_ID,
    )


def apply_radio_static(
    audio_data: np.ndarray,
    sample_rate: int = 16000,
    noise_level: float = 0.02,
    bandpass_low: int = 300,
    bandpass_high: int = 3400,
) -> np.ndarray:
    """Apply radio static effect to audio data.

    Simulates VHF radio quality:
    - Bandpass filter (300Hz - 3400Hz)
    - Light white noise overlay
    - Slight compression
    """
    audio = audio_data.astype(np.float32)

    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val

    # Simple bandpass via FFT
    n = len(audio)
    if n > 0:
        fft = np.fft.rfft(audio)
        freqs = np.fft.rfftfreq(n, d=1.0 / sample_rate)

        # Zero out frequencies outside radio band
        mask = (freqs >= bandpass_low) & (freqs <= bandpass_high)
        fft[~mask] = 0

        audio = np.fft.irfft(fft, n=n)

    # Add subtle white noise
    noise = np.random.normal(0, noise_level, len(audio)).astype(np.float32)
    audio = audio + noise

    # Soft clipping (compression)
    audio = np.tanh(audio * 1.5) * 0.8

    # Scale back to int16 range
    audio = (audio * 32767).astype(np.int16)

    return audio
