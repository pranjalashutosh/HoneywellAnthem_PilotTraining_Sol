# Drill System Architecture

Drill schema, event types, interactive cockpit subsystem, and example drills.

---

## Drill Scenario Schema

### Type Definition

```typescript
interface DrillDefinition {
  id: string;
  title: string;
  description: string;
  duration: number;              // Expected duration in seconds (180-300)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  competencies: CBTACompetency[];
  flightPlan: string;
  initialState: CockpitState;
  events: DrillEvent[];
  atcContext: {
    facility: string;
    sector: string;
    callsign: string;
    traffic: string[];
    weather: string;
  };
}

type DrillEvent =
  | ATCInstructionEvent
  | DecisionPointEvent
  | PredictSuggestionEvent
  | CockpitActionEvent
  | InteractiveCockpitEvent;

interface ATCInstructionEvent {
  type: 'atc_instruction';
  prompt: string;
  expectedActions: CockpitAction[];
  keywords: string[];
}

interface DecisionPointEvent {
  type: 'decision_point';
  prompt: string;
  options: DecisionOption[];
  correctOptionId: string;
  timeLimitSeconds: number;
}

interface PredictSuggestionEvent {
  type: 'predict_suggestion';
  suggestion: string;
  correctAction: string;
  context: string;
}

interface CockpitActionEvent {
  type: 'cockpit_action';
  instruction: string;
  expectedAction: CockpitAction;
  timeLimitSeconds: number;
}

interface InteractiveCockpitEvent {
  type: 'interactive_cockpit';
  description: string;
  initialCockpitOverrides: Partial<CockpitState>;
  successConditions: CockpitSuccessCondition[];
  timeLimitSeconds: number;
  escalationPrompt?: string;
  escalationDelaySeconds?: number;
}

interface CockpitSuccessCondition {
  field: keyof CockpitState;
  operator: 'eq' | 'lte' | 'gte' | 'neq' | 'in';
  value: number | string | string[];
  label: string;
}

interface InteractiveCockpitScore {
  conditionsMet: string[];
  allConditionsMet: boolean;
  totalTimeMs: number;
  timedOut: boolean;
  modeChanges: { mode: string; timeMs: number }[];
  altitudeChanges: { altitude: number; timeMs: number }[];
  escalationTriggered: boolean;
}
```

### Example Drill: VNAV Descent Conflict

A unified 4-event scenario where a pilot at 14,000ft in VNAV mode has an 11,000ft VNAV constraint blocking descent to 8,000ft. Pilot must recognize the constraint, decide to override, confirm with ATC, then physically switch modes and set altitude on the interactive cockpit.

```typescript
const descentConflict: DrillDefinition = {
  id: 'descent-conflict',
  title: 'VNAV Descent Conflict',
  difficulty: 'intermediate',
  competencies: ['COM', 'SAW', 'KNO', 'PSD', 'FPM'],
  events: [
    { type: 'atc_instruction', ... },           // "Descend and maintain 8,000"
    { type: 'decision_point', ... },             // Recognize VNAV constraint
    { type: 'atc_instruction', ... },            // "Confirm descending to 8,000"
    {
      type: 'interactive_cockpit',
      successConditions: [
        { field: 'selectedMode', operator: 'in', value: ['FLCH', 'VS'] },
        { field: 'desiredAltitude', operator: 'eq', value: 8000 },
      ],
      timeLimitSeconds: 60,
      escalationPrompt: 'Expedite your descent to 8,000, traffic below you.',
      escalationDelaySeconds: 30,
    },
  ],
};
```

---

## Interactive Cockpit Subsystem

When a drill contains an `interactive_cockpit` event, the system renders a 2-panel flight deck UI adapted from the Honeywell Anthem cockpit. The pilot physically operates mode buttons and altitude controls on an interactive PFD + MFD, while the system tracks every action and evaluates success conditions.

### Component Architecture

```
InteractiveCockpitView (top-level container — for interactive_cockpit events only)
├── AutopilotControlBar           — FLCH/VNAV/ALT/VS mode buttons + AP/AUTO toggles + altitude display
├── InteractivePFD (left, ~70%)   — Synthetic vision, altitude/speed/heading tapes, mode annunciations
├── InteractiveMFD (right, resizable 300-600px)  — 6 tabs + InlineFrequencyNumpad + embedded drill lifecycle
└── ATCCommunicationOverlay       — Floating ATC transcript panel with escalation messages
```

### Data Flow

1. **On mount:** `InteractiveCockpitView` applies `initialCockpitOverrides` to `cockpit-store` (once, via ref guard)
2. **Altitude simulation:** `useAltitudeSimulation` runs a 500ms interval, moving `altitude` toward `desiredAltitude` at mode-dependent rates:
   - VNAV: 100ft/tick (respects `vnavConstraint` — won't descend below constraint altitude)
   - FLCH: 200ft/tick (overrides constraint)
   - VS: 150ft/tick (overrides constraint)
   - Other modes (NAV, ALT, APR, HDG): 100ft/tick default rate
3. **Action tracking:** `useInteractiveCockpitTracker` subscribes to cockpit-store, records mode/altitude changes with timestamps, evaluates `CockpitSuccessCondition`s on every change
4. **Escalation:** If pilot hasn't met all conditions within `escalationDelaySeconds`, an ATC escalation message fires
5. **Completion:** When all conditions met OR `timeLimitSeconds` expires → produces `InteractiveCockpitScore` → recorded to `assessment-store`

### CockpitState Extensions

Fields added for interactive cockpit support:
- `desiredAltitude: number` — Target altitude set by pilot (MCP altitude window)
- `vnavConstraint: number` — VNAV altitude floor (blocks descent in VNAV mode)
- `autopilot: boolean` — AP engaged/disengaged
- `autoThrottle: boolean` — Auto-throttle engaged/disengaged
- `CockpitMode` union extended with `'VNAV' | 'FLCH'`

### Flight Plan Tab Drill Integration

`FlightPlanTab` reads `activeDrill` from `scenario-store` and maps drill IDs to training flags that drive visual changes in both the flight plan and map tabs:

| Drill ID | Training Flag | Visual Effect |
|----------|--------------|---------------|
| `descent-conflict` | `vnavConflict: true` | VNAV badges on constrained waypoints, STAR status → CHG |
| `predict-wrong-freq` | `wrongFrequency: true` | Frequency warning badges |
| `weather-diversion` | `routeDeviation: true` | Route deviation banner, APPR status → PND |
| `holding-entry` | `holding: true` | Holding pattern badges on fix |
| `comms-handoff` | `commsHandoff: true` | Comms zone badges |
| `runway-change` | `runwayChange: true` | STAR/APPR status → CHG |

Training flags flow through `FlightPlanTrainingContext` → `waypointTrainingAnnotation()` for inline waypoint badges, and `deriveProcedureStatus()` for procedure status promotion overrides. MapDisplay uses the same `activeDrill` to toggle `ScenarioOverlay` visibility.

---

### Scoring Integration

`InteractiveCockpitScore` feeds into FPM (Flight Path Management) CBTA competency:
- Conditions met percentage → base score
- Time penalty: >30s average → -10 points
- Escalation penalty: -5 points if escalation triggered
- When both `touchScores` and `interactiveCockpitScores` exist: 40% touch + 60% interactive
