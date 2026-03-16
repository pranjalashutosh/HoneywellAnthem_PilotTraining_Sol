// T2.6 — Cockpit two-panel layout: flight plan + radios, mode bar top, voice panel right

import { AnthemCard } from '@/components/shared/AnthemCard';
import { useUIStore } from '@/stores/ui-store';

export function CockpitShell() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <div className="flex flex-col h-full">
      {/* Mode selection bar placeholder — replaced in Phase 3 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-anthem-border">
        <span className="text-xs text-anthem-text-muted uppercase tracking-wider">Mode:</span>
        <span className="text-xs font-mono text-anthem-cyan">NAV</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main cockpit area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex items-center gap-1 px-4 pt-3">
            <button
              onClick={() => setActivePanel('flight-plan')}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors min-h-[36px]',
                activePanel === 'flight-plan'
                  ? 'bg-anthem-bg-tertiary border-anthem-border text-anthem-cyan'
                  : 'bg-anthem-bg-secondary border-transparent text-anthem-text-muted hover:text-anthem-text-secondary',
              ].join(' ')}
            >
              Flight Plan
            </button>
            <button
              onClick={() => setActivePanel('radios')}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors min-h-[36px]',
                activePanel === 'radios'
                  ? 'bg-anthem-bg-tertiary border-anthem-border text-anthem-cyan'
                  : 'bg-anthem-bg-secondary border-transparent text-anthem-text-muted hover:text-anthem-text-secondary',
              ].join(' ')}
            >
              Radios
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-auto p-4">
            {activePanel === 'flight-plan' ? (
              <AnthemCard title="Flight Plan">
                <p className="text-anthem-text-muted text-sm">
                  Flight plan panel — implemented in Phase 3
                </p>
              </AnthemCard>
            ) : (
              <AnthemCard title="Radios">
                <p className="text-anthem-text-muted text-sm">
                  Radios panel — implemented in Phase 3
                </p>
              </AnthemCard>
            )}
          </div>
        </div>

        {/* Voice panel area (right side) — populated in Phase 6 */}
        <div className="w-72 border-l border-anthem-border bg-anthem-bg-secondary flex flex-col">
          <div className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-anthem-text-secondary mb-3">
              Voice
            </h3>
            <p className="text-anthem-text-muted text-xs">
              Voice panel — implemented in Phase 6
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
