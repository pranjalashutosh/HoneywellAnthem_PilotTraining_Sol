// T5.8 — Grid of DrillCards

import { useScenarioStore } from '@/stores/scenario-store';
import { DrillCard } from './DrillCard';
import { PHASE_II_DRILL_IDS } from '@/data/drills';

export function DrillSelector() {
  const drills = useScenarioStore((s) => s.availableDrills);
  const selectDrill = useScenarioStore((s) => s.selectDrill);

  if (drills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--anthem-text-secondary)]">
        No drills available. Loading...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--anthem-text-primary)] mb-4">
        Training Drills
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {drills.map((drill) => (
          <DrillCard
            key={drill.id}
            drill={drill}
            disabled={PHASE_II_DRILL_IDS.has(drill.id)}
            onSelect={selectDrill}
          />
        ))}
      </div>
    </div>
  );
}
