// T1.2 — Scenario/Drill domain types

import type { CockpitAction, CockpitState } from './cockpit';
import type { CBTACompetency } from './assessment';

export type DrillPhase = 'idle' | 'briefing' | 'active' | 'decision' | 'outcome';

export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface DecisionOption {
  id: string;
  text: string;
}

// Drill event types (discriminated union)

export interface ATCInstructionEvent {
  type: 'atc_instruction';
  prompt: string;
  expectedActions: CockpitAction[];
  keywords: string[];
}

export interface DecisionPointEvent {
  type: 'decision_point';
  prompt: string;
  options: DecisionOption[];
  correctOptionId: string;
  timeLimitSeconds: number;
}

export interface PredictSuggestionEvent {
  type: 'predict_suggestion';
  suggestion: string;
  correctAction: string;
  context: string;
}

export interface CockpitActionEvent {
  type: 'cockpit_action';
  instruction: string;
  expectedAction: CockpitAction;
  timeLimitSeconds: number;
}

export type DrillEvent =
  | ATCInstructionEvent
  | DecisionPointEvent
  | PredictSuggestionEvent
  | CockpitActionEvent;

export interface DrillDefinition {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: DrillDifficulty;
  competencies: CBTACompetency[];
  flightPlan: string;
  initialState: CockpitState;
  events: DrillEvent[];
  atcContext: {
    facility: string;
    sector: string;
    callsign: string;
    traffic: string[];
    weather: string;
  };
}

export interface EventResult {
  eventIndex: number;
  eventType: DrillEvent['type'];
  success: boolean;
  details: Record<string, unknown>;
  timestamp: number;
}
