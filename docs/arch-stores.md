# Zustand Store Design

Domain-sliced stores with surgical re-renders for cockpit panels.

---

## Store Slices

```typescript
// cockpit-store.ts — Aircraft and cockpit instrument state
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
  vnavConstraint: number;                   // VNAV altitude floor (blocks descent in VNAV mode)
  autopilot: boolean;                       // AP engaged/disengaged
  autoThrottle: boolean;                    // Auto-throttle engaged/disengaged
  setFrequency: (freq: Frequency, slot: 'active' | 'standby') => void;
  swapFrequencies: () => void;
  updateWaypoint: (index: number, waypoint: Partial<Waypoint>) => void;
  setMode: (mode: CockpitMode) => void;
  setAltitude: (alt: number) => void;
  setHeading: (hdg: number) => void;
  setSpeed: (spd: number) => void;
  setDesiredAltitude: (alt: number) => void;
  adjustDesiredAltitude: (direction: 'up' | 'down', step?: number) => void;
  setVnavConstraint: (alt: number) => void;
  setAutopilot: (on: boolean) => void;
  setAutoThrottle: (on: boolean) => void;
  setActiveRouteId: (id: string) => void;
  setSelectedWaypointId: (id: string | null) => void;
  loadFlightPlan: (plan: Waypoint[]) => void;
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

## Store Interaction Pattern

Stores are independent slices. Services read from stores directly (Zustand's `getState()`), and components subscribe to specific fields via selectors to avoid unnecessary re-renders.

```
Component → useStore(selector) → reactive to specific field
Service  → store.getState()   → reads snapshot, no subscription
Service  → store.setState()   → writes update, triggers subscriptions
```
