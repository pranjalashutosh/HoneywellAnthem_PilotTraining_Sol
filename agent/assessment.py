# T6.5 — Confidence-weighted readback scoring, latency decomposition,
# cognitive load composite, baseline calibration

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from .voice_analysis import VoiceBiomarkers

logger = logging.getLogger("anthem.assessment")

# Confidence tiers (per ARCHITECTURE.md)
CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.60
CONFIDENCE_ABSTAIN_MEAN = 0.50
CONFIDENCE_ABSTAIN_LOW_PCT = 0.40

# Cognitive load composite weights (per Metrics_research.md Section 1.6)
CL_WEIGHT_F0 = 0.35
CL_WEIGHT_DISFLUENCY = 0.25
CL_WEIGHT_F0_RANGE = 0.15
CL_WEIGHT_SPEECH_RATE = 0.15
CL_WEIGHT_INTENSITY = 0.10


@dataclass
class CognitiveLoadBaseline:
    """Per-pilot baseline for cognitive load scoring."""

    pilot_id: str
    sample_count: int = 0
    f0_mean: float = 0.0
    f0_std: float = 0.0
    f0_range_mean: float = 0.0
    intensity_mean: float = 0.0
    intensity_std: float = 0.0
    speech_rate_mean: float = 0.0
    speech_rate_std: float = 0.0
    disfluency_rate_mean: float = 0.0
    disfluency_rate_std: float = 0.0
    is_calibrated: bool = False

    # Running sums for incremental updates
    _f0_sum: float = field(default=0.0, repr=False)
    _f0_sq_sum: float = field(default=0.0, repr=False)
    _f0_range_sum: float = field(default=0.0, repr=False)
    _intensity_sum: float = field(default=0.0, repr=False)
    _intensity_sq_sum: float = field(default=0.0, repr=False)
    _sr_sum: float = field(default=0.0, repr=False)
    _sr_sq_sum: float = field(default=0.0, repr=False)
    _disf_sum: float = field(default=0.0, repr=False)
    _disf_sq_sum: float = field(default=0.0, repr=False)

    def update(self, biomarkers: VoiceBiomarkers) -> None:
        """Update baseline with a new utterance."""
        self.sample_count += 1
        n = self.sample_count

        self._f0_sum += biomarkers.f0_mean
        self._f0_sq_sum += biomarkers.f0_mean ** 2
        self._f0_range_sum += biomarkers.f0_range
        self._intensity_sum += biomarkers.vocal_intensity_rms
        self._intensity_sq_sum += biomarkers.vocal_intensity_rms ** 2
        self._sr_sum += biomarkers.speech_rate_wpm
        self._sr_sq_sum += biomarkers.speech_rate_wpm ** 2
        self._disf_sum += biomarkers.disfluency_rate
        self._disf_sq_sum += biomarkers.disfluency_rate ** 2

        # Update means and stds
        self.f0_mean = self._f0_sum / n
        self.f0_std = _running_std(self._f0_sum, self._f0_sq_sum, n)
        self.f0_range_mean = self._f0_range_sum / n
        self.intensity_mean = self._intensity_sum / n
        self.intensity_std = _running_std(self._intensity_sum, self._intensity_sq_sum, n)
        self.speech_rate_mean = self._sr_sum / n
        self.speech_rate_std = _running_std(self._sr_sum, self._sr_sq_sum, n)
        self.disfluency_rate_mean = self._disf_sum / n
        self.disfluency_rate_std = _running_std(self._disf_sum, self._disf_sq_sum, n)

        self.is_calibrated = n >= 10

    @property
    def calibration_status(self) -> str:
        if self.sample_count >= 10:
            return "calibrated"
        if self.sample_count >= 5:
            return "partial"
        return "uncalibrated"

    @property
    def confidence(self) -> float:
        if self.sample_count >= 10:
            return min(1.0, 0.7 + (self.sample_count - 10) * 0.03)
        if self.sample_count >= 5:
            return 0.3 + (self.sample_count - 5) * 0.07
        return max(0.1, self.sample_count * 0.06)


@dataclass
class CognitiveLoadScore:
    """Cognitive load score for a single event."""

    event_index: int
    biomarkers: dict
    deviations: dict
    composite_load: float
    confidence: float
    calibration_status: str


