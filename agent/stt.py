# T6.2 — Deepgram Nova-2 via LiveKit STT plugin
# Base keyword list + dynamic per-drill keywords, per-word confidence extraction

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from livekit.plugins.deepgram import STT

logger = logging.getLogger("anthem.stt")

# ─── Patch: LiveKit Deepgram plugin drops per-word confidence ───────────────
# The plugin's prerecorded_transcription_to_speech_event() constructs TimedString
# without passing word["confidence"]. We monkey-patch it so confidence propagates.
def _patch_deepgram_confidence() -> None:
    """Patch livekit-plugins-deepgram to include per-word confidence in TimedString."""
    try:
        import livekit.plugins.deepgram.stt as dg_stt
        from livekit.agents.types import TimedString

        _original = dg_stt.prerecorded_transcription_to_speech_event

        def _patched(language, data):  # type: ignore[no-untyped-def]
            event = _original(language, data)
            # Inject per-word confidence from the raw Deepgram response
            try:
                channel = data["results"]["channels"][0]
                for alt_idx, alt in enumerate(channel["alternatives"]):
                    if alt_idx < len(event.alternatives):
                        speech_data = event.alternatives[alt_idx]
                        raw_words = alt.get("words", [])
                        for w_idx, timed_str in enumerate(speech_data.words):
                            if w_idx < len(raw_words):
                                timed_str.confidence = raw_words[w_idx].get("confidence", 0.0)
            except (KeyError, IndexError):
                pass  # Graceful fallback — original behavior
            return event

        dg_stt.prerecorded_transcription_to_speech_event = _patched
        logger.info("Patched Deepgram plugin: per-word confidence now propagated")
    except Exception:
        logger.warning("Failed to patch Deepgram confidence — using defaults", exc_info=True)

_patch_deepgram_confidence()

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

    # Deepgram expects keywords as list[tuple[str, float]] — (keyword, boost_intensity)
    # Default boost of 1.5 gives moderate priority without over-biasing
    keyword_tuples: list[tuple[str, float]] = [
        (kw, 1.5) for kw in config.all_keywords
    ]

    return STT(
        model=config.model,
        language=config.language,
        keywords=keyword_tuples,
        interim_results=config.interim_results,
        smart_format=False,
        punctuate=False,
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

    if words:
        confs = [float(w.get("confidence", 0.0)) for w in words]
        logger.debug("Word confidences extracted", extra={
            "metric_type": "word_confidences",
            "word_count": len(words),
            "mean_confidence": sum(confs) / len(confs),
            "min_confidence": min(confs),
            "max_confidence": max(confs),
        })

    return result


DISFLUENCY_MARKERS = {"um", "uh", "er", "ah", "erm", "hmm", "mm"}


def count_disfluencies(transcript: str) -> int:
    """Count disfluency markers in a transcript."""
    words = transcript.lower().split()
    return sum(1 for w in words if w.strip(".,!?") in DISFLUENCY_MARKERS)
