// T3.5 — Frequency step up/down (0.025 MHz), direct entry via numpad

import { useCockpitStore } from '@/stores/cockpit-store';
import { useUIStore } from '@/stores/ui-store';

const STEP = 0.025;

export function FrequencyTuner() {
  const standbyFrequency = useCockpitStore((s) => s.standbyFrequency);
  const setFrequency = useCockpitStore((s) => s.setFrequency);
  const openNumpad = useUIStore((s) => s.openNumpad);

  const step = (direction: 1 | -1) => {
    const newValue = Math.round((standbyFrequency.value + direction * STEP) * 1000) / 1000;
    // VHF comm range: 118.000 – 136.975
    if (newValue >= 118.0 && newValue <= 136.975) {
      setFrequency({ ...standbyFrequency, value: newValue }, 'standby');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => step(-1)}
        className="min-h-[44px] min-w-[44px] rounded border border-anthem-border bg-anthem-bg-tertiary text-anthem-text-primary text-lg font-mono hover:border-anthem-cyan transition-colors active:scale-[0.97]"
      >
        −
      </button>
      <button
        onClick={() => openNumpad('standby-frequency')}
        className="min-h-[44px] px-4 rounded border border-anthem-border bg-anthem-bg-input text-anthem-text-secondary text-xs font-sans hover:border-anthem-cyan transition-colors"
      >
        Direct Entry
      </button>
      <button
        onClick={() => step(1)}
        className="min-h-[44px] min-w-[44px] rounded border border-anthem-border bg-anthem-bg-tertiary text-anthem-text-primary text-lg font-mono hover:border-anthem-cyan transition-colors active:scale-[0.97]"
      >
        +
      </button>
    </div>
  );
}
