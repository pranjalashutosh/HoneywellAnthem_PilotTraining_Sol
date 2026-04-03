// Phase 5 — Free Talk Zustand store

import { create } from 'zustand';
import type { ATCPersona, FreeTalkPhase } from '@/types/freetalk';
import type { TranscriptEntry } from '@/types';

interface FreeTalkStore {
  phase: FreeTalkPhase;
  activePersonaId: string | null;
  personas: ATCPersona[];
  conversationLog: TranscriptEntry[];

  startFreeTalk: () => void;
  setConnected: () => void;
  stopFreeTalk: () => void;
  setActivePersona: (id: string) => void;
  appendConversation: (entry: TranscriptEntry) => void;
  reset: () => void;
}

const PERSONAS: ATCPersona[] = [
  {
    id: 'boston_center',
    facility: 'Boston Center',
    sector: 'Sector 33',
    frequency: 124.350,
    voiceName: 'Adam',
  },
  {
    id: 'ny_approach',
    facility: 'New York Approach',
    sector: 'Sector 56',
    frequency: 132.450,
    voiceName: 'Daniel',
  },
];

const defaultState = {
  phase: 'idle' as FreeTalkPhase,
  activePersonaId: null as string | null,
  personas: PERSONAS,
  conversationLog: [] as TranscriptEntry[],
};

export const useFreeTalkStore = create<FreeTalkStore>((set) => ({
  ...defaultState,

  startFreeTalk: () => set({ phase: 'connecting' }),

  setConnected: () => set({ phase: 'active', activePersonaId: 'boston_center' }),

  stopFreeTalk: () => set({ ...defaultState }),

  setActivePersona: (id) => set({ activePersonaId: id }),

  appendConversation: (entry) =>
    set((state) => ({
      conversationLog: [...state.conversationLog, entry],
    })),

  reset: () => set({ ...defaultState }),
}));
