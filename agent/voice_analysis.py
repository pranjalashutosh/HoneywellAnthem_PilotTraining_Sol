# T6.4 — Voice biomarker extraction via librosa
# F0 (pyin), RMS, MFCC, spectral features, numpy smoothing + octave correction

from __future__ import annotations

import logging
from dataclasses import dataclass

import librosa
import numpy as np

logger = logging.getLogger("anthem.voice_analysis")

# Audio parameters
SAMPLE_RATE = 16000
HOP_LENGTH = 512
WIN_LENGTH = 2048
N_MFCC = 13
F0_MIN = 75.0
F0_MAX = 600.0


@dataclass
class VoiceBiomarkers:
    """Extracted voice biomarkers from a single utterance."""

    f0_mean: float
    f0_peak: float
    f0_range: float
    f0_std: float
    vocal_intensity_rms: float
    speech_rate_wpm: float
    articulation_rate_wpm: float
    disfluency_count: int
    disfluency_rate: float
    utterance_duration_ms: float


def extract_biomarkers(
    audio: np.ndarray,
    sample_rate: int = SAMPLE_RATE,
    word_count: int = 0,
    disfluency_count: int = 0,
    duration_ms: float = 0.0,
) -> VoiceBiomarkers:
    """Extract voice biomarkers from raw audio.

    Args:
        audio: Raw audio samples (float32 or int16)
        sample_rate: Audio sample rate
        word_count: Total word count from STT
        disfluency_count: Disfluency count from STT
        duration_ms: Utterance duration in ms
    """
    # Convert to float32 if needed
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0

    # Ensure mono
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # F0 extraction via pyin
    f0, voiced_flag, _ = librosa.pyin(
        audio,
        fmin=F0_MIN,
        fmax=F0_MAX,
        sr=sample_rate,
        win_length=WIN_LENGTH,
        hop_length=HOP_LENGTH,
    )

    # Filter voiced frames and apply octave correction
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
    voiced_f0 = _octave_correct(voiced_f0)

    if len(voiced_f0) == 0:
        voiced_f0 = np.array([0.0])

    # RMS intensity
    rms = librosa.feature.rms(
        y=audio, frame_length=WIN_LENGTH, hop_length=HOP_LENGTH
    )[0]
    rms_db = float(np.mean(librosa.amplitude_to_db(rms + 1e-10)))

    # Speech rate calculations
    duration_sec = duration_ms / 1000.0 if duration_ms > 0 else len(audio) / sample_rate
    speech_rate = (word_count / duration_sec * 60.0) if duration_sec > 0 else 0.0

    # Articulation rate (exclude pauses > 200ms)
    pause_frames = _count_pause_frames(rms, sample_rate, HOP_LENGTH, threshold_ms=200)
    active_sec = max(0.01, duration_sec - pause_frames * HOP_LENGTH / sample_rate)
    articulation_rate = (word_count / active_sec * 60.0) if active_sec > 0 else 0.0

    # Disfluency rate per 100 words
    disfluency_rate = (disfluency_count / max(1, word_count)) * 100.0

    return VoiceBiomarkers(
        f0_mean=float(np.mean(voiced_f0)),
        f0_peak=float(np.max(voiced_f0)),
        f0_range=float(np.max(voiced_f0) - np.min(voiced_f0)),
        f0_std=float(np.std(voiced_f0)),
        vocal_intensity_rms=rms_db,
        speech_rate_wpm=speech_rate,
        articulation_rate_wpm=articulation_rate,
        disfluency_count=disfluency_count,
        disfluency_rate=disfluency_rate,
        utterance_duration_ms=duration_ms if duration_ms > 0 else duration_sec * 1000,
    )


def extract_mfcc(audio: np.ndarray, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Extract MFCC features for voice quality characterization."""
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    return librosa.feature.mfcc(
        y=audio, sr=sample_rate, n_mfcc=N_MFCC, hop_length=HOP_LENGTH
    )


def extract_spectral(
    audio: np.ndarray, sample_rate: int = SAMPLE_RATE
) -> dict[str, float]:
    """Extract spectral features: centroid, rolloff, flatness."""
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0

    centroid = librosa.feature.spectral_centroid(
        y=audio, sr=sample_rate, hop_length=HOP_LENGTH
    )
    rolloff = librosa.feature.spectral_rolloff(
        y=audio, sr=sample_rate, hop_length=HOP_LENGTH
    )
    flatness = librosa.feature.spectral_flatness(
        y=audio, hop_length=HOP_LENGTH
    )

    return {
        "centroid": float(np.mean(centroid)),
        "rolloff": float(np.mean(rolloff)),
        "flatness": float(np.mean(flatness)),
    }


def _octave_correct(f0: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    """Correct octave jumps in F0 contour.

    If a frame's F0 is roughly double the median, halve it (and vice versa).
    """
    if len(f0) < 3:
        return f0

    corrected = f0.copy()
    median_f0 = np.median(corrected[corrected > 0])

    if median_f0 <= 0:
        return corrected

    for i in range(len(corrected)):
        if corrected[i] <= 0:
            continue
        ratio = corrected[i] / median_f0
        if ratio > (2.0 - threshold):
            corrected[i] /= 2.0
        elif ratio < (0.5 + threshold * 0.5):
            corrected[i] *= 2.0

    return corrected


def _count_pause_frames(
    rms: np.ndarray,
    sample_rate: int,
    hop_length: int,
    threshold_ms: int = 200,
) -> int:
    """Count frames that are part of pauses longer than threshold."""
    silence_threshold = np.percentile(rms, 10) * 1.5
    is_silent = rms < silence_threshold

    min_pause_frames = int(threshold_ms / 1000.0 * sample_rate / hop_length)

    pause_count = 0
    current_silence = 0
    for s in is_silent:
        if s:
            current_silence += 1
        else:
            if current_silence >= min_pause_frames:
                pause_count += current_silence
            current_silence = 0
    if current_silence >= min_pause_frames:
        pause_count += current_silence

    return pause_count
