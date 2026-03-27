// Cockpit view — the single persistent cockpit screen.
// Phase-aware: renders drill event overlays and swaps to InteractiveCockpitView
// for interactive_cockpit events.

import { useCallback, useEffect } from 'react';
import { useAltitudeSimulation } from '@/hooks/useAltitudeSimulation';
import { useUIStore } from '@/stores/ui-store';
import { useDrillRunner } from '@/hooks/useDrillRunner';
import { AutopilotControlBar } from './AutopilotControlBar';
import { InteractivePFD } from './pfd';
import { InteractiveMFD } from './InteractiveMFD';
import { InteractiveCockpitView } from './InteractiveCockpitView';
import { ResizeHandle } from './ResizeHandle';
import { DrillEventOverlay } from '@/components/drill/DrillEventOverlay';
import { DrillOutcome } from '@/components/drill/DrillOutcome';
import { isFrequencyAction } from '@/lib/frequency-utils';
import type { InteractiveCockpitEvent, InteractiveCockpitScore, CockpitActionEvent } from '@/types';

const EMPTY_CONDITION_STATUS = new Map<string, boolean>();

export function AmbientCockpitView() {
  // Enable altitude simulation so the PFD animates when the pilot adjusts controls
  useAltitudeSimulation(true);

  const mfdWidth = useUIStore((s) => s.mfdWidth);
  const setMfdWidth = useUIStore((s) => s.setMfdWidth);
  const setMfdTab = useUIStore((s) => s.setMfdTab);

  const {
    phase,
    activeDrill,
    currentEvent,
    currentEventIndex,
    startTime,
    recordResult,
    advance,
    complete,
  } = useDrillRunner();

  // Auto-switch to Radios tab for ATC instruction and frequency cockpit_action events
  useEffect(() => {
    if (
      (phase === 'active' || phase === 'decision') &&
      (currentEvent?.type === 'atc_instruction' ||
        (currentEvent?.type === 'cockpit_action' &&
          isFrequencyAction((currentEvent as CockpitActionEvent).expectedAction)))
    ) {
      setMfdTab('radios');
    }
  }, [phase, currentEvent, setMfdTab]);

  const handleDrag = useCallback(
    (deltaX: number) => {
      setMfdWidth(mfdWidth - deltaX);
    },
    [mfdWidth, setMfdWidth],
  );

  // For interactive_cockpit events, swap to the full InteractiveCockpitView
  if (
    (phase === 'active' || phase === 'decision') &&
    currentEvent?.type === 'interactive_cockpit' &&
    activeDrill &&
    startTime
  ) {
    const interactiveEvent = currentEvent as InteractiveCockpitEvent;
    const totalEvents = activeDrill.events.length;
    const isLastEvent = currentEventIndex >= totalEvents - 1;

    return (
      <InteractiveCockpitView
        event={interactiveEvent}
        drill={activeDrill}
        eventIndex={currentEventIndex}
        totalEvents={totalEvents}
        startTime={startTime}
        onComplete={(score: InteractiveCockpitScore) => {
          recordResult({
            eventType: 'interactive_cockpit',
            success: score.allConditionsMet,
            details: score as unknown as Record<string, unknown>,
          });
          if (isLastEvent) {
            complete();
          } else {
            advance();
          }
        }}
      />
    );
  }

  // For drill outcome, show it as an overlay
  if (phase === 'outcome') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#070c14]">
        <AutopilotControlBar />
        <div className="flex-1 flex overflow-hidden relative">
          <InteractivePFD />
          <ResizeHandle onDrag={handleDrag} />
          <InteractiveMFD
            scenarioStatus="resolved"
            responseTimeMs={0}
            modeSelectionCorrect={false}
            atcCompliance={false}
            conditionStatus={EMPTY_CONDITION_STATUS}
            width={mfdWidth}
          />
          {/* Drill outcome overlay */}
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm overflow-auto">
            <DrillOutcome />
          </div>
        </div>
      </div>
    );
  }

  // Determine if we need to show a drill event overlay
  // ATC instructions and frequency cockpit_actions are handled inline in the Radios tab
  const showDrillOverlay =
    (phase === 'active' || phase === 'decision') &&
    currentEvent &&
    currentEvent.type !== 'interactive_cockpit' &&
    currentEvent.type !== 'atc_instruction' &&
    !(currentEvent.type === 'cockpit_action' &&
      isFrequencyAction((currentEvent as CockpitActionEvent).expectedAction));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070c14]">
      {/* Top control bar */}
      <AutopilotControlBar />

      {/* Main display area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Primary Flight Display (left) */}
        <InteractivePFD />

        {/* Resize handle */}
        <ResizeHandle onDrag={handleDrag} />

        {/* Multi-Function Display (right) */}
        <InteractiveMFD
          scenarioStatus="resolved"
          responseTimeMs={0}
          modeSelectionCorrect={false}
          atcCompliance={false}
          conditionStatus={EMPTY_CONDITION_STATUS}
          width={mfdWidth}
        />

        {/* Drill event overlay (decision, predict, cockpit_action only — ATC is inline in Radios tab) */}
        {showDrillOverlay && <DrillEventOverlay />}
      </div>
    </div>
  );
}
