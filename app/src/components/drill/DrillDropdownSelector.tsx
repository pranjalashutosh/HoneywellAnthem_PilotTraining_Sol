// Drill selection via dropdown with detail panel and start button.
// Replaces the card grid (DrillSelector) with a more compact layout.

import { useState } from 'react';
import { useScenarioStore } from '@/stores/scenario-store';
import { AnthemButton } from '@/components/shared/AnthemButton';
import { PHASE_II_DRILL_IDS } from '@/data/drills';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'border-green-500 text-green-400 bg-green-500/10',
  intermediate: 'border-amber-500 text-amber-400 bg-amber-500/10',
  advanced: 'border-red-500 text-red-400 bg-red-500/10',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  atc_instruction: 'ATC Communication',
  decision_point: 'Decision Point',
  predict_suggestion: 'PilotPredict Check',
  cockpit_action: 'Cockpit Action',
  interactive_cockpit: 'Interactive Cockpit',
};

export function DrillDropdownSelector() {
  const drills = useScenarioStore((s) => s.availableDrills);
  const selectDrill = useScenarioStore((s) => s.selectDrill);
  const [selectedId, setSelectedId] = useState<string>(drills[0]?.id ?? '');

  const selectedDrill = drills.find((d) => d.id === selectedId);

  if (drills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--anthem-text-secondary)]">
        No drills available. Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
      <h2 className="text-lg font-semibold text-[var(--anthem-text-primary)] mb-6">
        Training Drills
      </h2>

      {/* Dropdown */}
      <div className="mb-6">
        <label className="block text-xs text-[var(--anthem-cyan)] font-mono uppercase tracking-wider mb-2">
          Select Drill
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-[var(--anthem-border)] bg-[var(--anthem-bg-tertiary)] text-[var(--anthem-text-primary)] px-4 py-3 text-sm font-medium appearance-none cursor-pointer hover:border-[var(--anthem-cyan)] focus:border-[var(--anthem-cyan)] focus:outline-none transition-colors"
        >
          {drills.map((drill) => (
            <option key={drill.id} value={drill.id}>
              {drill.title}{PHASE_II_DRILL_IDS.has(drill.id) ? ' (Phase II)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Detail panel */}
      {selectedDrill && (
        <div className="rounded-lg border border-[var(--anthem-border)] bg-[var(--anthem-bg-tertiary)] p-5 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--anthem-text-primary)] mb-1">
                {selectedDrill.title}
              </h3>
              <p className="text-sm text-[var(--anthem-text-secondary)]">
                {selectedDrill.description}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {PHASE_II_DRILL_IDS.has(selectedDrill.id) && (
                <span className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-400/90 tracking-wide">
                  PHASE II
                </span>
              )}
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${DIFFICULTY_COLORS[selectedDrill.difficulty] ?? ''}`}
              >
                {selectedDrill.difficulty}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--anthem-border)]">
            <div className="flex flex-wrap gap-1.5">
              {selectedDrill.competencies.map((comp) => (
                <span
                  key={comp}
                  className="rounded bg-[var(--anthem-cyan)]/10 px-2 py-0.5 text-[10px] font-mono text-[var(--anthem-cyan)]"
                >
                  {comp}
                </span>
              ))}
            </div>
            <span className="text-xs text-[var(--anthem-text-secondary)] font-mono ml-auto">
              {Math.ceil(selectedDrill.duration / 60)} min
            </span>
          </div>

          {/* Event list */}
          <div className="mb-6">
            <div className="text-xs text-[var(--anthem-text-secondary)] font-mono uppercase tracking-wider mb-3">
              Events ({selectedDrill.events.length})
            </div>
            <div className="space-y-2">
              {selectedDrill.events.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded bg-[var(--anthem-bg-secondary)] px-3 py-2"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--anthem-cyan)]/20 text-[var(--anthem-cyan)] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs text-[var(--anthem-text-primary)]">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ATC context */}
          <div className="mb-6 text-xs text-[var(--anthem-text-secondary)]">
            <span className="font-mono text-[var(--anthem-cyan)]">
              {selectedDrill.atcContext.facility}
            </span>
            {' — '}
            {selectedDrill.atcContext.callsign}
          </div>

          {/* Start button */}
          <div className="mt-auto">
            {PHASE_II_DRILL_IDS.has(selectedDrill.id) ? (
              <div className="w-full text-center rounded-lg py-3 text-sm font-semibold tracking-wide"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: 'rgba(167,139,250,0.7)',
                }}
              >
                Coming in Phase II
              </div>
            ) : (
              <AnthemButton
                variant="primary"
                className="w-full"
                onClick={() => selectDrill(selectedDrill.id)}
              >
                Start Drill
              </AnthemButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
