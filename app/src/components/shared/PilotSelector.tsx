// T2.4 — Pilot selector dropdown with inline create

import { useState, useEffect } from 'react';
import { usePilotStore } from '@/stores/pilot-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { saveActivePilotId, loadActivePilotId } from '@/lib/storage';

export function PilotSelector() {
  const pilots = usePilotStore((s) => s.pilots);
  const activePilot = usePilotStore((s) => s.activePilot);
  const selectPilot = usePilotStore((s) => s.selectPilot);
  const createPilot = usePilotStore((s) => s.createPilot);
  const loadPilots = usePilotStore((s) => s.loadPilots);
  const loadAssessment = useAssessmentStore((s) => s.loadFromServer);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Load pilots on mount and restore active pilot selection
  useEffect(() => {
    void (async () => {
      await loadPilots();
      const savedId = loadActivePilotId();
      if (savedId) {
        const loaded = usePilotStore.getState().pilots;
        const match = loaded.find((p) => p.id === savedId);
        if (match) {
          selectPilot(savedId);
          void loadAssessment(savedId);
        }
      }
    })();
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPilot({
      name: newName.trim(),
      accentGroup: 'native_us',
      experienceLevel: 'mid_time',
      totalHours: 1000,
      anthemHours: 0,
      previousPlatform: 'Primus Epic',
    });
    const newPilot = usePilotStore.getState().activePilot;
    if (newPilot) {
      saveActivePilotId(newPilot.id);
      void loadAssessment(newPilot.id);
    }
    setNewName('');
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleCreate();
    if (e.key === 'Escape') setIsCreating(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isCreating ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pilot name"
            className="h-8 px-2 rounded border border-anthem-border bg-anthem-bg-input text-anthem-text-primary text-xs font-sans placeholder:text-anthem-text-muted focus:outline-none focus:border-anthem-cyan w-32"
          />
          <button
            onClick={() => void handleCreate()}
            className="h-8 px-2 rounded border border-anthem-green text-anthem-green text-xs hover:bg-anthem-bg-tertiary"
          >
            Add
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="h-8 px-2 rounded border border-anthem-border text-anthem-text-muted text-xs hover:bg-anthem-bg-tertiary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <select
            value={activePilot?.id ?? ''}
            onChange={(e) => {
              selectPilot(e.target.value);
              saveActivePilotId(e.target.value);
              void loadAssessment(e.target.value);
            }}
            className="h-8 px-2 rounded border border-anthem-border bg-anthem-bg-input text-anthem-text-primary text-xs font-sans focus:outline-none focus:border-anthem-cyan cursor-pointer"
          >
            <option value="" disabled>
              Select Pilot
            </option>
            {pilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreating(true)}
            className="h-8 px-2 rounded border border-anthem-cyan-dim text-anthem-cyan-dim text-xs hover:text-anthem-cyan hover:border-anthem-cyan transition-colors"
          >
            + New
          </button>
        </>
      )}
    </div>
  );
}
