# Zustand Store Design

Domain-sliced stores with surgical re-renders for cockpit panels.

---

## Core Philosophy: The Hostile UI Store Machine

### 1. The "Dumb" UI (Legacy Approach)

Standard web applications are obedient. If a user types "8000," the app updates the state to "8000." A legacy cockpit prototype is obedient—the altitude tape is just a fancy slider. This is terrible for aviation training because airplanes are not obedient.

### 2. The "Hostile" UI (Our Goal)

In aviation, "hostile" means unforgiving. A hostile UI does not trust the user. It treats user input as a **request**, not a command. When a pilot turns a knob, they are asking the computer: "Can I descend to 8,000?" The computer checks its rulebook (AFDS constraints, FMS path) and can outright refuse. If it refuses, it pushes back—the knob stops scrolling, the UI flashes a warning.

### 3. Stateful Constraints

The altitude knob's behavior depends entirely on the active AFDS mode.

- **State A (FLCH Mode):** Pilot manually commands descent. UI is obedient. Allows scroll to 8000.
- **State B (VNAV Mode):** FMS flies a 3D path with a hard floor at 11,000. UI becomes hostile. Blocks pilot from dialing below 11,000 and flashes a conflict warning.

---

## Store Slices

```typescript
// cockpit-store.ts — Aircraft and cockpit instrument state
// Implements "Hostile UI" constraint enforcement.
interface CockpitStore {
  flightPlan: Waypoint[];
  activeFrequency: Frequency;
  standbyFrequency: Frequency;
  selectedMode: CockpitMode; // NAV | APR | HDG | ALT | VS | VNAV | FLCH
  altitude: number;
  heading: number;
  speed: number;
  activeRouteId: string;                    // Selected route in registry (default: 'kteb-kpbi')
  selectedWaypointId: string | null;        // Syncs waypoint selection between map and flight plan
  desiredAltitude: number;                  // Target altitude for autopilot (MCP altitude window)
  desiredSpeed: number;                     // Target speed for auto-throttle (default 280)
  selectedHeading: number;                  // Selected heading bug (default 360)
  vnavConstraint: number;                   // VNAV altitude floor (blocks descent in VNAV mode)
  autopilot: boolean;                       // AP engaged/disengaged
  autoThrottle: boolean;                    // Auto-throttle engaged/disengaged

  // Hostile UI — constraint violation tracking
  lastConstraintViolation: ConstraintViolation | null;
  constraintViolationCount: number;

  setFrequency: (freq: Frequency, slot: 'active' | 'standby') => void;
  swapFrequencies: () => void;
  updateWaypoint: (index: number, waypoint: Partial<Waypoint>) => void;
  setMode: (mode: CockpitMode) => void;        // Clears constraint violations on mode switch
  setAltitude: (alt: number) => void;
  setHeading: (hdg: number) => void;
  setSpeed: (spd: number) => void;
  requestAltitudeChange: (alt: number) => void; // Hostile: rejects + snaps to floor in VNAV mode
  adjustDesiredAltitude: (direction: 'up' | 'down', step?: number) => void; // Hostile: clamps to floor
  setDesiredSpeed: (spd: number) => void;       // Clamp 0-500
  adjustDesiredSpeed: (direction: 'up' | 'down', step?: number) => void; // Step default 5 kts
  setSelectedHeading: (hdg: number) => void;    // Normalize 0-360
  adjustSelectedHeading: (direction: 'left' | 'right', step?: number) => void; // Step default 1 deg, wraps
  setVnavConstraint: (alt: number) => void;
  setAutopilot: (on: boolean) => void;
  setAutoThrottle: (on: boolean) => void;
  setActiveRouteId: (id: string) => void;
  setSelectedWaypointId: (id: string | null) => void;
  clearConstraintViolation: () => void;
  loadFlightPlan: (plan: Waypoint[]) => void;

  // Atomic initial conditions (bypass hostile constraints — authored data is trusted)
  applyCockpitState: (state: CockpitState) => void;
  applyCockpitOverrides: (overrides: Partial<CockpitState>) => void;

  reset: () => void;
}

// scenario-store.ts — Active drill state
interface ScenarioStore {
  availableDrills: DrillDefinition[];
  activeDrill: DrillDefinition | null;
  phase: DrillPhase; // 'idle' | 'briefing' | 'active' | 'decision' | 'outcome'
  currentEventIndex: number;
  eventResults: EventResult[];
  startTime: number | null;
  setAvailableDrills: (drills: DrillDefinition[]) => void;
  selectDrill: (drillId: string) => void;
  startDrill: () => void;
  advanceEvent: () => void;
  recordEventResult: (result: EventResult) => void;
  completeDrill: () => void;
  reset: () => void;
}

// voice-store.ts — Voice communication state
interface VoiceStore {
  isPTTPressed: boolean;
  isRecording: boolean;
  isATCSpeaking: boolean;
  interimTranscript: string;
  transcriptHistory: TranscriptEntry[];
  pttPressTimestamp: number | null;
  atcSpeakEndTimestamp: number | null;
  localSpeechOnsetTimestamp: number | null;
  livekitConnected: boolean;
  pressPTT: () => void;
  releasePTT: () => void;
  setInterimTranscript: (text: string) => void;
  commitTranscript: (entry: TranscriptEntry) => void;
  setATCSpeaking: (speaking: boolean) => void;
  setLocalSpeechOnset: (timestamp: number) => void;
  setLivekitConnected: (connected: boolean) => void;
  clearTranscripts: () => void;
  reset: () => void;
}

// assessment-store.ts — Scoring and metrics
interface AssessmentStore {
  currentDrillMetrics: DrillMetrics | null;
  sessionHistory: DrillResult[];
  cbta: CBTAScores;
  cognitiveLoadBaseline: CognitiveLoadBaseline | null;
  currentEventCognitiveLoad: CognitiveLoadScore[];
  activePilotId: string | null;
  activeSessionId: string | null;
  recordReadbackScore: (score: ReadbackScore) => void;
  recordCognitiveLoadScore: (score: CognitiveLoadScore) => void;
  recordDecisionScore: (score: DecisionScore) => void;
  recordTrapScore: (score: TrapScore) => void;
  recordTouchScore: (score: TouchScore) => void;
  recordInteractiveCockpitScore: (score: InteractiveCockpitScore) => void;
  initDrillMetrics: (drillId: string) => void;
  finalizeDrillMetrics: () => void;
  setCBTA: (scores: CBTAScores) => void;
  setCognitiveLoadBaseline: (baseline: CognitiveLoadBaseline) => void;
  setActivePilotId: (pilotId: string | null) => void;
  loadFromServer: (pilotId: string) => Promise<void>;
  saveToServer: () => Promise<void>;
  reset: () => void;
}

// pilot-store.ts — Active pilot profile
interface PilotStore {
  activePilot: PilotProfile | null;
  pilots: PilotProfile[];
  selectPilot: (id: string) => void;
  createPilot: (profile: Omit<PilotProfile, 'id' | 'createdAt' | 'lastActiveAt'>) => Promise<void>;
  loadPilots: () => Promise<void>;
}

// ui-store.ts — UI state (cockpit-first, single-screen)
interface UIStore {
  mfdWidth: number;                // Resizable sidebar width (300-600px, default 420)
  mfdTab: 'home' | 'radios' | 'flightplan' | 'map' | 'checklists' | 'messages';
  showAssessment: boolean;         // Assessment overlay visibility
  activePanel: 'flight-plan' | 'radios';
  numpadOpen: boolean;             // Legacy full-screen numpad modal
  numpadTarget: string | null;
  inlineNumpadCollapsed: boolean;  // Inline MFD frequency numpad collapse state
  setMfdWidth: (width: number) => void;
  setMfdTab: (tab: MFDTab) => void;
  setShowAssessment: (show: boolean) => void;
  setActivePanel: (panel: 'flight-plan' | 'radios') => void;
  openNumpad: (target: string) => void;
  closeNumpad: () => void;
  setInlineNumpadCollapsed: (collapsed: boolean) => void;
  toggleInlineNumpad: () => void;
}
```

// freetalk-store.ts — Free Talk session state
interface FreeTalkStore {
  phase: FreeTalkPhase;             // 'idle' | 'connecting' | 'active'
  activePersonaId: string | null;   // Currently tuned ATC persona
  personas: ATCPersona[];           // Pre-populated: Boston Center + NY Approach
  conversationLog: TranscriptEntry[];

  startFreeTalk: () => void;        // Set phase → 'connecting'
  setConnected: () => void;         // Set phase → 'active'
  stopFreeTalk: () => void;         // Set phase → 'idle', clear log
  setActivePersona: (id: string) => void;
  appendConversation: (entry: TranscriptEntry) => void;
  reset: () => void;
}
```

## Store Interaction Pattern

Stores are independent slices. Services read from stores directly (Zustand's `getState()`), and components subscribe to specific fields via selectors to avoid unnecessary re-renders.

```
Component → useStore(selector) → reactive to specific field
Service  → store.getState()   → reads snapshot, no subscription
Service  → store.setState()   → writes update, triggers subscriptions
```
