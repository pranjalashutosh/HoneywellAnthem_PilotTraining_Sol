# Phase 1 — Dual ATC persona definitions for Free Talk mode

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PersonaConfig:
    """Configuration for a single ATC controller persona."""

    id: str
    facility: str
    sector: str
    callsign_prefix: str
    voice_id: str
    voice_name: str
    accent_note: str
    frequency: float


PERSONAS: dict[str, PersonaConfig] = {
    "boston_center": PersonaConfig(
        id="boston_center",
        facility="Boston Center",
        sector="Sector 33",
        callsign_prefix="Boston Center",
        voice_id="pNInz6obpgDQGcFmaJgB",  # ElevenLabs "Adam"
        voice_name="Adam",
        accent_note="American male",
        frequency=124.350,
    ),
    "ny_approach": PersonaConfig(
        id="ny_approach",
        facility="New York Approach",
        sector="Sector 56",
        callsign_prefix="New York Approach",
        voice_id="onwK4e9ZLuTAKqWW03F9",  # ElevenLabs "Daniel"
        voice_name="Daniel",
        accent_note="British male",
        frequency=132.450,
    ),
}

DEFAULT_PERSONA_ID = "boston_center"


def get_persona_by_frequency(freq: float) -> PersonaConfig | None:
    """Look up a persona by its COM frequency. Returns None if no match."""
    for persona in PERSONAS.values():
        if abs(persona.frequency - freq) < 0.001:
            return persona
    return None
