// Top-level interactive cockpit view — rendered during interactive_cockpit drill events.
// Composes: AutopilotControlBar + InteractivePFD + InteractiveMFD + ATC overlay.

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useUIStore } from '@/stores/ui-store';
import { useInteractiveCockpitTracker } from '@/hooks/useInteractiveCockpitTracker';
import { AutopilotControlBar } from './AutopilotControlBar';
import { InteractivePFD } from './pfd';
import { InteractiveMFD } from './InteractiveMFD';
import { ATCCommunicationOverlay } from './ATCCommunicationOverlay';
import { ResizeHandle } from './ResizeHandle';
import type { InteractiveCockpitEvent, InteractiveCockpitScore, CockpitMode, DrillDefinition } from '@/types';

interface InteractiveCockpitViewProps {
  event: InteractiveCockpitEvent;
  drill: DrillDefinition;
  eventIndex: number;
  totalEvents: number;
  startTime: number;
  onComplete: (score: InteractiveCockpitScore) => void;
}

export function InteractiveCockpitView({
  event,
  onComplete,
}: InteractiveCockpitViewProps) {
  const overridesAppliedRef = useRef(false);
  const modeChangeStartRef = useRef<number | null>(null);

  // Apply initial cockpit overrides on mount (once)
  useEffect(() => {
    if (overridesAppliedRef.current) return;
    overridesAppliedRef.current = true;

    const store = useCockpitStore.getState();
    const o = event.initialCockpitOverrides;

    if (o.altitude !== undefined) store.setAltitude(o.altitude);
    if (o.heading !== undefined) store.setHeading(o.heading);
    if (o.speed !== undefined) store.setSpeed(o.speed);
    if (o.selectedMode !== undefined) store.setMode(o.selectedMode);
    if (o.desiredAltitude !== undefined) store.setDesiredAltitude(o.desiredAltitude);
    if (o.vnavConstraint !== undefined) store.setVnavConstraint(o.vnavConstraint);
    if (o.autopilot !== undefined) store.setAutopilot(o.autopilot);
    if (o.autoThrottle !== undefined) store.setAutoThrottle(o.autoThrottle);
    if (o.flightPlan) store.loadFlightPlan(o.flightPlan);
    if (o.activeFrequency) store.setFrequency(o.activeFrequency, 'active');
    if (o.standbyFrequency) store.setFrequency(o.standbyFrequency, 'standby');
  }, [event.initialCockpitOverrides]);

  // Altitude simulation is handled by AmbientCockpitView's useAltitudeSimulation(true)
  // which remains active even when this component is rendered (hooks run before early returns).

  // Stable onComplete callback
  const handleComplete = useCallback(
    (score: InteractiveCockpitScore) => {
      useAssessmentStore.getState().recordInteractiveCockpitScore(score);
      onComplete(score);
    },
    [onComplete],
  );

  // Track pilot actions and evaluate conditions
  const trackerState = useInteractiveCockpitTracker(event, handleComplete);

  // Derive scenario status
  const scenarioStatus = trackerState.allMet ? 'resolved' : 'conflict';

  // Track mode selection timing
  const handleModeChange = useCallback((_mode: CockpitMode) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!modeChangeStartRef.current) {
      modeChangeStartRef.current = Date.now();
    }
  }, []);

  // Derive metrics for MFD display
  const modeSelectionCorrect = useMemo(() => {
    const modeCond = trackerState.conditionStatus.get(
      event.successConditions.find((c) => c.field === 'selectedMode')?.label ?? '',
    );
    return modeCond ?? false;
  }, [trackerState.conditionStatus, event.successConditions]);

  const atcCompliance = trackerState.allMet;
  const firstModeChange = trackerState.modeChanges[0];
  const responseTimeMs = firstModeChange ? firstModeChange.timeMs : 0;

  const mfdWidth = useUIStore((s) => s.mfdWidth);
  const setMfdWidth = useUIStore((s) => s.setMfdWidth);

  const handleDrag = useCallback(
    (deltaX: number) => {
      setMfdWidth(mfdWidth - deltaX);
    },
    [mfdWidth, setMfdWidth],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070c14]">
      {/* Top control bar */}
      <AutopilotControlBar onModeChange={handleModeChange} />

      {/* Main display area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Primary Flight Display (left) */}
        <InteractivePFD onModeChange={handleModeChange} />

        {/* Resize handle */}
        <ResizeHandle onDrag={handleDrag} />

        {/* Multi-Function Display (right) */}
        <InteractiveMFD
          scenarioStatus={scenarioStatus as 'conflict' | 'resolved'}
          responseTimeMs={responseTimeMs}
          modeSelectionCorrect={modeSelectionCorrect}
          atcCompliance={atcCompliance}
          conditionStatus={trackerState.conditionStatus}
          width={mfdWidth}
        />

        {/* ATC Communication overlay */}
        <ATCCommunicationOverlay
          escalationTriggered={trackerState.escalationTriggered}
          escalationPrompt={event.escalationPrompt}
          initialPrompt={event.description}
        />
      </div>
    </div>
  );
}
