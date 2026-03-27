// T5.14 + T7.7 — Drill lifecycle manager, wired to assessment engine

import { useScenarioStore } from '@/stores/scenario-store';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useVoiceStore } from '@/stores/voice-store';
import { finalizeDrillAssessment, createManualReadbackScore } from '@/services/assessment-engine';
import type { DrillDefinition, EventResult, DecisionScore, TrapScore, TouchScore, InteractiveCockpitScore } from '@/types';
import { allDrills } from '@/data/drills';

export function initializeDrills(): void {
  useScenarioStore.getState().setAvailableDrills(allDrills);
}

export function startDrill(drillId: string): void {
  const scenario = useScenarioStore.getState();
  const cockpit = useCockpitStore.getState();
  const assessment = useAssessmentStore.getState();

  // Find and select the drill
  scenario.selectDrill(drillId);
  const drill = useScenarioStore.getState().activeDrill;
  if (!drill) return;

  // Set cockpit to drill's initial state
  cockpit.loadFlightPlan(drill.initialState.flightPlan);
  cockpit.setAltitude(drill.initialState.altitude);
  cockpit.setHeading(drill.initialState.heading);
  cockpit.setSpeed(drill.initialState.speed);
  cockpit.setFrequency(drill.initialState.activeFrequency, 'active');
  cockpit.setFrequency(drill.initialState.standbyFrequency, 'standby');
  cockpit.setMode(drill.initialState.selectedMode);

  // Set extended cockpit state fields if provided
  if (drill.initialState.desiredAltitude !== undefined) {
    cockpit.setDesiredAltitude(drill.initialState.desiredAltitude);
  } else {
    cockpit.setDesiredAltitude(drill.initialState.altitude);
  }
  if (drill.initialState.vnavConstraint !== undefined) {
    cockpit.setVnavConstraint(drill.initialState.vnavConstraint);
  }
  if (drill.initialState.autopilot !== undefined) {
    cockpit.setAutopilot(drill.initialState.autopilot);
  }
  if (drill.initialState.autoThrottle !== undefined) {
    cockpit.setAutoThrottle(drill.initialState.autoThrottle);
  }

  // Initialize assessment metrics
  assessment.initDrillMetrics(drill.id);

  // Clear voice transcripts from previous drill
  useVoiceStore.getState().clearTranscripts();

  // Start the drill
  scenario.startDrill();
}

/**
 * Record an event result and push the corresponding score to the assessment store.
 */
export function recordEventResult(result: EventResult): void {
  const scenario = useScenarioStore.getState();
  const assessment = useAssessmentStore.getState();

  scenario.recordEventResult(result);

  // Route to appropriate assessment store recorder
  const drill = scenario.activeDrill;
  if (!drill) return;

  const event = drill.events[result.eventIndex];
  if (!event) return;

  switch (event.type) {
    case 'decision_point': {
      const decisionScore: DecisionScore = {
        correct: result.success,
        timeToDecision: (result.details.timeToDecision as number) ?? 0,
        timedOut: (result.details.timedOut as boolean) ?? false,
        optionSelected: (result.details.optionSelected as string) ?? '',
      };
      assessment.recordDecisionScore(decisionScore);
      break;
    }

    case 'predict_suggestion': {
      const trapScore: TrapScore = {
        detected: result.success,
        timeToReject: (result.details.timeToReject as number) ?? 0,
        acceptedWrong: (result.details.acceptedWrong as boolean) ?? false,
      };
      assessment.recordTrapScore(trapScore);
      break;
    }

    case 'cockpit_action': {
      const touchScore: TouchScore = {
        actionCorrect: result.success,
        timeToComplete: (result.details.timeToComplete as number) ?? 0,
        timedOut: (result.details.timedOut as boolean) ?? false,
        actionPerformed: (result.details.actionPerformed as string) ?? '',
        expectedAction: (result.details.expectedAction as string) ?? '',
      };
      assessment.recordTouchScore(touchScore);
      break;
    }

    case 'interactive_cockpit': {
      // Score is already recorded by InteractiveCockpitView via assessment store
      // This case handles the EventResult routing for completeness
      const interactiveScore: InteractiveCockpitScore = {
        conditionsMet: (result.details.conditionsMet as InteractiveCockpitScore['conditionsMet']) ?? [],
        allConditionsMet: result.success,
        totalTimeMs: (result.details.totalTimeMs as number) ?? 0,
        timedOut: (result.details.timedOut as boolean) ?? false,
        modeChanges: (result.details.modeChanges as InteractiveCockpitScore['modeChanges']) ?? [],
        altitudeChanges: (result.details.altitudeChanges as InteractiveCockpitScore['altitudeChanges']) ?? [],
        escalationTriggered: (result.details.escalationTriggered as boolean) ?? false,
      };
      assessment.recordInteractiveCockpitScore(interactiveScore);
      break;
    }

    // atc_instruction readback scores come from ASSESSMENT_RESULT data channel message
    // and are handled by assessment-engine.processAssessmentResult().
    // For keyboard fallback, generate a manual ReadbackScore so the pipeline has data.
    case 'atc_instruction': {
      if (result.details.mode === 'keyboard-fallback') {
        assessment.recordReadbackScore(createManualReadbackScore(result.success));
      }
      break;
    }
  }
}

export function advanceEvent(): void {
  useScenarioStore.getState().advanceEvent();
}

export function completeDrill(): void {
  const scenario = useScenarioStore.getState();

  scenario.completeDrill();

  // Compute final scores, CBTA rollup, and persist
  finalizeDrillAssessment();

  // Save to server (async, fire-and-forget)
  useAssessmentStore
    .getState()
    .saveToServer()
    .catch((err: unknown) => {
      console.warn('[scenario-runner] Failed to save to server:', err);
    });
}

export function getCurrentDrill(): DrillDefinition | null {
  return useScenarioStore.getState().activeDrill;
}

export function resetDrill(): void {
  useScenarioStore.getState().reset();
}
