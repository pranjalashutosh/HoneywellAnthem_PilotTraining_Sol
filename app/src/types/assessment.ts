// T1.3 — Assessment domain types

import type { LatencyDecomposition } from './latency';
import type { CognitiveLoadScore } from './cognitive-load';

export type CBTACompetency = 'COM' | 'WLM' | 'SAW' | 'KNO' | 'PSD' | 'FPM';

export type ScoringBasis = 'confident' | 'uncertain' | 'abstained';

export interface UncertainElement {
  element: string;
  transcribedAs: string;
  confidence: number;
  flaggedForReview: boolean;
}

export interface ReadbackScore {
  rawAccuracy: number;
  confidenceAdjustedAccuracy: number;
  latency: LatencyDecomposition;
  phraseology: number;
  callsignCorrect: boolean;
  transcriptConfidence: number;
  estimatedWER: number;
  scoringBasis: ScoringBasis;
  uncertainElements: UncertainElement[];
  criticalElements: {
    element: string;
    matched: boolean;
    weight: number;
    matchConfidence: number;
    discounted: boolean;
  }[];
}

export interface DecisionScore {
  correct: boolean;
  timeToDecision: number;
  timedOut: boolean;
  optionSelected: string;
}

export interface TrapScore {
  detected: boolean;
  timeToReject: number;
  acceptedWrong: boolean;
}

export interface TouchScore {
  actionCorrect: boolean;
  timeToComplete: number;
  timedOut: boolean;
  actionPerformed: string;
  expectedAction: string;
}

export interface DrillMetrics {
  drillId: string;
  readbackScores: ReadbackScore[];
  decisionScores: DecisionScore[];
  trapScores: TrapScore[];
  touchScores: TouchScore[];
  cognitiveLoadScores: CognitiveLoadScore[];
  overallScore: number;
  completedAt: number;
}

export interface DrillResult {
  id: string;
  pilotId: string;
  drillId: string;
  metrics: DrillMetrics;
  cbta: CBTAScores;
  sessionId: string;
  timestamp: number;
  instructorOverride: Record<string, unknown> | null;
}

export type CBTAScores = Record<CBTACompetency, number>;
