// T7.1 — Assessment engine service
// Parses ASSESSMENT_RESULT messages, computes DrillMetrics,
// rolls up CBTA scores with exponential decay, writes to stores

import { useAssessmentStore } from '@/stores/assessment-store';
import { useScenarioStore } from '@/stores/scenario-store';
import {
  computeCBTAFromDrillMetrics,
  applyExponentialDecay,
  computeOverallScore,
} from '@/lib/scoring';
import type {
  ReadbackScore,
  CognitiveLoadScore,
  LatencyDecomposition,
  VoiceBiomarkers,
  CognitiveLoadBaseline,
  CBTAScores,
} from '@/types';

// ─── Manual Readback Score (keyboard fallback) ──────────────

/**
 * Create a placeholder ReadbackScore for keyboard-fallback mode.
 * scoringBasis 'manual' signals no voice data was used.
 */
export function createManualReadbackScore(success: boolean): ReadbackScore {
  return {
    rawAccuracy: success ? 100 : 0,
    confidenceAdjustedAccuracy: success ? 100 : 0,
    latency: {
      pilotReactionMs: 0,
      speechOnsetMs: 0,
      totalPilotLatencyMs: 0,
      networkLatencyMs: 0,
      deepgramProcessingMs: 0,
      atcAudioEndTimestamp: 0,
      pttPressTimestamp: 0,
      localSpeechOnsetTimestamp: 0,
      deepgramFirstWordStart: 0,
    },
    phraseology: success ? 80 : 0,
    callsignCorrect: success,
    transcriptConfidence: 0,
    estimatedWER: 0,
    scoringBasis: 'manual',
    uncertainElements: [],
    criticalElements: [],
  };
}

// ─── Assessment Result from Agent ────────────────────────────

interface AgentAssessmentPayload {
  readbackScore: {
    rawAccuracy: number;
    confidenceAdjustedAccuracy: number;
    scoringBasis: string;
    estimatedWER: number;
    confidenceWords: { word: string; confidence: number; start: number; end: number }[];
  } | null;
  cognitiveLoadScore: {
    eventIndex: number;
    biomarkers: Record<string, number>;
    deviations: Record<string, number>;
    compositeLoad: number;
    confidence: number;
    calibrationStatus: string;
  };
  latencyDecomposition: {
    pilotReactionMs: number;
    speechOnsetMs: number;
    totalPilotLatencyMs: number;
  };
  voiceBiomarkers: Record<string, number>;
}

// ─── Process Assessment Result ───────────────────────────────

/**
 * Called when ASSESSMENT_RESULT arrives from the LiveKit agent.
 * Converts the payload into typed scores and records them.
 */
export function processAssessmentResult(payload: AgentAssessmentPayload): void {
  const assessment = useAssessmentStore.getState();

  // Record cognitive load score
  const cogScore: CognitiveLoadScore = {
    eventIndex: payload.cognitiveLoadScore.eventIndex,
    biomarkers: payload.voiceBiomarkers as unknown as VoiceBiomarkers,
    deviations: {
      f0Deviation: payload.cognitiveLoadScore.deviations.f0Deviation ?? 0,
      intensityDeviation: payload.cognitiveLoadScore.deviations.intensityDeviation ?? 0,
      speechRateDeviation: payload.cognitiveLoadScore.deviations.speechRateDeviation ?? 0,
      f0RangeDeviation: payload.cognitiveLoadScore.deviations.f0RangeDeviation ?? 0,
      disfluencyDeviation: payload.cognitiveLoadScore.deviations.disfluencyDeviation ?? 0,
    },
    compositeLoad: payload.cognitiveLoadScore.compositeLoad,
    confidence: payload.cognitiveLoadScore.confidence,
    calibrationStatus: payload.cognitiveLoadScore.calibrationStatus as CognitiveLoadScore['calibrationStatus'],
  };
  assessment.recordCognitiveLoadScore(cogScore);

  // Record readback score if present
  if (payload.readbackScore) {
    const latency: LatencyDecomposition = {
      pilotReactionMs: payload.latencyDecomposition.pilotReactionMs,
      speechOnsetMs: payload.latencyDecomposition.speechOnsetMs,
      totalPilotLatencyMs: payload.latencyDecomposition.totalPilotLatencyMs,
      networkLatencyMs: 0,
      deepgramProcessingMs: 0,
      atcAudioEndTimestamp: 0,
      pttPressTimestamp: 0,
      localSpeechOnsetTimestamp: 0,
      deepgramFirstWordStart: 0,
    };

    const readback: ReadbackScore = {
      rawAccuracy: payload.readbackScore.rawAccuracy,
      confidenceAdjustedAccuracy: payload.readbackScore.confidenceAdjustedAccuracy,
      latency,
      phraseology: 80, // Default — full scoring requires NLP analysis
      callsignCorrect: true, // Default — full scoring requires callsign extraction
      transcriptConfidence:
        payload.readbackScore.confidenceWords.length > 0
          ? payload.readbackScore.confidenceWords.reduce((s, w) => s + w.confidence, 0) /
            payload.readbackScore.confidenceWords.length
          : 0,
      estimatedWER: payload.readbackScore.estimatedWER,
      scoringBasis: payload.readbackScore.scoringBasis as ReadbackScore['scoringBasis'],
      uncertainElements: [],
      criticalElements: [],
    };
    assessment.recordReadbackScore(readback);
  }
}

