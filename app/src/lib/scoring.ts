// T7.2 — CBTA scoring, exponential decay, WER estimation, scoring basis

import type {
  DrillMetrics,
  CBTAScores,
  CBTACompetency,
  ScoringBasis,
  CognitiveLoadScore,
} from '@/types';

const DECAY_FACTOR = 0.95;
const MAX_WINDOW = 20;

// ─── CBTA from DrillMetrics ──────────────────────────────────

/**
 * Compute CBTA competency scores from a single drill's metrics.
 *
 * COM: readback accuracy (70%) + phraseology (15%) + callsign (10%) - latency penalty
 * WLM: task completion (40%) + cognitive load inverted (40%) + ordering (20%)
 * SAW: decision correctness (50%) + trap detection (30%) + cog load context (20%)
 * KNO: decision correctness (60%) + trap detection (30%) + procedure (10%)
 * PSD: decision correctness (60%) + time-to-decision (30%) + clarification (10%)
 * FPM: touch scores for flight path actions
 */
export function computeCBTAFromDrillMetrics(
  metrics: DrillMetrics,
  drillCompetencies: CBTACompetency[],
): CBTAScores {
  const scores: CBTAScores = { COM: 0, WLM: 0, SAW: 0, KNO: 0, PSD: 0, FPM: 0 };

  if (drillCompetencies.includes('COM')) {
    scores.COM = computeCOM(metrics);
  }
  if (drillCompetencies.includes('WLM')) {
    scores.WLM = computeWLM(metrics);
  }
  if (drillCompetencies.includes('SAW')) {
    scores.SAW = computeSAW(metrics);
  }
  if (drillCompetencies.includes('KNO')) {
    scores.KNO = computeKNO(metrics);
  }
  if (drillCompetencies.includes('PSD')) {
    scores.PSD = computePSD(metrics);
  }
  if (drillCompetencies.includes('FPM')) {
    scores.FPM = computeFPM(metrics);
  }

  return scores;
}

function computeCOM(m: DrillMetrics): number {
  const valid = m.readbackScores.filter((s) => s.scoringBasis !== 'abstained');
  if (valid.length === 0) return 50;

  const avgAcc = avg(valid.map((s) => s.confidenceAdjustedAccuracy));
  const avgPhrase = avg(valid.map((s) => s.phraseology));
  const callsignPct = valid.filter((s) => s.callsignCorrect).length / valid.length;

  let com = avgAcc * 0.7 + avgPhrase * 0.15 + callsignPct * 100 * 0.1;

  // Latency penalty
  const avgLatency = avg(valid.map((s) => s.latency.totalPilotLatencyMs));
  if (avgLatency > 2500) com -= 10;
  else if (avgLatency > 1500) com -= 5;

  return clamp(com);
}

function computeWLM(m: DrillMetrics): number {
  const touchTime =
    m.touchScores.length > 0
      ? 100 - Math.min(100, avg(m.touchScores.map((t) => t.timeToComplete)) / 100)
      : 50;

  const cogLoadInv =
    m.cognitiveLoadScores.length > 0 ? 100 - avgCalibrated(m.cognitiveLoadScores) : 50;

  return clamp(touchTime * 0.4 + cogLoadInv * 0.4 + 50 * 0.2);
}

function computeSAW(m: DrillMetrics): number {
  const decisionPct =
    m.decisionScores.length > 0
      ? (m.decisionScores.filter((d) => d.correct).length / m.decisionScores.length) * 100
      : 50;

  let trapBonus = 0;
  if (m.trapScores.length > 0) {
    const detected = m.trapScores.filter((t) => t.detected).length;
    const accepted = m.trapScores.filter((t) => t.acceptedWrong).length;
    trapBonus = (detected / m.trapScores.length) * 100 - accepted * 15;
  }

  const cogContext =
    m.cognitiveLoadScores.length > 0 ? 100 - avgCalibrated(m.cognitiveLoadScores) : 50;

  return clamp(decisionPct * 0.5 + trapBonus * 0.3 + cogContext * 0.2);
}

function computeKNO(m: DrillMetrics): number {
  const decisionPct =
    m.decisionScores.length > 0
      ? (m.decisionScores.filter((d) => d.correct).length / m.decisionScores.length) * 100
      : 50;

  let trapBonus = 0;
  if (m.trapScores.length > 0) {
    const detected = m.trapScores.filter((t) => t.detected).length;
    const accepted = m.trapScores.filter((t) => t.acceptedWrong).length;
    trapBonus = (detected / m.trapScores.length) * 100 - accepted * 15;
  }

  return clamp(decisionPct * 0.6 + trapBonus * 0.3 + 50 * 0.1);
}

function computePSD(m: DrillMetrics): number {
  const decisionPct =
    m.decisionScores.length > 0
      ? (m.decisionScores.filter((d) => d.correct).length / m.decisionScores.length) * 100
      : 50;

  let timePenalty = 0;
  if (m.decisionScores.length > 0) {
    const avgTime = avg(m.decisionScores.map((d) => d.timeToDecision));
    if (avgTime > 10000) timePenalty = 10;
  }

  return clamp(decisionPct * 0.6 + (100 - timePenalty) * 0.3 + 50 * 0.1);
}

