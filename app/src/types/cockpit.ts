// T1.1 — Cockpit domain types

export type CockpitMode = 'NAV' | 'APR' | 'HDG' | 'ALT' | 'VS' | 'VNAV' | 'FLCH';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  isActive: boolean;
}

export interface Frequency {
  value: number;
  label: string;
}

export type CockpitActionType =
  | 'set_altitude'
  | 'set_heading'
  | 'set_speed'
  | 'set_mode'
  | 'set_frequency'
  | 'swap_frequencies'
  | 'update_waypoint'
  | 'accept_predict'
  | 'reject_predict';

export interface CockpitAction {
  type: CockpitActionType;
  value: number | string;
}

export interface CockpitState {
  flightPlan: Waypoint[];
  activeFrequency: Frequency;
  standbyFrequency: Frequency;
  selectedMode: CockpitMode;
  altitude: number;
  heading: number;
  speed: number;
  desiredAltitude?: number;
  vnavConstraint?: number;
  autopilot?: boolean;
  autoThrottle?: boolean;
}

// Anthem Telemetry Abstraction (Strategic Dimension 1)

export interface AnthemTelemetryEvent {
  type: 'display' | 'pilot_predict' | 'flight_parameter';
  timestamp: number;
  source: string;
  payload: DisplayEvent | PilotPredictEvent | FlightParameterEvent;
}

export interface DisplayEvent {
  panel: string;
  action: string;
  element: string;
  value: string | number;
}

export interface PilotPredictEvent {
  suggestionId: string;
  suggestion: string;
  accepted: boolean;
  timeToDecisionMs: number;
}

export interface FlightParameterEvent {
  parameter: string;
  previousValue: number;
  newValue: number;
  source: 'pilot' | 'autopilot' | 'fms';
}
