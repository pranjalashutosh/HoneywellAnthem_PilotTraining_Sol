// T1.4 — Voice domain types

export interface ConfidenceAnnotatedWord {
  word: string;
  confidence: number;
  start: number;
  end: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'pilot' | 'atc';
  text: string;
  words: ConfidenceAnnotatedWord[];
  timestamp: number;
  isFinal: boolean;
  meanConfidence: number;
}

export interface VoiceBiomarkers {
  f0Mean: number;
  f0Peak: number;
  f0Range: number;
  f0Std: number;
  vocalIntensityRMS: number;
  speechRateWPM: number;
  articulationRateWPM: number;
  disfluencyCount: number;
  disfluencyRate: number;
  utteranceDurationMs: number;
}