function computeFPM(m: DrillMetrics): number {
  let touchPct = 50;
  if (m.touchScores.length > 0) {
    touchPct =
      (m.touchScores.filter((t) => t.actionCorrect).length / m.touchScores.length) * 100;
  }

  let interactivePct = 50;
  if (m.interactiveCockpitScores.length > 0) {
    const met = m.interactiveCockpitScores.filter((s) => s.allConditionsMet).length;
    interactivePct = (met / m.interactiveCockpitScores.length) * 100;

    // Time penalty: slow responses reduce score
    const avgTime = avg(m.interactiveCockpitScores.map((s) => s.totalTimeMs));
    if (avgTime > 30000) interactivePct -= 10;

    // Escalation penalty
    if (m.interactiveCockpitScores.some((s) => s.escalationTriggered)) {
      interactivePct -= 5;
    }
  }

  // Use whichever data is available; prefer interactive if both exist
  if (m.touchScores.length > 0 && m.interactiveCockpitScores.length > 0) {
    return clamp(touchPct * 0.4 + interactivePct * 0.6);
  }
  if (m.interactiveCockpitScores.length > 0) return clamp(interactivePct);
  if (m.touchScores.length > 0) return clamp(touchPct);
  return 50;
}

// ─── Exponential Decay Rolling Average ───────────────────────

/**
 * Apply exponential decay (0.95^(N-i)) across historical CBTA scores.
 * Newest result gets weight 1.0, oldest in window gets ~0.358.
 */
export function applyExponentialDecay(
  history: CBTAScores[],
  current: CBTAScores,
): CBTAScores {
  const all = [...history.slice(-MAX_WINDOW + 1), current];
  const n = all.length;
  const competencies: CBTACompetency[] = ['COM', 'WLM', 'SAW', 'KNO', 'PSD', 'FPM'];

  const result: CBTAScores = { COM: 0, WLM: 0, SAW: 0, KNO: 0, PSD: 0, FPM: 0 };

  for (const comp of competencies) {
    let weightedSum = 0;
    let weightTotal = 0;

    for (let i = 0; i < n; i++) {
      const entry = all[i];
      if (!entry) continue;
      const weight = Math.pow(DECAY_FACTOR, n - 1 - i);
      weightedSum += entry[comp] * weight;
      weightTotal += weight;
    }

    result[comp] = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  }

  return result;
}

// ─── WER Estimation ──────────────────────────────────────────

/**
 * Estimate WER from per-word confidence scores.
 * WER = mean(1 - confidence_i)
 */
export function computeEstimatedWER(
  wordConfidences: { confidence: number }[],
): number {
  if (wordConfidences.length === 0) return 0;
  const sum = wordConfidences.reduce((acc, w) => acc + (1 - w.confidence), 0);
  return sum / wordConfidences.length;
}

// ─── Scoring Basis ───────────────────────────────────────────

/**
 * Determine scoring basis from transcript confidence.
 *
 * - 'confident': mean >= 0.50 AND <= 40% low words
 * - 'uncertain': below confident threshold
 * - 'abstained': mean < 0.35 OR > 60% low words
 */
export function determineScoringBasis(
  wordConfidences: { confidence: number }[],
): ScoringBasis {
  if (wordConfidences.length === 0) return 'abstained';

  const mean =
    wordConfidences.reduce((sum, w) => sum + w.confidence, 0) / wordConfidences.length;
  const lowCount = wordConfidences.filter((w) => w.confidence < 0.6).length;
  const lowPct = lowCount / wordConfidences.length;

  if (mean < 0.35 || lowPct > 0.6) return 'abstained';
  if (mean < 0.5 || lowPct > 0.4) return 'uncertain';
  return 'confident';
}

// ─── Overall Score ───────────────────────────────────────────

/**
 * Compute overall drill score (0-100).
 * Weights: readback 40%, decision 30%, trap 15%, touch 15%.
 */
export function computeOverallScore(metrics: DrillMetrics): number {
  let total = 0;
  let weight = 0;

  const validReadbacks = metrics.readbackScores.filter(
    (s) => s.scoringBasis !== 'abstained',
  );
  if (validReadbacks.length > 0) {
    const avgReadback = avg(validReadbacks.map((r) => r.confidenceAdjustedAccuracy));
    total += avgReadback * 0.4;
    weight += 0.4;
  }

  if (metrics.decisionScores.length > 0) {
    const correctPct =
      (metrics.decisionScores.filter((d) => d.correct).length /
        metrics.decisionScores.length) *
      100;
    total += correctPct * 0.3;
    weight += 0.3;
  }

  if (metrics.trapScores.length > 0) {
    const detectedPct =
      (metrics.trapScores.filter((t) => t.detected).length / metrics.trapScores.length) *
      100;
    total += detectedPct * 0.15;
    weight += 0.15;
  }

  if (metrics.touchScores.length > 0) {
    const correctPct =
      (metrics.touchScores.filter((t) => t.actionCorrect).length /
        metrics.touchScores.length) *
      100;
    total += correctPct * 0.15;
    weight += 0.15;
  }

  if (metrics.interactiveCockpitScores.length > 0) {
    const metPct =
      (metrics.interactiveCockpitScores.filter((s) => s.allConditionsMet).length /
        metrics.interactiveCockpitScores.length) *
      100;
    total += metPct * 0.15;
    weight += 0.15;
  }

  return weight > 0 ? Math.round(total / weight) : 0;
}

// ─── Helpers ─────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function avgCalibrated(scores: CognitiveLoadScore[]): number {
  const calibrated = scores.filter((s) => s.calibrationStatus !== 'uncalibrated');
  if (calibrated.length === 0) return 50;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of calibrated) {
    weightedSum += s.compositeLoad * s.confidence;
    weightTotal += s.confidence;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 50;
}
