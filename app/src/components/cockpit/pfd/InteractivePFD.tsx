// Primary Flight Display orchestrator — subscribes to cockpit-store,
// computes derived values, renders sub-components in correct z-order.
// Layout: attitude indicator in upper area, smaller HSI compass in lower area.

import { useMemo, useCallback } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import type { CockpitMode } from '@/types';
import { SyntheticVisionBackground } from './SyntheticVisionBackground';
import { SpeedTape } from './SpeedTape';
import { AltitudeTape } from './AltitudeTape';
import { HeadingCompass } from './HeadingCompass';
import { TopHeadingArc } from './TopHeadingArc';
import { FlightDirector } from './FlightDirector';
import { ModeAnnunciations } from './ModeAnnunciations';

const MODE_DISPLAY: Record<string, string> = {
  VNAV: 'VNAV PATH',
  FLCH: 'FLCH',
  VS: 'V/S',
  ALT: 'ALT HOLD',
  NAV: 'NAV',
  HDG: 'HDG',
  APR: 'APR',
};

interface InteractivePFDProps {
  onModeChange?: (mode: CockpitMode) => void;
}

export function InteractivePFD({ onModeChange }: InteractivePFDProps) {
  // Store subscriptions
  const currentAltitude = useCockpitStore((s) => s.altitude);
  const desiredAltitude = useCockpitStore((s) => s.desiredAltitude);
  const speed = useCockpitStore((s) => s.speed);
  const heading = useCockpitStore((s) => s.heading);
  const selectedMode = useCockpitStore((s) => s.selectedMode);
  const vnavConstraint = useCockpitStore((s) => s.vnavConstraint);
  const setMode = useCockpitStore((s) => s.setMode);
  const adjustDesiredAltitude = useCockpitStore((s) => s.adjustDesiredAltitude);

  // Derived values
  const altitudeDelta = currentAltitude - desiredAltitude;
  const normalizedDelta = Math.max(-1, Math.min(1, altitudeDelta / 4000));
  const pitchOffset = normalizedDelta * 40;
  const rollAngle = ((heading % 36) - 18) * 0.6;

  const isDescending = currentAltitude > desiredAltitude;
  const isClimbing = currentAltitude < desiredAltitude;
  const status = isDescending ? 'DESCENDING' : isClimbing ? 'CLIMBING' : 'LEVEL';
  const modeDisplay = MODE_DISPLAY[selectedMode] ?? selectedMode;
  const isNearTarget = Math.abs(currentAltitude - desiredAltitude) < 1200;

  // Heading adjustment (still functional via keyboard/other controls)
  const adjustHeading = useCallback(
    (dir: 'left' | 'right') => {
      const change = dir === 'left' ? -10 : 10;
      useCockpitStore.getState().setHeading((heading + change + 360) % 360);
    },
    [heading],
  );

  // V/S mode handler
  const handleVSClick = useCallback(() => {
    setMode('VS');
    onModeChange?.('VS');
  }, [setMode, onModeChange]);

  // Memoize heading for compass to reduce re-renders
  const headingValue = useMemo(() => heading, [heading]);

  return (
    <div className="flex-[3] relative overflow-hidden">
      {/* z-0: Synthetic vision background */}
      <SyntheticVisionBackground
        pitchOffset={pitchOffset}
        rollAngle={rollAngle}
        currentAltitude={currentAltitude}
        isNearTarget={isNearTarget}
        isDescending={isDescending}
      />

      {/* z-10: Flight director + pitch bars */}
      <FlightDirector isDescending={isDescending} />

      {/* z-20: Instruments */}
      <TopHeadingArc />
      <HeadingCompass heading={headingValue} onAdjustHeading={adjustHeading} />
      <SpeedTape speed={speed} />
      <AltitudeTape
        currentAltitude={currentAltitude}
        desiredAltitude={desiredAltitude}
        vnavConstraint={vnavConstraint}
        onAdjustDesiredAltitude={adjustDesiredAltitude}
      />

      {/* z-20: Mode annunciations + controls */}
      <ModeAnnunciations
        modeDisplay={modeDisplay}
        status={status}
        selectedMode={selectedMode}
        vnavConstraint={vnavConstraint}
        desiredAltitude={desiredAltitude}
        isDescending={isDescending}
        onVSClick={handleVSClick}
      />
    </div>
  );
}
