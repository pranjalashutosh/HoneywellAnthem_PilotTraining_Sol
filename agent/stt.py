# T6.2 — Deepgram Nova-2 via LiveKit STT plugin
# Base keyword list + dynamic per-drill keywords, per-word confidence extraction

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from livekit.plugins.deepgram import STT

logger = logging.getLogger("anthem.stt")

# Base aviation vocabulary for keyword boosting
BASE_KEYWORDS = [
    # Common ATC terms
    "roger", "wilco", "affirm", "negative", "unable", "standby",
    "mayday", "pan pan", "say again", "read back",
    # Navigation
    "heading", "altitude", "flight level", "descend", "climb", "maintain",
    "direct", "vectors", "cleared", "approach", "departure",
    # Frequencies
    "contact", "monitor", "frequency", "guard",
    # Procedures
    "hold", "holding", "teardrop", "parallel", "direct entry",
    "ILS", "localizer", "glideslope", "missed approach",
    # Numbers (aviation pronunciation)
    "niner", "fife", "tree", "fower",
]


@dataclass
class STTConfig:
    """Configuration for Deepgram STT with keyword boosting."""

    model: str = "nova-2"
    language: str = "en-US"
    base_keywords: list[str] = field(default_factory=lambda: list(BASE_KEYWORDS))
    drill_keywords: list[str] = field(default_factory=list)
    interim_results: bool = True

    @property
    def all_keywords(self) -> list[str]:
        return self.base_keywords + self.drill_keywords


def create_stt(config: STTConfig | None = None) -> STT:
    """Create a Deepgram STT instance with keyword boosting."""
    if config is None:
        config = STTConfig()

    logger.info(
        "Creating Deepgram STT with %d keywords (%d base + %d drill)",
        len(config.all_keywords),
        len(config.base_keywords),
        len(config.drill_keywords),
    )

    return STT(
        model=config.model,
        language=config.language,
        keywords=config.all_keywords,
        interim_results=config.interim_results,
        smart_format=True,
        punctuate=True,
    )


def extract_word_confidences(
    words: list[dict],
) -> list[dict]:
    """Extract per-word confidence from Deepgram response.

    Returns list of {word, confidence, start, end} dicts.
    """
    result = []
    for w in words:
        result.append({
            "word": w.get("word", ""),
            "confidence": w.get("confidence", 0.0),
            "start": w.get("start", 0.0),
            "end": w.get("end", 0.0),
        })
    return result


DISFLUENCY_MARKERS = {"um", "uh", "er", "ah", "erm", "hmm", "mm"}


def count_disfluencies(transcript: str) -> int:
    """Count disfluency markers in a transcript."""
    words = transcript.lower().split()
    return sum(1 for w in words if w.strip(".,!?") in DISFLUENCY_MARKERS)