/**
 * Called when BASELINE_UPDATE arrives from the LiveKit agent.
 */
export function processBaselineUpdate(payload: {
  baselineData: Record<string, unknown>;
}): void {
  const data = payload.baselineData;
  const baseline: CognitiveLoadBaseline = {
    pilotId: data.pilotId as string,
    sampleCount: data.sampleCount as number,
    f0Mean: data.f0Mean as number,
    f0Std: data.f0Std as number,
    f0RangeMean: data.f0RangeMean as number,
    intensityMean: data.intensityMean as number,
    intensityStd: data.intensityStd as number,
    speechRateMean: data.speechRateMean as number,
    speechRateStd: data.speechRateStd as number,
    disfluencyRateMean: data.disfluencyRateMean as number,
    disfluencyRateStd: data.disfluencyRateStd as number,
    isCalibrated: data.isCalibrated as boolean,
  };

  useAssessmentStore.getState().setCognitiveLoadBaseline(baseline);
}

// ─── Finalize Drill ──────────────────────────────────────────

/**
 * Called at drill completion. Computes overall score, CBTA rollup,
 * and triggers server persistence.
 */
export function finalizeDrillAssessment(): void {
  const assessment = useAssessmentStore.getState();
  const scenario = useScenarioStore.getState();
  const metrics = assessment.currentDrillMetrics;
  const drill = scenario.activeDrill;

  if (!metrics || !drill) return;

  // Compute overall score
  const overallScore = computeOverallScore(metrics);

  // Compute CBTA for this drill
  const drillCBTA = computeCBTAFromDrillMetrics(metrics, drill.competencies);

  // Apply exponential decay across history
  const historyCBTA = assessment.sessionHistory.map((r) => r.cbta);
  const rolledCBTA = applyExponentialDecay(historyCBTA, drillCBTA);

  // Update store
  assessment.setCBTA(rolledCBTA);

  // Update metrics with overall score
  if (assessment.currentDrillMetrics) {
    const store = useAssessmentStore.getState();
    if (store.currentDrillMetrics) {
      // Use finalize which sets completedAt
      assessment.finalizeDrillMetrics();
      // Set the overall score via direct state update
      useAssessmentStore.setState((state) => ({
        currentDrillMetrics: state.currentDrillMetrics
          ? { ...state.currentDrillMetrics, overallScore }
          : null,
      }));
    }
  }
}

/**
 * Get the current scoring summary for display in DrillOutcome.
 */
export function getScoringFlags(): {
  hasAbstained: boolean;
  hasUncertain: boolean;
  abstainedCount: number;
  uncertainCount: number;
} {
  const metrics = useAssessmentStore.getState().currentDrillMetrics;
  if (!metrics) {
    return { hasAbstained: false, hasUncertain: false, abstainedCount: 0, uncertainCount: 0 };
  }

  const abstainedCount = metrics.readbackScores.filter(
    (s) => s.scoringBasis === 'abstained',
  ).length;
  const uncertainCount = metrics.readbackScores.filter(
    (s) => s.scoringBasis === 'uncertain',
  ).length;

  return {
    hasAbstained: abstainedCount > 0,
    hasUncertain: uncertainCount > 0,
    abstainedCount,
    uncertainCount,
  };
}

/**
 * Get the latest CBTA scores for the drill that just completed.
 */
export function getDrillCBTA(): CBTAScores | null {
  const assessment = useAssessmentStore.getState();
  const scenario = useScenarioStore.getState();
  const metrics = assessment.currentDrillMetrics;
  const drill = scenario.activeDrill;

  if (!metrics || !drill) return null;
  return computeCBTAFromDrillMetrics(metrics, drill.competencies);
}
