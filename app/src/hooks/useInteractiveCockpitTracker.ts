// Tracks pilot actions during an interactive_cockpit event.
// Evaluates success conditions, manages escalation timer, computes final score.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import type { InteractiveCockpitEvent, InteractiveCockpitScore, CockpitSuccessCondition } from '@/types';

interface TrackerState {
  conditionStatus: Map<string, boolean>;
  modeChanges: { from: string; to: string; timeMs: number }[];
  altitudeChanges: { from: number; to: number; timeMs: number }[];
  escalationTriggered: boolean;
  elapsedMs: number;
  allMet: boolean;
}

function evaluateCondition(
  condition: CockpitSuccessCondition,
  state: ReturnType<typeof useCockpitStore.getState>,
): boolean {
  let actual: unknown;
  switch (condition.field) {
    case 'selectedMode':
      actual = state.selectedMode;
      break;
    case 'desiredAltitude':
      actual = state.desiredAltitude;
      break;
    case 'altitude':
      actual = state.altitude;
      break;
    case 'heading':
      actual = state.heading;
      break;
    case 'speed':
      actual = state.speed;
      break;
    case 'activeFrequency':
      actual = state.activeFrequency.value;
      break;
    default:
      return false;
  }

  switch (condition.operator) {
    case 'eq':
      return actual === condition.value;
    case 'lte':
      return typeof actual === 'number' && actual <= (condition.value as number);
    case 'gte':
      return typeof actual === 'number' && actual >= (condition.value as number);
    case 'neq':
      return actual !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(String(actual));
    default:
      return false;
  }
}

export function useInteractiveCockpitTracker(
  event: InteractiveCockpitEvent,
  onComplete: (score: InteractiveCockpitScore) => void,
) {
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const prevModeRef = useRef(useCockpitStore.getState().selectedMode);
  const prevAltRef = useRef(useCockpitStore.getState().desiredAltitude);
  const conditionTimesRef = useRef<Map<string, number>>(new Map());

  const [trackerState, setTrackerState] = useState<TrackerState>({
    conditionStatus: new Map(event.successConditions.map((c) => [c.label, false])),
    modeChanges: [],
    altitudeChanges: [],
    escalationTriggered: false,
    elapsedMs: 0,
    allMet: false,
  });

  const buildScore = useCallback(
    (state: TrackerState, timedOut: boolean): InteractiveCockpitScore => ({
      conditionsMet: event.successConditions.map((c) => ({
        label: c.label,
        met: state.conditionStatus.get(c.label) ?? false,
        timeMs: conditionTimesRef.current.get(c.label) ?? state.elapsedMs,
      })),
      allConditionsMet: state.allMet,
      totalTimeMs: Date.now() - startTimeRef.current,
      timedOut,
      modeChanges: state.modeChanges,
      altitudeChanges: state.altitudeChanges,
      escalationTriggered: state.escalationTriggered,
    }),
    [event.successConditions],
  );

  // Subscribe to cockpit-store changes
  useEffect(() => {
    const unsubscribe = useCockpitStore.subscribe((state) => {
      if (completedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;

      setTrackerState((prev) => {
        const newStatus = new Map(prev.conditionStatus);
        const newModeChanges = [...prev.modeChanges];
        const newAltChanges = [...prev.altitudeChanges];

        // Track mode changes
        if (state.selectedMode !== prevModeRef.current) {
          newModeChanges.push({
            from: prevModeRef.current,
            to: state.selectedMode,
            timeMs: elapsed,
          });
          prevModeRef.current = state.selectedMode;
        }

        // Track altitude changes
        if (state.desiredAltitude !== prevAltRef.current) {
          newAltChanges.push({
            from: prevAltRef.current,
            to: state.desiredAltitude,
            timeMs: elapsed,
          });
          prevAltRef.current = state.desiredAltitude;
        }

        // Evaluate conditions
        for (const condition of event.successConditions) {
          const met = evaluateCondition(condition, state);
          const wasMet = newStatus.get(condition.label);
          newStatus.set(condition.label, met);
          if (met && !wasMet) {
            conditionTimesRef.current.set(condition.label, elapsed);
          }
        }

        const allMet = event.successConditions.every((c) => newStatus.get(c.label));

        return {
          conditionStatus: newStatus,
          modeChanges: newModeChanges,
          altitudeChanges: newAltChanges,
          escalationTriggered: prev.escalationTriggered,
          elapsedMs: elapsed,
          allMet,
        };
      });
    });

    return () => unsubscribe();
  }, [event.successConditions]);

  // Complete when all conditions met
  useEffect(() => {
    if (trackerState.allMet && !completedRef.current) {
      completedRef.current = true;
      // Small delay so the pilot sees the final state
      setTimeout(() => {
        onComplete(buildScore(trackerState, false));
      }, 1000);
    }
  }, [trackerState.allMet, trackerState, onComplete, buildScore]);

  // Escalation timer
  useEffect(() => {
    if (!event.escalationDelaySeconds || !event.escalationPrompt) return;

    const timer = setTimeout(() => {
      if (completedRef.current) return;
      setTrackerState((prev) => ({ ...prev, escalationTriggered: true }));
    }, event.escalationDelaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [event.escalationDelaySeconds, event.escalationPrompt]);

  // Time limit
  useEffect(() => {
    const timer = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setTrackerState((prev) => {
        const finalState = { ...prev, elapsedMs: event.timeLimitSeconds * 1000 };
        onComplete(buildScore(finalState, true));
        return finalState;
      });
    }, event.timeLimitSeconds * 1000);

    return () => clearTimeout(timer);
  }, [event.timeLimitSeconds, onComplete, buildScore]);

  // Elapsed time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (completedRef.current) return;
      setTrackerState((prev) => ({
        ...prev,
        elapsedMs: Date.now() - startTimeRef.current,
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return trackerState;
}
