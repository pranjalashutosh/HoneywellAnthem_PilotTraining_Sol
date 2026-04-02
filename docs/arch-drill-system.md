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

// Cockpit-aware: auto-detects action via cockpit store subscription.
// Pilot performs the action on the actual cockpit controls; the system
// verifies via evaluateCockpitAction(). Manual fallback button available.
// TouchScore.cockpitVerified distinguishes auto-detected vs fallback.
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
  escalationKeywords?: string[];     // Keyword boosting for escalation readback scoring
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

---

## Drill-Cockpit Coupling

### Initial Condition System

Drills configure cockpit state atomically via `applyCockpitState(drill.initialState)` in `scenario-runner.startDrill()`. This single call replaces all individual setter calls and **bypasses hostile constraint validation** (authored data is trusted).

Per-event overrides (for `interactive_cockpit` events) use `applyCockpitOverrides(event.initialCockpitOverrides)`, which also bypasses constraints via Zustand shallow merge.

### Hostile UI Constraint Enforcement

The cockpit store validates pilot input against active constraints:

- **`requestAltitudeChange(alt)`**: In VNAV mode with `vnavConstraint > 0`, rejects altitude below the floor. Snaps `desiredAltitude` to the constraint value. Populates `lastConstraintViolation`.
- **`adjustDesiredAltitude(dir)`**: Clamps to constraint floor (snap-back). Emits violation when already at floor.
- **`setMode(mode)`**: Clears `lastConstraintViolation` on mode switch (pilot resolved the conflict).

UI components subscribe to `lastConstraintViolation` for visual feedback:
- **AutopilotControlBar**: Amber ALT readout flash, VNAV constraint dot
- **AltitudeTape**: Constraint line flash + "FLOOR" label for 2s
- **ModeAnnunciations**: "VNAV PATH REJECT" warning badge

### Cockpit-Aware Action Events

`cockpit_action` events auto-detect pilot actions via cockpit store subscription using `evaluateCockpitAction()` (`lib/cockpit-action-utils.ts`). When the expected action is detected in the store, the event auto-advances. Manual "Action Complete" fallback remains. `TouchScore.cockpitVerified` distinguishes auto-detected vs fallback.

### Drill Start Flow

Two paths start a drill, both routed through `scenario-runner.startDrill(drillId)`:

1. **MFD TrainingSection** (cockpit view): Pilot clicks "Start Drill" → selects from drill list → `runnerStartDrill(drill.id)` fires immediately. No briefing panel — cockpit state applies instantly and drill begins.
2. **DrillsTab** (standalone view): Pilot selects drill → briefing screen → clicks "Begin Drill" → `useDrillRunner().startDrill(drill.id)`. Full briefing shown before start.

Both paths call `scenario-runner.startDrill()` which: selects the drill, applies `cockpit.applyCockpitState(drill.initialState)`, initializes assessment metrics, clears voice transcripts, then starts the drill.

---

### Example Drill: VNAV Descent Conflict

A 3-event scenario where a pilot at 14,000ft in VNAV mode has an 11,000ft VNAV constraint blocking descent to 8,000ft. Pilot must read back ATC instructions, then physically recognize the VNAV constraint, switch to FLC mode, and set altitude on the interactive cockpit.

ATC instruction events use **readback-gated auto-advance**: the drill does not advance until the system receives and scores the pilot's voice readback (via `ASSESSMENT_RESULT`). There is no manual "Continue" button — the flow is fully voice-driven.

```typescript
const descentConflict: DrillDefinition = {
  id: 'descent-conflict',
  title: 'VNAV Descent Conflict',
  difficulty: 'intermediate',
  competencies: ['COM', 'FPM'],
  events: [
    { type: 'atc_instruction', ... },           // "Descend and maintain 8,000" → readback → auto-advance
    { type: 'atc_instruction', ... },            // "Confirm descending to 8,000" → readback → auto-advance
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
2. **Flight simulation:** `flight-simulation.ts` is a headless, module-scoped service running a 50ms tick (~20fps). `useAltitudeSimulation` is a thin lifecycle bridge calling `startSimulation()`/`stopSimulation()`. The consolidated `tick()` handles:
   - **Altitude convergence** — VNAV: 200ft/s, FLCH: 400ft/s, VS: 300ft/s, default: 200ft/s. VNAV respects `vnavConstraint` floor.
   - **Speed convergence** — 4 kts/s, gated by `autoThrottle === true`. Moves `speed` toward `desiredSpeed`.
   - **Heading convergence** — 4 deg/s, gated by `selectedMode === 'HDG'`. Uses shortest-arc turning with 0/360 wrap.
3. **Action tracking:** `useInteractiveCockpitTracker` subscribes to cockpit-store, records mode/altitude changes with timestamps, evaluates `CockpitSuccessCondition`s on every change
4. **Escalation:** If pilot hasn't met all conditions within `escalationDelaySeconds`, an ATC escalation message fires
4b. **Escalation voice:** If escalation fires and LiveKit is connected, `ATC_ESCALATION` message triggers agent TTS playback of the escalation prompt. Pilot may optionally read back (scored as normal readback).
5. **Completion:** When all conditions met OR `timeLimitSeconds` expires → produces `InteractiveCockpitScore` → recorded to `assessment-store` and sent to agent via `INTERACTIVE_COCKPIT_RESULT`

### CockpitState Extensions

Fields added for interactive cockpit support:
- `desiredAltitude: number` — Target altitude set by pilot (MCP altitude window)
- `desiredSpeed: number` — Target speed for auto-throttle (default 280)
- `selectedHeading: number` — Selected heading bug (default 360)
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
