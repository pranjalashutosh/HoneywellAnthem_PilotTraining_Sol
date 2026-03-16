// T1.6 — Latency decomposition types

export interface LatencyDecomposition {
  // Pilot cognitive latency (used for scoring)
  pilotReactionMs: number;
  speechOnsetMs: number;
  totalPilotLatencyMs: number;

  // System overhead (displayed for transparency, NOT in scoring)
  networkLatencyMs: number;
  deepgramProcessingMs: number;

  // Raw timestamps for debugging
  atcAudioEndTimestamp: number;
  pttPressTimestamp: number;
  localSpeechOnsetTimestamp: number;
  deepgramFirstWordStart: number;
}
