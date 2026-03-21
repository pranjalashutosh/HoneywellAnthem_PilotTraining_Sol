// Altitude simulation hook — animates cockpit-store altitude toward desiredAltitude
// based on selectedMode. Adapted from prototype's App.tsx simulation logic.

import { useEffect, useRef } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';

const TICK_MS = 500;
const RATES: Record<string, number> = {
  VNAV: 100,  // ft per tick — slow, constrained by vnavConstraint
  FLCH: 200,  // ft per tick — fast, ignores constraints
  VS: 150,    // ft per tick — moderate, ignores constraints
};

export function useAltitudeSimulation(active: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const state = useCockpitStore.getState();
      const { selectedMode, altitude, desiredAltitude, vnavConstraint } = state;
      const rate = RATES[selectedMode] ?? 0;

      if (rate === 0 || altitude === desiredAltitude) return;

      let target = desiredAltitude;

      // VNAV respects the constraint floor — won't descend below it
      if (selectedMode === 'VNAV' && vnavConstraint > 0) {
        target = Math.max(vnavConstraint, desiredAltitude);
      }

      if (altitude === target) return;

      let newAlt: number;
      if (altitude > target) {
        newAlt = Math.max(target, altitude - rate);
      } else {
        newAlt = Math.min(target, altitude + rate);
      }

      state.setAltitude(newAlt);
    }, TICK_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);
}
