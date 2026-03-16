// T1.5 — Cognitive load types

import type { VoiceBiomarkers } from './voice';

export type CalibrationStatus = 'uncalibrated' | 'partial' | 'calibrated';

export interface CognitiveLoadBaseline {
  pilotId: string;
  sampleCount: number;
  f0Mean: number;
  f0Std: number;
  f0RangeMean: number;
  intensityMean: number;
  intensityStd: number;
  speechRateMean: number;
  speechRateStd: number;
  disfluencyRateMean: number;
  disfluencyRateStd: number;
  isCalibrated: boolean;
}

export interface CognitiveLoadScore {
  eventIndex: number;
  biomarkers: VoiceBiomarkers;
  deviations: {
    f0Deviation: number;
    intensityDeviation: number;
    speechRateDeviation: number;
    f0RangeDeviation: number;
    disfluencyDeviation: number;
  };
  compositeLoad: number;
  confidence: number;
  calibrationStatus: CalibrationStatus;
}
