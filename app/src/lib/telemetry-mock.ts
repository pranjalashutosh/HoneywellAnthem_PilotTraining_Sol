// T3.16 — Generate typed AnthemTelemetryEvent on every cockpit interaction

import type {
  AnthemTelemetryEvent,
  DisplayEvent,
  PilotPredictEvent,
  FlightParameterEvent,
} from '@/types';

function emit(event: AnthemTelemetryEvent) {
  // In production, this would send to Honeywell Forge pipeline
  // For prototype, log to console to prove telemetry abstraction works
  console.log('[AnthemTelemetry]', event.type, event.payload);
}

export function emitDisplayEvent(panel: string, action: string, element: string, value: string | number) {
  const payload: DisplayEvent = { panel, action, element, value };
  emit({
    type: 'display',
    timestamp: Date.now(),
    source: 'anthem-cockpit-trainer',
    payload,
  });
}

export function emitPilotPredictEvent(
  suggestionId: string,
  suggestion: string,
  accepted: boolean,
  timeToDecisionMs: number,
) {
  const payload: PilotPredictEvent = { suggestionId, suggestion, accepted, timeToDecisionMs };
  emit({
    type: 'pilot_predict',
    timestamp: Date.now(),
    source: 'anthem-cockpit-trainer',
    payload,
  });
}

export function emitFlightParameterEvent(
  parameter: string,
  previousValue: number,
  newValue: number,
  source: 'pilot' | 'autopilot' | 'fms',
) {
  const payload: FlightParameterEvent = { parameter, previousValue, newValue, source };
  emit({
    type: 'flight_parameter',
    timestamp: Date.now(),
    source: 'anthem-cockpit-trainer',
    payload,
  });
}
