// T1.11 — Cockpit store: aircraft state, frequency management, mode selection

import { create } from 'zustand';
import type { CockpitMode, Waypoint, Frequency } from '@/types';

interface CockpitStore {
  flightPlan: Waypoint[];
  activeFrequency: Frequency;
  standbyFrequency: Frequency;
  selectedMode: CockpitMode;
  altitude: number;
  heading: number;
  speed: number;
  desiredAltitude: number;
  vnavConstraint: number;
  autopilot: boolean;
  autoThrottle: boolean;

  setFrequency: (freq: Frequency, slot: 'active' | 'standby') => void;
  swapFrequencies: () => void;
  updateWaypoint: (index: number, waypoint: Partial<Waypoint>) => void;
  setMode: (mode: CockpitMode) => void;
  setAltitude: (alt: number) => void;
  setHeading: (hdg: number) => void;
  setSpeed: (spd: number) => void;
  setDesiredAltitude: (alt: number) => void;
  adjustDesiredAltitude: (direction: 'up' | 'down', step?: number) => void;
  setVnavConstraint: (alt: number) => void;
  setAutopilot: (on: boolean) => void;
  setAutoThrottle: (on: boolean) => void;
  loadFlightPlan: (plan: Waypoint[]) => void;
  reset: () => void;
}

const defaultState = {
  flightPlan: [] as Waypoint[],
  activeFrequency: { value: 121.5, label: 'Guard' } as Frequency,
  standbyFrequency: { value: 124.35, label: 'Boston Center' } as Frequency,
  selectedMode: 'NAV' as CockpitMode,
  altitude: 36000,
  heading: 360,
  speed: 280,
  desiredAltitude: 36000,
  vnavConstraint: 0,
  autopilot: true,
  autoThrottle: true,
};

export const useCockpitStore = create<CockpitStore>((set) => ({
  ...defaultState,

  setFrequency: (freq, slot) =>
    set(slot === 'active' ? { activeFrequency: freq } : { standbyFrequency: freq }),

  swapFrequencies: () =>
    set((state) => ({
      activeFrequency: state.standbyFrequency,
      standbyFrequency: state.activeFrequency,
    })),

  updateWaypoint: (index, update) =>
    set((state) => ({
      flightPlan: state.flightPlan.map((wp, i) =>
        i === index ? { ...wp, ...update } : wp,
      ),
    })),

  setMode: (mode) => set({ selectedMode: mode }),

  setAltitude: (alt) => set({ altitude: alt }),

  setHeading: (hdg) => set({ heading: hdg }),

  setSpeed: (spd) => set({ speed: spd }),

  setDesiredAltitude: (alt) => set({ desiredAltitude: alt }),

  adjustDesiredAltitude: (direction, step = 1000) =>
    set((state) => {
      const change = direction === 'up' ? step : -step;
      return { desiredAltitude: Math.max(0, Math.min(50000, state.desiredAltitude + change)) };
    }),

  setVnavConstraint: (alt) => set({ vnavConstraint: alt }),

  setAutopilot: (on) => set({ autopilot: on }),

  setAutoThrottle: (on) => set({ autoThrottle: on }),

  loadFlightPlan: (plan) => set({ flightPlan: plan }),

  reset: () => set(defaultState),
}));
