// T3.4 — Active/standby frequencies with swap button

import { useCockpitStore } from '@/stores/cockpit-store';
import { FrequencyTuner } from './FrequencyTuner';

export function RadiosPanel() {
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const standbyFrequency = useCockpitStore((s) => s.standbyFrequency);
  const swapFrequencies = useCockpitStore((s) => s.swapFrequencies);

  return (
    <div className="flex flex-col gap-6">
      {/* Active frequency */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-anthem-text-muted font-sans">
          Active
        </span>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono text-anthem-green font-bold tracking-wider">
            {activeFrequency.value.toFixed(3)}
          </span>
          <span className="text-xs text-anthem-text-secondary font-sans">
            {activeFrequency.label}
          </span>
        </div>
      </div>

      {/* Swap button */}
      <button
        onClick={swapFrequencies}
        className="self-start min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-anthem-cyan text-anthem-cyan text-sm font-sans font-medium transition-all hover:bg-anthem-bg-tertiary active:scale-[0.97]"
      >
        ⇅ Swap
      </button>

      {/* Standby frequency with tuner */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-anthem-text-muted font-sans">
          Standby
        </span>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono text-anthem-text-primary tracking-wider">
            {standbyFrequency.value.toFixed(3)}
          </span>
          <span className="text-xs text-anthem-text-secondary font-sans">
            {standbyFrequency.label}
          </span>
        </div>
        <FrequencyTuner />
      </div>
    </div>
  );
}
