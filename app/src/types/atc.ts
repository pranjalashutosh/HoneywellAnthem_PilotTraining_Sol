// T1.8 — ATC domain types

export interface ATCInstruction {
  instruction: string;
  expectedReadback: string;
  requiredActions: { type: string; value: string | number }[];
}

export interface ATCConversationEntry {
  role: 'atc' | 'pilot';
  text: string;
  timestamp: number;
}

export interface ATCContext {
  facility: string;
  sector: string;
  callsign: string;
  altitude: number;
  heading: number;
  frequency: number;
  flightPhase: string;
  conversationHistory: ATCConversationEntry[];
  drill: {
    id?: string;
    atcConstraints: string;
    traffic: string[];
    weather: string;
  };
}
