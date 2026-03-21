// Ambient cockpit view — the default Cockpit tab landing page.
// Composes the same sub-components as InteractiveCockpitView but without
// drill tracking, success conditions, or scoring.

import { useAltitudeSimulation } from '@/hooks/useAltitudeSimulation';
import { AutopilotControlBar } from './AutopilotControlBar';
import { InteractivePFD } from './InteractivePFD';
import { InteractiveMFD } from './InteractiveMFD';
import { ATCCommunicationOverlay } from './ATCCommunicationOverlay';

const EMPTY_CONDITION_STATUS = new Map<string, boolean>();

export function AmbientCockpitView() {
  // Enable altitude simulation so the PFD animates when the pilot adjusts controls
  useAltitudeSimulation(true);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A1828]">
      {/* Top control bar */}
      <AutopilotControlBar />

      {/* Main display area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Primary Flight Display (left) */}
        <InteractivePFD />

        {/* Multi-Function Display (right) */}
        <InteractiveMFD
          scenarioStatus="resolved"
          responseTimeMs={0}
          modeSelectionCorrect={false}
          atcCompliance={false}
          conditionStatus={EMPTY_CONDITION_STATUS}
        />

        {/* ATC Communication overlay */}
        <ATCCommunicationOverlay
          escalationTriggered={false}
        />
      </div>
    </div>
  );
}
