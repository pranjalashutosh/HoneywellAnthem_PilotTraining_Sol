// T8.2 — CBTA radar chart
// 6 competencies (COM/WLM/SAW/KNO/PSD/FPM) 0-100
// Pilot cyan, population P25/P75 gray band

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CBTAScores, PopulationBaseline } from '@/types';

interface CBTARadarProps {
  scores: CBTAScores;
  population?: PopulationBaseline[];
}

const COMPETENCY_LABELS: Record<string, string> = {
  COM: 'Communication',
  WLM: 'Workload Mgmt',
  SAW: 'Situational Awareness',
  KNO: 'Knowledge',
  PSD: 'Problem Solving',
  FPM: 'Flight Path Mgmt',
};

export function CBTARadar({ scores, population }: CBTARadarProps) {
  const competencies = ['COM', 'WLM', 'SAW', 'KNO', 'PSD', 'FPM'] as const;

  const data = competencies.map((comp) => {
    const pop = population?.find((p) => p.competency === comp);
    return {
      competency: comp,
      label: COMPETENCY_LABELS[comp],
      pilot: scores[comp],
      p25: pop?.p25 ?? 0,
      p75: pop?.p75 ?? 0,
    };
  });

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--color-anthem-border)" />
          <PolarAngleAxis
            dataKey="competency"
            tick={{ fill: 'var(--color-anthem-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'var(--color-anthem-text-muted)', fontSize: 9 }}
            tickCount={5}
          />

          {/* Population P25-P75 band */}
          {population && population.length > 0 && (
            <>
              <Radar
                name="P75"
                dataKey="p75"
                stroke="none"
                fill="var(--color-anthem-text-muted)"
                fillOpacity={0.15}
              />
              <Radar
                name="P25"
                dataKey="p25"
                stroke="none"
                fill="var(--color-anthem-bg-primary)"
                fillOpacity={1}
              />
            </>
          )}

          {/* Pilot scores */}
          <Radar
            name="Pilot"
            dataKey="pilot"
            stroke="var(--color-anthem-cyan)"
            fill="var(--color-anthem-cyan)"
            fillOpacity={0.2}
            strokeWidth={2}
          />

          <Tooltip
            contentStyle={{
              background: 'var(--color-anthem-bg-secondary)',
              border: '1px solid var(--color-anthem-border)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
            itemStyle={{ color: 'var(--color-anthem-text-primary)' }}
            formatter={(value: number, name: string) => [
              `${value}`,
              name === 'Pilot' ? 'Pilot' : name,
            ]}
            labelFormatter={(label: string) =>
              COMPETENCY_LABELS[label] ?? label
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
