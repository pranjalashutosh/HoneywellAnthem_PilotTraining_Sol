// T8.6 — Cohort comparison chart
// Grouped bar chart, pilot vs P25/P50/P75
// Filter by accent group/experience level

import { useEffect, useState } from 'react';
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
import { usePilotStore } from '@/stores/pilot-store';
import * as api from '@/services/api-client';
import type { PopulationBaseline, CBTACompetency } from '@/types';

const COMPETENCY_ORDER: CBTACompetency[] = ['COM', 'WLM', 'SAW', 'KNO', 'PSD', 'FPM'];

export function CohortCompare() {
  const cbta = useAssessmentStore((s) => s.cbta);
  const pilot = usePilotStore((s) => s.activePilot);
  const [population, setPopulation] = useState<PopulationBaseline[]>([]);

  useEffect(() => {
    if (!pilot) return;

    api
      .fetchPopulationBaseline(pilot.accentGroup, pilot.experienceLevel)
      .then(setPopulation)
      .catch((err) => console.warn('[CohortCompare] Failed to load population:', err));
  }, [pilot]);

  const data = COMPETENCY_ORDER.map((comp) => {
    const pop = population.find((p) => p.competency === comp);
    return {
      competency: comp,
      pilot: cbta[comp],
      p25: pop?.p25 ?? 0,
      p50: pop?.p50 ?? 0,
      p75: pop?.p75 ?? 0,
    };
  });

  const hasData = population.length > 0 || Object.values(cbta).some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-anthem-text-muted text-xs font-mono">
          No cohort data available
        </span>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={1} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anthem-border)" />
          <XAxis
            dataKey="competency"
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
          <Bar dataKey="p25" name="P25" fill="var(--color-anthem-text-muted)" opacity={0.4} radius={[2, 2, 0, 0]} />
          <Bar dataKey="p50" name="P50" fill="var(--color-anthem-text-muted)" opacity={0.6} radius={[2, 2, 0, 0]} />
          <Bar dataKey="p75" name="P75" fill="var(--color-anthem-text-muted)" opacity={0.8} radius={[2, 2, 0, 0]} />
          <Bar dataKey="pilot" name="Pilot" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