def compute_cognitive_load(
    biomarkers: VoiceBiomarkers,
    baseline: CognitiveLoadBaseline,
    event_index: int,
) -> CognitiveLoadScore:
    """Compute cognitive load score relative to pilot's own baseline."""
    # Z-score deviations
    f0_dev = _z_score(biomarkers.f0_mean, baseline.f0_mean, baseline.f0_std)
    intensity_dev = _z_score(
        biomarkers.vocal_intensity_rms, baseline.intensity_mean, baseline.intensity_std
    )
    sr_dev = _z_score(
        biomarkers.speech_rate_wpm, baseline.speech_rate_mean, baseline.speech_rate_std
    )
    f0_range_dev = _z_score(
        biomarkers.f0_range, baseline.f0_range_mean, baseline.f0_std
    )
    disf_dev = _z_score(
        biomarkers.disfluency_rate,
        baseline.disfluency_rate_mean,
        baseline.disfluency_rate_std,
    )

    # Composite: higher pitch, more disfluencies, narrower range, slower speech = more load
    composite_raw = (
        CL_WEIGHT_F0 * max(0, f0_dev)
        + CL_WEIGHT_DISFLUENCY * max(0, disf_dev)
        + CL_WEIGHT_F0_RANGE * max(0, -f0_range_dev)  # Narrowing = positive load
        + CL_WEIGHT_SPEECH_RATE * max(0, -sr_dev)  # Slower = positive load
        + CL_WEIGHT_INTENSITY * abs(intensity_dev)
    )

    # Scale to 0-100
    composite_load = float(np.clip(composite_raw * 25, 0, 100))

    return CognitiveLoadScore(
        event_index=event_index,
        biomarkers={
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
        deviations={
            "f0Deviation": f0_dev,
            "intensityDeviation": intensity_dev,
            "speechRateDeviation": sr_dev,
            "f0RangeDeviation": f0_range_dev,
            "disfluencyDeviation": disf_dev,
        },
        composite_load=composite_load,
        confidence=baseline.confidence,
        calibration_status=baseline.calibration_status,
    )


@dataclass
class ReadbackAssessment:
    """Readback scoring result."""

    raw_accuracy: float
    confidence_adjusted_accuracy: float
    scoring_basis: str  # "confident" | "uncertain" | "abstained"
    confidence_words: list[dict]
    estimated_wer: float


def score_readback(
    expected: str,
    transcript: str,
    word_confidences: list[dict],
) -> ReadbackAssessment:
    """Confidence-weighted readback scoring.

    Uses confidence tiers:
    - >= 0.85: full weight (1.0x)
    - 0.60-0.84: half weight (0.5x)
    - < 0.60: excluded (0.0x)
    """
    expected_tokens = _tokenize(expected)
    actual_tokens = _tokenize(transcript)

    if not expected_tokens:
        return ReadbackAssessment(
            raw_accuracy=100.0,
            confidence_adjusted_accuracy=100.0,
            scoring_basis="confident",
            confidence_words=word_confidences,
            estimated_wer=0.0,
        )

    # Build confidence map for actual words
    conf_map: dict[int, float] = {}
    for i, wc in enumerate(word_confidences):
        if i < len(actual_tokens):
            conf_map[i] = wc.get("confidence", 0.0)

    # Determine scoring basis
    mean_conf = (
        np.mean([wc.get("confidence", 0.0) for wc in word_confidences])
        if word_confidences
        else 0.0
    )
    low_conf_count = sum(
        1 for wc in word_confidences if wc.get("confidence", 0.0) < CONFIDENCE_MEDIUM
    )
    low_conf_pct = low_conf_count / max(1, len(word_confidences))

    if mean_conf < CONFIDENCE_ABSTAIN_MEAN or low_conf_pct > CONFIDENCE_ABSTAIN_LOW_PCT:
        scoring_basis = "abstained"
    elif mean_conf < CONFIDENCE_HIGH:
        scoring_basis = "uncertain"
    else:
        scoring_basis = "confident"

    # Raw LCS-based accuracy
    lcs_len = _lcs_length(expected_tokens, actual_tokens)
    raw_accuracy = (lcs_len / len(expected_tokens)) * 100.0

    # Confidence-adjusted accuracy
    if scoring_basis == "abstained":
        confidence_adjusted = raw_accuracy  # Not used for CBTA rollup
    else:
        matched, weighted_total = _confidence_weighted_match(
            expected_tokens, actual_tokens, conf_map
        )
        confidence_adjusted = (matched / max(1.0, weighted_total)) * 100.0

    # Estimated WER
    estimated_wer = float(
        np.mean([1.0 - wc.get("confidence", 0.0) for wc in word_confidences])
        if word_confidences
        else 0.0
    )

    return ReadbackAssessment(
        raw_accuracy=round(raw_accuracy, 1),
        confidence_adjusted_accuracy=round(confidence_adjusted, 1),
        scoring_basis=scoring_basis,
        confidence_words=word_confidences,
        estimated_wer=round(estimated_wer, 4),
    )


@dataclass
class LatencyDecomposition:
    """Latency decomposition for a single readback."""

    pilot_reaction_ms: float
    speech_onset_ms: float
    total_pilot_latency_ms: float


def compute_latency(
    atc_audio_end_ts: float,
    ptt_press_ts: float,
    speech_onset_ts: float,
) -> LatencyDecomposition:
    """Compute locally-measured latency decomposition.

    All timestamps must be from the same clock (agent-side).
    """
    pilot_reaction = max(0, ptt_press_ts - atc_audio_end_ts)
    speech_onset = max(0, speech_onset_ts - ptt_press_ts)

    return LatencyDecomposition(
        pilot_reaction_ms=pilot_reaction * 1000,
        speech_onset_ms=speech_onset * 1000,
        total_pilot_latency_ms=(pilot_reaction + speech_onset) * 1000,
    )


# ─── Helpers ────────────────────────────────────────────────


def _z_score(value: float, mean: float, std: float) -> float:
    if std < 1e-6:
        return 0.0
    return (value - mean) / std


def _running_std(s: float, sq: float, n: int) -> float:
    if n < 2:
        return 0.0
    variance = (sq / n) - (s / n) ** 2
    return float(np.sqrt(max(0, variance)))


def _tokenize(text: str) -> list[str]:
    return [w.lower().strip(".,!?;:'\"") for w in text.split() if w.strip()]


def _lcs_length(a: list[str], b: list[str]) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


def _confidence_weighted_match(
    expected: list[str],
    actual: list[str],
    conf_map: dict[int, float],
) -> tuple[float, float]:
    """Compute confidence-weighted match score."""
    weighted_total = float(len(expected))
    matched = 0.0

    actual_set = {}
    for i, token in enumerate(actual):
        conf = conf_map.get(i, 0.0)
        if token not in actual_set or conf > actual_set[token][1]:
            actual_set[token] = (i, conf)

    for exp_token in expected:
        if exp_token in actual_set:
            _, conf = actual_set[exp_token]
            if conf >= CONFIDENCE_HIGH:
                matched += 1.0
            elif conf >= CONFIDENCE_MEDIUM:
                matched += 0.5
            # < CONFIDENCE_MEDIUM: excluded (0.0x)

    return matched, weighted_total
