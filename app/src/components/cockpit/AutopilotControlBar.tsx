// Flight Control Panel — mode buttons (VNAV/FLCH/VS/ALT/AP/AUTO) + altitude display
// Adapted from prototype's top control bar, using cockpit-store instead of local state.

import { useCockpitStore } from '@/stores/cockpit-store';
import type { CockpitMode } from '@/types';

interface AutopilotControlBarProps {
  onModeChange?: (mode: CockpitMode) => void;
}

const MODE_BUTTONS: { mode: CockpitMode; label: string }[] = [
  { mode: 'FLCH', label: 'FLC' },
  { mode: 'VNAV', label: 'VNAV' },
  { mode: 'ALT', label: 'ALT' },
  { mode: 'VS', label: 'V/S' },
];

export function AutopilotControlBar({ onModeChange }: AutopilotControlBarProps) {
  const selectedMode = useCockpitStore((s) => s.selectedMode);
  const autopilot = useCockpitStore((s) => s.autopilot);
  const autoThrottle = useCockpitStore((s) => s.autoThrottle);
  const desiredAltitude = useCockpitStore((s) => s.desiredAltitude);
  const speed = useCockpitStore((s) => s.speed);
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const setMode = useCockpitStore((s) => s.setMode);
  const setAutopilot = useCockpitStore((s) => s.setAutopilot);
  const setAutoThrottle = useCockpitStore((s) => s.setAutoThrottle);

  const handleModeClick = (mode: CockpitMode) => {
    setMode(mode);
    onModeChange?.(mode);
  };

  const activeClass =
    'bg-green-500/90 text-black border-green-400 shadow-green-500/30 shadow-md';
  const inactiveClass =
    'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-600/60';

  return (
    <div className="bg-gradient-to-b from-[#1e3a52] to-[#152a3d] border-b-2 border-cyan-700/40 px-4 py-2.5 flex items-center justify-between shadow-lg">
      {/* Left: toggle buttons + mode buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAutoThrottle(!autoThrottle)}
          className={`px-4 py-1.5 text-xs font-bold tracking-wider rounded-md border-2 transition-all ${
            autoThrottle ? activeClass : inactiveClass
          }`}
        >
          AUTO
        </button>

        <button
          className="px-4 py-1.5 text-xs font-bold bg-slate-700/60 text-white border-2 border-slate-600 rounded-md shadow-md tabular-nums font-mono"
        >
          {speed}
        </button>

        <button className="px-3 py-1.5 text-xs font-bold bg-green-500/90 text-black border-2 border-green-400 rounded-md shadow-md shadow-green-500/30">
          AT
        </button>

        <div className="w-px h-7 bg-slate-600 mx-2" />

        <button className="px-3 py-1.5 text-xs font-bold bg-slate-700/60 text-slate-300 border-2 border-slate-600 rounded-md shadow-md">
          AFDS
        </button>

        <button
          onClick={() => setAutopilot(!autopilot)}
          className={`px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all ${
            autopilot ? activeClass : inactiveClass
          }`}
        >
          AP
        </button>

        <div className="w-px h-7 bg-slate-600 mx-2" />

        {MODE_BUTTONS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all shadow-md ${
              selectedMode === mode ? activeClass : inactiveClass
            }`}
          >
            {label}
          </button>
        ))}

        <button
          className="px-4 py-1.5 text-xs font-bold bg-green-500/90 text-black border-2 border-green-400 rounded-md shadow-md shadow-green-500/30 tabular-nums font-mono"
        >
          {desiredAltitude.toLocaleString()}
        </button>
      </div>

      {/* Right: frequency + callsign */}
      <div className="flex items-center gap-6">
        <div className="text-green-400 text-sm font-mono font-bold">
          {activeFrequency.value.toFixed(3)}{' '}
          <span className="text-xs text-cyan-400">{activeFrequency.label}</span>
        </div>
      </div>
    </div>
  );
}
