// T8.4 — Drill history bar chart
// Per-drill scores segmented (readback/decision/touch), latency bars

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAssessmentStore } from '@/stores/assessment-store';

export function DrillHistory() {
  const history = useAssessmentStore((s) => s.sessionHistory);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-anthem-text-muted text-xs font-mono">
          No drill history yet
        </span>
      </div>
    );
  }

  const data = history.map((result, i) => {
    const m = result.metrics;

    const readbackAvg =
      m.readbackScores.length > 0
        ? m.readbackScores
            .filter((s) => s.scoringBasis !== 'abstained')
            .reduce((s, r) => s + r.confidenceAdjustedAccuracy, 0) /
          Math.max(1, m.readbackScores.filter((s) => s.scoringBasis !== 'abstained').length)
        : 0;

    const decisionAvg =
      m.decisionScores.length > 0
        ? (m.decisionScores.filter((d) => d.correct).length /
            m.decisionScores.length) *
          100
        : 0;

    const touchAvg =
      m.touchScores.length > 0
        ? (m.touchScores.filter((t) => t.actionCorrect).length /
            m.touchScores.length) *
          100
        : 0;

    return {
      name: `#${i + 1}`,
      drillId: result.drillId.split('-').slice(0, 2).join('-'),
      readback: Math.round(readbackAvg),
      decision: Math.round(decisionAvg),
      touch: Math.round(touchAvg),
      overall: result.metrics.overallScore,
    };
  });

  return (
    <div className="w-full" style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anthem-border)" />
          <XAxis
            dataKey="name"
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
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
          />
          <Bar dataKey="readback" name="Readback" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="decision" name="Decision" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="touch" name="Touch" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
