// Phase 5 — Free Talk types

export interface ATCPersona {
  id: string;
  facility: string;
  sector: string;
  frequency: number;
  voiceName: string;
}

export type FreeTalkPhase = 'idle' | 'connecting' | 'active';
