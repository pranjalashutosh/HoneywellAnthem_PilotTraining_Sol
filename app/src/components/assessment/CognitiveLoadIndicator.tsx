// T8.7 — Cognitive load timeline
// X: events, Y: composite load 0-100
// Biomarker sparklines, calibration badge, color gradient

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAssessmentStore } from '@/stores/assessment-store';

export function CognitiveLoadIndicator() {
  const cogLoadScores = useAssessmentStore((s) => s.currentEventCognitiveLoad);
  const baseline = useAssessmentStore((s) => s.cognitiveLoadBaseline);

  const calibrationLabel = baseline
    ? baseline.isCalibrated
      ? 'Calibrated'
      : `Partial (${baseline.sampleCount}/10)`
    : 'Uncalibrated';

  const calibrationColor = baseline?.isCalibrated
    ? 'text-anthem-green'
    : baseline
      ? 'text-anthem-amber'
      : 'text-anthem-text-muted';

  if (cogLoadScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="text-anthem-text-muted text-xs font-mono">
          No cognitive load data yet
        </span>
        <span className={`text-[10px] font-mono ${calibrationColor}`}>
          Baseline: {calibrationLabel}
        </span>
      </div>
    );
  }

  const data = cogLoadScores.map((score, i) => ({
    event: `E${i + 1}`,
    load: Math.round(score.compositeLoad),
    f0: score.deviations.f0Deviation,
    disfluency: score.deviations.disfluencyDeviation,
    speechRate: score.deviations.speechRateDeviation,
    confidence: score.confidence,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Calibration badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={[
              'w-2 h-2 rounded-full',
              baseline?.isCalibrated ? 'bg-anthem-green' : 'bg-anthem-amber',
            ].join(' ')}
          />
          <span className={`text-[10px] font-mono ${calibrationColor}`}>
            {calibrationLabel}
          </span>
        </div>
        <div className="text-[10px] font-mono text-anthem-text-muted">
          {cogLoadScores.length} events
        </div>
      </div>

      {/* Timeline chart */}
      <div className="w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-anthem-red)" stopOpacity={0.6} />
                <stop offset="50%" stopColor="var(--color-anthem-amber)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-anthem-green)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anthem-border)" />
            <XAxis
              dataKey="event"
              tick={{ fill: 'var(--color-anthem-text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--color-anthem-text-muted)', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-anthem-bg-secondary)',
                border: '1px solid var(--color-anthem-border)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
              itemStyle={{ color: 'var(--color-anthem-text-primary)' }}
              formatter={(value: number, name: string) => {
                if (name === 'Cognitive Load') return [`${value}`, name];
                return [`${value.toFixed(2)}σ`, name];
              }}
            />
            <ReferenceLine y={40} stroke="var(--color-anthem-green)" strokeDasharray="3 3" />
            <ReferenceLine y={70} stroke="var(--color-anthem-amber)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="load"
              name="Cognitive Load"
              stroke="var(--color-anthem-cyan)"
              fill="url(#loadGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Biomarker sparkline summary */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="rounded bg-anthem-bg-tertiary px-2 py-1">
          <div className="text-[9px] text-anthem-text-muted font-mono uppercase">F0 Dev</div>
          <div className="text-xs font-mono text-anthem-text-primary">
            {cogLoadScores.length > 0
              ? `${(cogLoadScores[cogLoadScores.length - 1]?.deviations.f0Deviation ?? 0).toFixed(2)}σ`
              : '--'}
          </div>
        </div>
        <div className="rounded bg-anthem-bg-tertiary px-2 py-1">
          <div className="text-[9px] text-anthem-text-muted font-mono uppercase">Disfluency</div>
          <div className="text-xs font-mono text-anthem-text-primary">
            {cogLoadScores.length > 0
              ? `${(cogLoadScores[cogLoadScores.length - 1]?.deviations.disfluencyDeviation ?? 0).toFixed(2)}σ`
              : '--'}
          </div>
        </div>
        <div className="rounded bg-anthem-bg-tertiary px-2 py-1">
          <div className="text-[9px] text-anthem-text-muted font-mono uppercase">Speech Rate</div>
          <div className="text-xs font-mono text-anthem-text-primary">
            {cogLoadScores.length > 0
              ? `${(cogLoadScores[cogLoadScores.length - 1]?.deviations.speechRateDeviation ?? 0).toFixed(2)}σ`
              : '--'}
          </div>
        </div>
      </div>
    </div>
  );
}
