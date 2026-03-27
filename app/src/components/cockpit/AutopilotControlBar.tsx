// Flight Control Panel — mode buttons (VNAV/FLCH/VS/ALT/AP/AUTO) + altitude display
// Restyled to match avionics PFD design with Graduate font and PFD color palette.

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

  const activeStyle = 'bg-[#4EFFFC]/20 text-[#A6FAF8] border-[#4EFFFC]/60 shadow-[0_0_8px_rgba(78,255,252,0.3)]';
  const inactiveStyle = 'bg-black/30 text-white/70 border-white/20 hover:bg-white/10 hover:text-white';

  return (
    <div
      className="border-b border-white/10 px-4 py-2.5 flex items-center justify-between shadow-lg"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      {/* Left: toggle buttons + mode buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAutoThrottle(!autoThrottle)}
          className={`px-4 py-1.5 text-xs font-bold tracking-wider rounded-md border transition-all font-graduate ${
            autoThrottle ? activeStyle : inactiveStyle
          }`}
        >
          AUTO
        </button>

        <button
          className="px-4 py-1.5 text-xs font-bold rounded-md border transition-all font-graduate bg-black/30 text-[#A6FAF8] border-white/20 tabular-nums"
        >
          {speed}
        </button>

        <button className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all font-graduate ${activeStyle}`}>
          AT
        </button>

        <div className="w-px h-7 bg-white/15 mx-2" />

        <button className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all font-graduate ${inactiveStyle}`}>
          AFDS
        </button>

        <button
          onClick={() => setAutopilot(!autopilot)}
          className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all font-graduate ${
            autopilot ? activeStyle : inactiveStyle
          }`}
        >
          AP
        </button>

        <div className="w-px h-7 bg-white/15 mx-2" />

        {MODE_BUTTONS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all shadow-md font-graduate ${
              selectedMode === mode ? activeStyle : inactiveStyle
            }`}
          >
            {label}
          </button>
        ))}

        <button
          className="px-4 py-1.5 text-xs font-bold rounded-md border transition-all font-graduate bg-[#4EFFFC]/20 text-[#A6FAF8] border-[#4EFFFC]/60 tabular-nums"
        >
          {desiredAltitude.toLocaleString()}
        </button>
      </div>

      {/* Right: frequency + callsign */}
      <div className="flex items-center gap-6">
        <div className="text-sm font-bold font-graduate">
          <span className="text-[#A6FAF8]">{activeFrequency.value.toFixed(3)}</span>{' '}
          <span className="text-xs text-[#4EFFFC]/70">{activeFrequency.label}</span>
        </div>
      </div>
    </div>
  );
}
