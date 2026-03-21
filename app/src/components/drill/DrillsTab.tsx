// Drills tab — orchestrates drill lifecycle phases

import { useState } from 'react';
import { useDrillRunner } from '@/hooks/useDrillRunner';
import { usePilotStore } from '@/stores/pilot-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { DrillDropdownSelector } from './DrillDropdownSelector';
import { DrillBriefing } from './DrillBriefing';
import { DrillActiveView } from './DrillActiveView';
import { DrillOutcome } from './DrillOutcome';
import { CalibrationView } from './CalibrationView';

export function DrillsTab() {
  const { phase } = useDrillRunner();
  const activePilot = usePilotStore((s) => s.activePilot);
  const baseline = useAssessmentStore((s) => s.cognitiveLoadBaseline);
  const [calibrationSkipped, setCalibrationSkipped] = useState(false);

  // Show calibration before drills when pilot has no baseline
  const needsCalibration =
    activePilot &&
    !calibrationSkipped &&
    (!baseline || baseline.sampleCount === 0);

  switch (phase) {
    case 'idle':
      if (needsCalibration) {
        return <CalibrationView onComplete={() => setCalibrationSkipped(true)} />;
      }
      return <DrillDropdownSelector />;
    case 'briefing':
      return <DrillBriefing />;
    case 'active':
    case 'decision':
      return <DrillActiveView />;
    case 'outcome':
      return <DrillOutcome />;
    default:
      return <DrillDropdownSelector />;
  }
}
