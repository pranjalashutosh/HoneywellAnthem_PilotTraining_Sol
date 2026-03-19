// T8.3 — Session summary KPI cards
// Drills completed, avg readback accuracy, avg cognitive load,
// avg latency, calibration status, estimated avg WER

import { useAssessmentStore } from '@/stores/assessment-store';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function KPICard({ label, value, sub, color = 'text-anthem-cyan' }: KPICardProps) {
  return (
    <div className="rounded-lg border border-anthem-border bg-anthem-bg-tertiary p-3">
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-anthem-text-secondary uppercase mt-1">{label}</div>
      {sub && (
        <div className="text-[10px] text-anthem-text-muted mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function SessionSummary() {
  const history = useAssessmentStore((s) => s.sessionHistory);
  const baseline = useAssessmentStore((s) => s.cognitiveLoadBaseline);

  const drillCount = history.length;

  // Average readback accuracy from all drills
  const allReadbacks = history.flatMap((r) =>
    r.metrics.readbackScores.filter((s) => s.scoringBasis !== 'abstained'),
  );
  const avgAccuracy =
    allReadbacks.length > 0
      ? allReadbacks.reduce((s, r) => s + r.confidenceAdjustedAccuracy, 0) /
        allReadbacks.length
      : 0;

  // Average cognitive load
  const allCogLoad = history.flatMap((r) =>
    r.metrics.cognitiveLoadScores.filter(
      (s) => s.calibrationStatus !== 'uncalibrated',
    ),
  );
  const avgCogLoad =
    allCogLoad.length > 0
      ? allCogLoad.reduce((s, c) => s + c.compositeLoad, 0) / allCogLoad.length
      : 0;

  // Average latency
  const allLatencies = allReadbacks
    .filter((r) => r.latency)
    .map((r) => r.latency.totalPilotLatencyMs);
  const avgLatency =
    allLatencies.length > 0
      ? allLatencies.reduce((s, l) => s + l, 0) / allLatencies.length
      : 0;

  // Average WER
  const avgWER =
    allReadbacks.length > 0
      ? allReadbacks.reduce((s, r) => s + r.estimatedWER, 0) / allReadbacks.length
      : 0;

  // Calibration status
  const calibrationLabel = baseline
    ? baseline.isCalibrated
      ? 'Calibrated'
      : `Partial (${baseline.sampleCount}/10)`
    : 'Not Started';
  const calibrationColor = baseline?.isCalibrated
    ? 'text-anthem-green'
    : baseline
      ? 'text-anthem-amber'
      : 'text-anthem-text-muted';

  return (
    <div className="grid grid-cols-3 gap-3">
      <KPICard
        label="Drills Completed"
        value={String(drillCount)}
      />
      <KPICard
        label="Avg Readback"
        value={avgAccuracy > 0 ? `${avgAccuracy.toFixed(0)}%` : '--'}
        color={avgAccuracy >= 80 ? 'text-anthem-green' : avgAccuracy >= 60 ? 'text-anthem-amber' : 'text-anthem-cyan'}
      />
      <KPICard
        label="Avg Cognitive Load"
        value={avgCogLoad > 0 ? avgCogLoad.toFixed(0) : '--'}
        sub="0-100 scale"
        color={avgCogLoad < 40 ? 'text-anthem-green' : avgCogLoad < 70 ? 'text-anthem-amber' : 'text-anthem-red'}
      />
      <KPICard
        label="Avg Latency"
        value={avgLatency > 0 ? `${(avgLatency / 1000).toFixed(1)}s` : '--'}
        color={avgLatency < 1500 ? 'text-anthem-green' : avgLatency < 2500 ? 'text-anthem-amber' : 'text-anthem-red'}
      />
      <KPICard
        label="Calibration"
        value={calibrationLabel}
        color={calibrationColor}
      />
      <KPICard
        label="Est. WER"
        value={avgWER > 0 ? `${(avgWER * 100).toFixed(1)}%` : '--'}
        sub="Word Error Rate"
        color={avgWER < 0.08 ? 'text-anthem-green' : avgWER < 0.15 ? 'text-anthem-amber' : 'text-anthem-red'}
      />
    </div>
  );
}
