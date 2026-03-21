// T5.1 — VNAV Descent Conflict — Interactive Cockpit Drill (SAW, PSD, COM, FPM)
// Unified scenario: VNAV constraint prevents descent from 14,000 to 8,000.
// Pilot must recognize the constraint, switch mode, and set correct altitude.

import type { DrillDefinition } from '@/types';
import { kjfkKbos } from '@/data/flight-plans/kjfk-kbos';

export const descentConflict: DrillDefinition = {
  id: 'descent-conflict',
  title: 'VNAV Descent Conflict',
  description:
    'ATC clears descent to 8,000 but VNAV PATH is constrained at 11,000. ' +
    'Tests automation awareness, mode selection, and communication.',
  duration: 300,
  difficulty: 'intermediate',
  competencies: ['SAW', 'PSD', 'COM', 'FPM'],
  flightPlan: 'kjfk-kbos',
  initialState: {
    flightPlan: kjfkKbos,
    altitude: 14000,
    heading: 234,
    speed: 157,
    activeFrequency: { value: 121.8, label: 'Deer Valley Gnd' },
    standbyFrequency: { value: 119.3, label: 'Approach' },
    selectedMode: 'VNAV',
    desiredAltitude: 14000,
    vnavConstraint: 11000,
    autopilot: true,
    autoThrottle: true,
  },
  events: [
    {
      type: 'atc_instruction',
      prompt:
        'Issue a descent clearance to the pilot. ' +
        'Clear them to descend and maintain 8,000 feet.',
      expectedActions: [{ type: 'set_altitude', value: 8000 }],
      keywords: ['eight thousand', '8000', 'descend', 'maintain'],
    },
    {
      type: 'decision_point',
      prompt:
        'VNAV PATH is active but the aircraft is not descending below 11,000. ' +
        'ATC has cleared you to 8,000. What do you do?',
      options: [
        { id: 'a', text: 'Wait for VNAV to resolve the constraint automatically' },
        { id: 'b', text: 'Switch to FLCH or V/S mode to override the constraint' },
        { id: 'c', text: 'Disengage autopilot and hand-fly the descent' },
        { id: 'd', text: 'Request a different altitude from ATC' },
      ],
      correctOptionId: 'b',
      timeLimitSeconds: 20,
    },
    {
      type: 'atc_instruction',
      prompt: 'Confirm that the pilot is descending to 8,000 feet.',
      expectedActions: [
        { type: 'set_altitude', value: 8000 },
        { type: 'set_mode', value: 'FLCH' },
      ],
      keywords: ['eight thousand', '8000', 'descending', 'confirm'],
    },
    {
      type: 'interactive_cockpit',
      description:
        'VNAV constraint at 11,000 prevents descent to 8,000. ' +
        'Switch to FLCH or V/S and set altitude to 8,000.',
      initialCockpitOverrides: {
        altitude: 14000,
        desiredAltitude: 14000,
        selectedMode: 'VNAV',
        vnavConstraint: 11000,
        autopilot: true,
        autoThrottle: true,
      },
      successConditions: [
        {
          field: 'selectedMode',
          operator: 'in',
          value: ['FLCH', 'VS'],
          label: 'Switch from VNAV to FLCH or V/S mode',
        },
        {
          field: 'desiredAltitude',
          operator: 'eq',
          value: 8000,
          label: 'Set desired altitude to 8,000',
        },
      ],
      timeLimitSeconds: 60,
      escalationPrompt: 'Expedite descent to 8,000, traffic below.',
      escalationDelaySeconds: 30,
    },
  ],
  atcContext: {
    facility: 'Deer Valley Tower',
    sector: 'Approach',
    callsign: 'November-three-eight-niner-hotel-whiskey',
    traffic: [],
    weather: 'VMC, clear skies, winds 230/12',
  },
};
