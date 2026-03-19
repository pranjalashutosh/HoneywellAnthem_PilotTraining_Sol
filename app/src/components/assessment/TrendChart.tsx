// T8.5 — CBTA competency trend chart
// Line chart, 6 competencies over time with exponential decay

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAssessmentStore } from '@/stores/assessment-store';
import { applyExponentialDecay } from '@/lib/scoring';
import type { CBTACompetency } from '@/types';

const COMPETENCY_COLORS: Record<CBTACompetency, string> = {
  COM: 'var(--chart-1)',
  WLM: 'var(--chart-2)',
  SAW: 'var(--chart-3)',
  KNO: 'var(--chart-4)',
  PSD: 'var(--chart-5)',
  FPM: '#8b5cf6',
};

export function TrendChart() {
  const history = useAssessmentStore((s) => s.sessionHistory);

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-anthem-text-muted text-xs font-mono">
          Complete 2+ drills to see trends
        </span>
      </div>
    );
  }

  // Build rolling CBTA at each point in time
  const data = history.map((result, i) => {
    const priorHistory = history.slice(0, i).map((r) => r.cbta);
    const rolling = applyExponentialDecay(priorHistory, result.cbta);

    return {
      name: `#${i + 1}`,
      ...rolling,
    };
  });

  const competencies: CBTACompetency[] = ['COM', 'WLM', 'SAW', 'KNO', 'PSD', 'FPM'];

  return (
    <div className="w-full" style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
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
          {competencies.map((comp) => (
            <Line
              key={comp}
              type="monotone"
              dataKey={comp}
              stroke={COMPETENCY_COLORS[comp]}
              strokeWidth={2}
              dot={{ r: 3, fill: COMPETENCY_COLORS[comp] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
