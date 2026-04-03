// T5.7 — Barrel file exporting all drills

import type { DrillDefinition } from '@/types';
import { descentConflict } from './descent-conflict';
import { weatherDiversion } from './weather-diversion';
import { predictWrongFreq } from './predict-wrong-freq';
import { runwayChange } from './runway-change';
import { holdingPattern } from './holding-pattern';
import { commsHandoff } from './comms-handoff';

export const allDrills: DrillDefinition[] = [
  descentConflict,
  weatherDiversion,
  predictWrongFreq,
  runwayChange,
  holdingPattern,
  commsHandoff,
];

/** Drill IDs gated behind Phase II — visible but not executable. */
export const PHASE_II_DRILL_IDS: ReadonlySet<string> = new Set([
  'weather-diversion',
  'predict-wrong-freq',
  'runway-change',
  'holding-pattern',
  'comms-handoff',
]);

export {
  descentConflict,
  weatherDiversion,
  predictWrongFreq,
  runwayChange,
  holdingPattern,
  commsHandoff,
};
