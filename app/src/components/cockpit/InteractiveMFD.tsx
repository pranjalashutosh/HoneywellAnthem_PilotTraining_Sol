// Multi-Function Display — 6-tab avionics panel + training metrics.
// Tabs: Home, Radios, Flight Plan, Map, Checklists, Messages (matches real Anthem).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useUIStore, type MFDTab } from '@/stores/ui-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useVoiceStore } from '@/stores/voice-store';
import { useDrillRunner } from '@/hooks/useDrillRunner';
import { useATCEngine } from '@/hooks/useATCEngine';
import { PilotSelector } from '@/components/shared/PilotSelector';
import { DrillTimer } from '@/components/drill/DrillTimer';
import { TranscriptDisplay } from '@/components/voice/TranscriptDisplay';
import { PTTButton } from '@/components/voice/PTTButton';
import { InlineFrequencyNumpad } from '@/components/controls/InlineFrequencyNumpad';
import { isFrequencyAction, frequencyMatchesExpected } from '@/lib/frequency-utils';
import { MapDisplay } from '@/components/map/MapDisplay';
import { FlightPlanTab } from '@/components/cockpit/FlightPlanTab';
import type { DrillDefinition, ATCInstructionEvent, CockpitActionEvent } from '@/types';

interface InteractiveMFDProps {
  scenarioStatus: 'conflict' | 'resolved';
  responseTimeMs: number;
  modeSelectionCorrect: boolean;
  atcCompliance: boolean;
  conditionStatus: Map<string, boolean>;
  width?: number;
}

const TAB_CONFIG: { id: MFDTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '\u2302' },
  { id: 'radios', label: 'Radios', icon: '\u266A' },
  { id: 'flightplan', label: 'Flight Plan', icon: '\u2708' },
  { id: 'map', label: 'Map', icon: '\uD83D\uDDFA' },
  { id: 'checklists', label: 'Checklists', icon: '\u2610' },
  { id: 'messages', label: 'Messages', icon: '\u26A0' },
];

export function InteractiveMFD({
  scenarioStatus,
  responseTimeMs,
  modeSelectionCorrect,
  atcCompliance,
  conditionStatus,
  width,
}: InteractiveMFDProps) {
  const activeTab = useUIStore((s) => s.mfdTab);
  const setActiveTab = useUIStore((s) => s.setMfdTab);
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const standbyFrequency = useCockpitStore((s) => s.standbyFrequency);
  const currentAltitude = useCockpitStore((s) => s.altitude);
  const desiredAltitude = useCockpitStore((s) => s.desiredAltitude);

  const { phase, currentEvent } = useDrillRunner();

  // Detect frequency-related cockpit_action events for the inline numpad
  const isFreqCockpitAction =
    (phase === 'active' || phase === 'decision') &&
    currentEvent?.type === 'cockpit_action' &&
    isFrequencyAction((currentEvent as CockpitActionEvent).expectedAction);

  const freqActionEvent = isFreqCockpitAction
    ? (currentEvent as CockpitActionEvent)
    : null;

  // Track whether the frequency action was completed (for RadiosTab to show Continue)
  const [freqActionDone, setFreqActionDone] = useState<{
    success: boolean;
    details: Record<string, unknown>;
  } | null>(null);

  // Reset when event changes
  const freqActionEventRef = useRef(freqActionEvent);
  useEffect(() => {
    if (freqActionEvent !== freqActionEventRef.current) {
      freqActionEventRef.current = freqActionEvent;
      setFreqActionDone(null);
    }
  }, [freqActionEvent]);

  const handleFrequencyConfirmed = useCallback(
    (value: number) => {
      if (!freqActionEvent) return;
      const expected = freqActionEvent.expectedAction.value as number;
      const success = frequencyMatchesExpected(value, expected);
      setFreqActionDone({
        success,
        details: {
          mode: 'interactive-numpad',
          action: freqActionEvent.expectedAction,
          enteredValue: value,
          expectedValue: expected,
          actionPerformed: 'set_frequency',
        },
      });
    },
    [freqActionEvent],
  );

  const handleSwapConfirmed = useCallback(() => {
    setFreqActionDone({
      success: true,
      details: {
        mode: 'interactive-numpad',
        action: freqActionEvent?.expectedAction,
        actionPerformed: 'swap_frequencies',
      },
    });
  }, [freqActionEvent]);

  const responseTimeSec = responseTimeMs > 0 ? (responseTimeMs / 1000).toFixed(1) : '--';

  return (
    <div
      className="flex flex-col border-l border-white/10 shrink-0"
      style={{ backgroundColor: 'rgba(10,15,25,0.92)', width: width ?? 420 }}
    >
      {/* Tab bar */}
      <div className="border-b border-white/10 flex items-center justify-around py-3 px-2 shadow-lg" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-[#4EFFFC]/10'
                : 'hover:bg-white/5'
            }`}
          >
            <span
              className={`text-lg ${
                activeTab === tab.id ? 'text-[#4EFFFC]' : 'text-white/50'
              }`}
            >
              {tab.icon}
            </span>
            <span
              className={`text-[9px] font-graduate tracking-wide ${
                activeTab === tab.id ? 'text-[#A6FAF8]' : 'text-white/40'
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab header */}
        <div className="border-b border-white/10 px-4 py-2.5 shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <div className="text-[#A6FAF8] text-sm font-graduate tracking-wider font-bold">
            {TAB_CONFIG.find((t) => t.id === activeTab)?.label}
          </div>
        </div>

        {/* Map tab: relative+overflow-hidden so absolute children fill the panel */}
        <div className={`flex-1 relative bg-[#0f1923] ${activeTab !== 'map' ? 'overflow-auto p-4' : 'overflow-hidden'}`}>
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'radios' && (
            <RadiosTab
              activeFrequency={activeFrequency}
              standbyFrequency={standbyFrequency}
              freqActionEvent={freqActionEvent}
              freqActionDone={freqActionDone}
            />
          )}
          {activeTab === 'flightplan' && <FlightPlanTab />}
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'checklists' && <ChecklistsTab />}
          {activeTab === 'messages' && (
            <MessagesTab scenarioStatus={scenarioStatus} />
          )}
        </div>
      </div>

      {/* Bottom panel: Inline Frequency Numpad OR Training Metrics */}
      {isFreqCockpitAction || phase === 'active' || phase === 'decision' ? (
        <InlineFrequencyNumpad
          isPending={isFreqCockpitAction && !freqActionDone}
          pendingActionType={
            freqActionEvent
              ? (freqActionEvent.expectedAction.type as 'set_frequency' | 'swap_frequencies')
              : null
          }
          targetFrequencyHint={
            freqActionEvent?.expectedAction.type === 'set_frequency'
              ? (freqActionEvent.expectedAction.value as number)
              : undefined
          }
          instructionText={freqActionEvent?.instruction}
          onFrequencyConfirmed={handleFrequencyConfirmed}
          onSwapConfirmed={handleSwapConfirmed}
        />
      ) : conditionStatus.size > 0 ? (
        /* Active drill with interactive_cockpit metrics */
        <div className="bg-gradient-to-b from-[#1a2736] to-[#151f2b] border-t-2 border-cyan-700/50 p-4 shadow-lg">
          <div className="mb-3 pb-3 border-b border-cyan-700/30">
            <div className="text-cyan-400 text-xs font-mono tracking-widest mb-2 uppercase">
              Training Status
            </div>
            <div
              className={`text-sm font-bold flex items-center gap-2 ${
                scenarioStatus === 'conflict' ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {scenarioStatus === 'conflict' ? (
                <>
                  <span className="animate-pulse">&#9888;</span>
                  <span>VNAV Constraint Active</span>
                </>
              ) : (
                <>
                  <span>&#10003;</span>
                  <span>Scenario Resolved</span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2.5 text-xs">
            <MetricRow
              label="Response Time"
              value={`${responseTimeSec}s`}
              active={responseTimeMs > 0}
            />
            <MetricRow
              label="Mode Selection"
              value={modeSelectionCorrect ? '\u2713 CORRECT' : 'PENDING'}
              active={modeSelectionCorrect}
            />
            <MetricRow
              label="ATC Compliance"
              value={atcCompliance ? '\u2713 ACHIEVED' : 'IN PROGRESS'}
              active={atcCompliance}
            />
            {Array.from(conditionStatus.entries()).map(([label, met]) => (
              <MetricRow
                key={label}
                label={label}
                value={met ? '\u2713 MET' : 'PENDING'}
                active={met}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Ambient mode — no active drill; show numpad in collapsed state */
        <InlineFrequencyNumpad
          isPending={false}
          pendingActionType={null}
          onFrequencyConfirmed={() => {}}
          onSwapConfirmed={() => {}}
        />
      )}

      {/* Bottom status bar */}
      <div className="bg-gradient-to-r from-[#232e3d] to-[#1a2533] border-t border-cyan-700/30 px-4 py-2.5 flex items-center justify-between text-xs shadow-lg">
        <div className="flex gap-4">
          <StatusItem label="ALT" value={`${currentAltitude.toLocaleString()} ft`} />
          <StatusItem label="TGT" value={`${desiredAltitude.toLocaleString()} ft`} />
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MetricRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-cyan-400/70 font-mono">{label}:</span>
      <span
        className={`font-bold px-2 py-0.5 rounded ${
          active
            ? 'text-green-400 bg-green-950/40'
            : 'text-gray-500 bg-slate-800/50'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-cyan-400/60 font-mono">{label}</span>
      <span className="text-white ml-2 font-mono font-bold">{value}</span>
    </div>
  );
}

// --- Tab Content Components ---

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'border-green-500 text-green-400 bg-green-500/10',
  intermediate: 'border-amber-500 text-amber-400 bg-amber-500/10',
  advanced: 'border-red-500 text-red-400 bg-red-500/10',
};

function HomeTab() {
  const { phase, activeDrill, currentEventIndex, startTime } = useDrillRunner();
  const setShowAssessment = useUIStore((s) => s.setShowAssessment);
  const sessionHistory = useAssessmentStore((s) => s.sessionHistory);

  return (
    <div className="space-y-4">
      {/* Pilot selector */}
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-400/70 text-[10px] font-mono uppercase tracking-wider mb-2">
          Pilot
        </div>
        <PilotSelector />
      </div>

      {/* System Status */}
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-4">
        <div className="text-cyan-300 font-bold mb-3">System Status</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Aircraft:</span>
            <span className="text-white">Citation CJ3+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Registration:</span>
            <span className="text-white">N389HW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Flight Time:</span>
            <span className="text-white">1:23:45</span>
          </div>
        </div>
      </div>

      {/* All Systems Normal */}
      <div className="bg-slate-900/40 border border-green-600/50 rounded-lg p-4">
        <div className="text-green-300 font-bold mb-2">All Systems Normal</div>
        <div className="text-xs text-cyan-400/70">No cautions or warnings</div>
      </div>

      {/* Training Section — drill lifecycle hub */}
      <TrainingSection
        phase={phase}
        activeDrill={activeDrill}
        currentEventIndex={currentEventIndex}
        startTime={startTime}
      />

      {/* Assessment access */}
      {sessionHistory.length > 0 && (
        <button
          onClick={() => setShowAssessment(true)}
          className="w-full text-left bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3 hover:border-cyan-400/60 transition-colors"
        >
          <div className="text-cyan-300 font-bold text-sm">View Assessment</div>
          <div className="text-cyan-400/50 text-xs font-mono mt-1">
            {sessionHistory.length} drill{sessionHistory.length !== 1 ? 's' : ''} completed
          </div>
        </button>
      )}
    </div>
  );
}

// --- Training Section: drill selection, briefing, HUD, outcome ---

function TrainingSection({
  phase,
  activeDrill,
  currentEventIndex,
  startTime,
}: {
  phase: string;
  activeDrill: DrillDefinition | null;
  currentEventIndex: number;
  startTime: number | null;
}) {
  const [showDrillList, setShowDrillList] = useState(false);
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);

  const drills = useScenarioStore((s) => s.availableDrills);
  const selectDrill = useScenarioStore((s) => s.selectDrill);
  const drillStartDrill = useScenarioStore((s) => s.startDrill);
  const resetDrill = useScenarioStore((s) => s.reset);

  // Idle — show Start Drill button and drill list
  if (phase === 'idle') {
    return (
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-400 text-xs font-mono tracking-widest mb-3 uppercase">
          Training
        </div>

        {!showDrillList ? (
          <button
            onClick={() => setShowDrillList(true)}
            className="w-full py-3 rounded-lg border-2 border-dashed border-cyan-600/40 text-cyan-300 font-bold text-sm hover:border-cyan-400 hover:bg-cyan-950/20 transition-all min-h-[44px]"
          >
            Start Drill
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 text-xs font-bold">Select Drill</span>
              <button
                onClick={() => { setShowDrillList(false); setExpandedDrillId(null); }}
                className="text-cyan-400/50 text-xs hover:text-cyan-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
            </div>

            {drills.length === 0 ? (
              <div className="text-cyan-400/40 text-xs font-mono py-4 text-center">
                Loading drills...
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-auto">
                {drills.map((drill) => (
                  <DrillListItem
                    key={drill.id}
                    drill={drill}
                    isExpanded={expandedDrillId === drill.id}
                    onToggle={() =>
                      setExpandedDrillId(expandedDrillId === drill.id ? null : drill.id)
                    }
                    onStart={() => {
                      selectDrill(drill.id);
                      setShowDrillList(false);
                      setExpandedDrillId(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Briefing — compact briefing with Begin/Cancel
  if (phase === 'briefing' && activeDrill) {
    return (
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-400 text-xs font-mono tracking-widest mb-2 uppercase">
          Briefing
        </div>
        <div className="text-cyan-300 font-bold text-sm mb-1">{activeDrill.title}</div>
        <p className="text-cyan-400/60 text-xs mb-3">{activeDrill.description}</p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_COLORS[activeDrill.difficulty] ?? ''}`}
          >
            {activeDrill.difficulty}
          </span>
          <span className="text-cyan-400/50 text-[10px] font-mono">
            {activeDrill.events.length} events
          </span>
          <span className="text-cyan-400/50 text-[10px] font-mono">
            {Math.ceil(activeDrill.duration / 60)} min
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={drillStartDrill}
            className="flex-1 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 font-bold text-xs hover:bg-cyan-600/30 transition-colors min-h-[44px]"
          >
            Begin Drill
          </button>
          <button
            onClick={resetDrill}
            className="py-2 px-3 rounded-lg border border-slate-600/50 text-slate-400 text-xs hover:text-white hover:border-slate-500 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Active/Decision — compact HUD
  if ((phase === 'active' || phase === 'decision') && activeDrill && startTime) {
    const totalEvents = activeDrill.events.length;
    const progress = ((currentEventIndex + 1) / totalEvents) * 100;

    return (
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-400 text-xs font-mono tracking-widest mb-2 uppercase">
          Active Drill
        </div>
        <div className="text-cyan-300 font-bold text-sm mb-2">{activeDrill.title}</div>
        <div className="flex items-center justify-between text-xs text-cyan-400/70 mb-2">
          <span>Event {currentEventIndex + 1}/{totalEvents}</span>
          <DrillTimer startTime={startTime} durationSeconds={activeDrill.duration} mode="elapsed" />
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-mono">In Progress</span>
        </div>
      </div>
    );
  }

  // Outcome — compact summary (full outcome is shown as overlay on PFD)
  if (phase === 'outcome') {
    return (
      <div className="bg-slate-900/40 border border-green-600/50 rounded-lg p-3">
        <div className="text-green-400 text-xs font-mono tracking-widest mb-2 uppercase">
          Drill Complete
        </div>
        <div className="text-cyan-300 font-bold text-sm mb-2">{activeDrill?.title}</div>
        <div className="text-cyan-400/50 text-xs font-mono">
          Review results in the overlay.
        </div>
      </div>
    );
  }

  return null;
}

// --- Individual drill list item ---

function DrillListItem({
  drill,
  isExpanded,
  onToggle,
  onStart,
}: {
  drill: DrillDefinition;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-800/30 transition-colors min-h-[44px]"
      >
        <span className="text-cyan-300 text-xs font-bold truncate">{drill.title}</span>
        <span
          className={`shrink-0 ml-2 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_COLORS[drill.difficulty] ?? ''}`}
        >
          {drill.difficulty}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/30">
          <p className="text-cyan-400/60 text-[11px] mt-2 mb-2">{drill.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {drill.competencies.map((comp) => (
              <span
                key={comp}
                className="rounded bg-cyan-900/30 px-1.5 py-0.5 text-[9px] font-mono text-cyan-400/70"
              >
                {comp}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-cyan-400/50 font-mono mb-3">
            <span>{drill.events.length} events</span>
            <span>{Math.ceil(drill.duration / 60)} min</span>
          </div>
          <button
            onClick={onStart}
            className="w-full py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 font-bold text-xs hover:bg-cyan-600/30 transition-colors min-h-[44px]"
          >
            Begin
          </button>
        </div>
      )}
    </div>
  );
}

function RadiosTab({
  activeFrequency,
  standbyFrequency,
  freqActionEvent,
  freqActionDone,
}: {
  activeFrequency: { value: number; label: string };
  standbyFrequency: { value: number; label: string };
  freqActionEvent: CockpitActionEvent | null;
  freqActionDone: { success: boolean; details: Record<string, unknown> } | null;
}) {
  const {
    phase,
    activeDrill,
    currentEvent,
    currentEventIndex,
    recordResult,
    advance,
    complete,
  } = useDrillRunner();

  const livekitConnected = useVoiceStore((s) => s.livekitConnected);
  const { speakATCInstruction } = useATCEngine();

  const [contactAccepted, setContactAccepted] = useState(false);
  const atcSpokenRef = useRef<number>(-1);
  const freqActionStartRef = useRef<number>(0);
  const freqResultRecordedRef = useRef(false);
  const readbackCountAtEventStartRef = useRef(0);

  // Reset contactAccepted when event changes; snapshot readback count for ATC events
  useEffect(() => {
    setContactAccepted(false);
    freqResultRecordedRef.current = false;
    readbackCountAtEventStartRef.current =
      useAssessmentStore.getState().currentDrillMetrics?.readbackScores.length ?? 0;
  }, [currentEventIndex]);

  // Track start time for frequency cockpit_action events
  useEffect(() => {
    if (freqActionEvent) {
      freqActionStartRef.current = Date.now();
    }
  }, [freqActionEvent]);

  // Auto-record when frequency action is completed by the numpad (once only)
  useEffect(() => {
    if (freqActionDone && freqActionEvent && !freqResultRecordedRef.current) {
      freqResultRecordedRef.current = true;
      const timeToComplete = Date.now() - freqActionStartRef.current;
      recordResult({
        eventType: 'cockpit_action',
        success: freqActionDone.success,
        details: {
          ...freqActionDone.details,
          timeToComplete,
          timedOut: false,
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freqActionDone]);

  const isATCEvent =
    (phase === 'active' || phase === 'decision') &&
    currentEvent?.type === 'atc_instruction';

  const isCockpitActionFreqEvent = !!freqActionEvent;

  const atcEvent = isATCEvent ? (currentEvent as ATCInstructionEvent) : null;
  const totalEvents = activeDrill?.events.length ?? 0;
  const isLastEvent = currentEventIndex >= totalEvents - 1;

  const handleAdvanceOrComplete = () => {
    if (isLastEvent) {
      complete();
    } else {
      advance();
    }
  };

  const handleAcceptContact = () => {
    if (!atcEvent) return;
    setContactAccepted(true);

    // Trigger ATC TTS (only once per event)
    if (livekitConnected && atcSpokenRef.current !== currentEventIndex) {
      atcSpokenRef.current = currentEventIndex;
      speakATCInstruction(atcEvent.prompt, atcEvent.keywords).catch((err) =>
        console.error('[RadiosTab] speakATCInstruction failed:', err),
      );
    }
  };

  // Timeout handling for frequency cockpit_action events
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
    if (!freqActionEvent || freqActionDone) return;

    const timer = setTimeout(() => {
      if (freqResultRecordedRef.current) return;
      freqResultRecordedRef.current = true;
      setTimedOut(true);
      recordResult({
        eventType: 'cockpit_action',
        success: false,
        details: {
          mode: 'interactive-numpad',
          action: freqActionEvent.expectedAction,
          timedOut: true,
          timeToComplete: freqActionEvent.timeLimitSeconds * 1000,
        },
      });
      handleAdvanceOrComplete();
    }, freqActionEvent.timeLimitSeconds * 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freqActionEvent, freqActionDone]);

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* COM Frequencies — always visible */}
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3 shrink-0">
        <div className="text-cyan-300 font-bold mb-3 text-sm">COM Radios</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-green-950/20 border border-green-600/40 rounded">
            <span className="text-cyan-400 text-sm">COM1</span>
            <span className="text-green-400 font-mono font-bold">
              {activeFrequency.value.toFixed(3)}
            </span>
            <span className="text-cyan-400 text-xs">Active</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-800/40 border border-slate-600/40 rounded">
            <span className="text-cyan-400 text-sm">COM2</span>
            <span className="text-white font-mono">
              {standbyFrequency.value.toFixed(3)}
            </span>
            <span className="text-cyan-400/50 text-xs">Standby</span>
          </div>
        </div>
      </div>

      {/* Frequency Cockpit Action — inline instruction panel */}
      {isCockpitActionFreqEvent && !timedOut && (
        <div
          className={`border-2 rounded-lg p-4 shrink-0 ${
            freqActionDone
              ? freqActionDone.success
                ? 'bg-green-950/30 border-green-500/60'
                : 'bg-red-950/30 border-red-500/60'
              : 'bg-green-950/20 border-green-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">&#9881;</span>
              <span className="text-green-300 font-bold text-xs font-mono tracking-wide uppercase">
                {freqActionEvent.expectedAction.type === 'swap_frequencies'
                  ? 'Swap Frequencies'
                  : 'Tune Frequency'}
              </span>
            </div>
            {!freqActionDone && (
              <span className="text-amber-300 text-[10px] font-mono">
                {freqActionEvent.timeLimitSeconds}s limit
              </span>
            )}
          </div>

          <p className="text-cyan-200 text-sm mb-3">
            {freqActionEvent.instruction}
          </p>

          {freqActionEvent.expectedAction.type === 'set_frequency' && !freqActionDone && (
            <p className="text-cyan-400/60 text-[10px] font-mono mb-3">
              Use the numpad below to tune the standby frequency
            </p>
          )}

          {freqActionEvent.expectedAction.type === 'swap_frequencies' && !freqActionDone && (
            <p className="text-cyan-400/60 text-[10px] font-mono mb-3">
              Use the SWAP button in the numpad below
            </p>
          )}

          {/* Success/failure feedback */}
          {freqActionDone && (
            <div className="mb-3">
              {freqActionDone.success ? (
                <div className="text-green-400 text-sm font-bold flex items-center gap-2">
                  <span>&#10003;</span>
                  <span>Action Completed Successfully</span>
                </div>
              ) : (
                <div className="text-red-400 text-sm font-bold flex items-center gap-2">
                  <span>&#10007;</span>
                  <span>Incorrect Frequency</span>
                </div>
              )}
            </div>
          )}

          {/* Continue / Skip buttons */}
          <div className="flex gap-2">
            {freqActionDone ? (
              <button
                onClick={handleAdvanceOrComplete}
                className="flex-1 py-3 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 font-bold text-sm hover:bg-cyan-600/30 transition-colors min-h-[44px]"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => {
                  recordResult({
                    eventType: 'cockpit_action',
                    success: false,
                    details: {
                      mode: 'interactive-numpad',
                      action: freqActionEvent.expectedAction,
                      timedOut: false,
                      skipped: true,
                    },
                  });
                  handleAdvanceOrComplete();
                }}
                className="py-3 px-4 rounded-lg bg-red-600/20 border border-red-500/50 text-red-300 font-bold text-xs hover:bg-red-600/30 transition-colors min-h-[44px]"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {/* Incoming ATC Contact Alert — before pilot accepts */}
      {isATCEvent && !contactAccepted && activeDrill && (
        <div className="bg-amber-950/30 border-2 border-amber-500/60 rounded-lg p-4 shrink-0 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-xl">&#9888;</span>
            <span className="text-amber-300 font-bold text-sm font-mono tracking-wide uppercase">
              Incoming ATC Contact
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-400/70 font-mono">Facility:</span>
              <span className="text-amber-200 font-bold font-mono">
                {activeDrill.atcContext.facility}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-400/70 font-mono">Callsign:</span>
              <span className="text-amber-200 font-bold font-mono">
                {activeDrill.atcContext.callsign}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-400/70 font-mono">Frequency:</span>
              <span className="text-amber-200 font-bold font-mono">
                {activeFrequency.value.toFixed(3)} MHz
              </span>
            </div>
          </div>
          <button
            onClick={handleAcceptContact}
            className="w-full py-3 rounded-lg bg-amber-600/20 border-2 border-amber-500/60 text-amber-200 font-bold text-sm hover:bg-amber-600/30 hover:border-amber-400 transition-all min-h-[44px]"
          >
            Accept Contact
          </button>
        </div>
      )}

      {/* Active ATC Communication — after pilot accepts */}
      {isATCEvent && contactAccepted && (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* ATC prompt text */}
          <div className="bg-cyan-950/20 border border-cyan-600/40 rounded-lg p-3 shrink-0">
            <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-wider mb-1">
              ATC Instruction
            </div>
            <p className="text-cyan-200 text-sm">{atcEvent?.prompt}</p>
          </div>

          {/* Transcript area */}
          <div className="flex-1 min-h-[120px]">
            <TranscriptDisplay />
          </div>

          {/* PTT button or keyboard fallback */}
          <div className="shrink-0">
            {livekitConnected ? (
              <PTTButton />
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    recordResult({
                      eventType: 'atc_instruction',
                      success: true,
                      details: { mode: 'keyboard-fallback' },
                    });
                    handleAdvanceOrComplete();
                  }}
                  className="flex-1 py-3 rounded-lg bg-green-600/20 border border-green-500/50 text-green-300 font-bold text-xs hover:bg-green-600/30 transition-colors min-h-[44px]"
                >
                  Readback Correct
                </button>
                <button
                  onClick={() => {
                    recordResult({
                      eventType: 'atc_instruction',
                      success: false,
                      details: { mode: 'keyboard-fallback' },
                    });
                    handleAdvanceOrComplete();
                  }}
                  className="py-3 px-4 rounded-lg bg-red-600/20 border border-red-500/50 text-red-300 font-bold text-xs hover:bg-red-600/30 transition-colors min-h-[44px]"
                >
                  Skip
                </button>
              </div>
            )}
          </div>

          {/* Continue button — only shown for voice path (keyboard fallback buttons handle their own advance) */}
          {livekitConnected && (
            <button
              onClick={() => {
                // Record EventResult for voice-path ATC events
                const currentReadbacks =
                  useAssessmentStore.getState().currentDrillMetrics?.readbackScores.length ?? 0;
                const receivedAssessment = currentReadbacks > readbackCountAtEventStartRef.current;
                const latestReadback = receivedAssessment
                  ? useAssessmentStore.getState().currentDrillMetrics?.readbackScores[currentReadbacks - 1]
                  : null;
                recordResult({
                  eventType: 'atc_instruction',
                  success: latestReadback
                    ? latestReadback.confidenceAdjustedAccuracy >= 70
                    : true,
                  details: { mode: 'voice', receivedAssessment },
                });
                handleAdvanceOrComplete();
              }}
              className="w-full py-3 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 font-bold text-sm hover:bg-cyan-600/30 transition-colors min-h-[44px] shrink-0"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {/* NAV Radios — only shown when no ATC or frequency cockpit_action event is active */}
      {!isATCEvent && !isCockpitActionFreqEvent && (
        <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3 shrink-0">
          <div className="text-cyan-300 font-bold mb-3 text-sm">NAV Radios</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-slate-800/40 border border-slate-600/40 rounded">
              <span className="text-cyan-400 text-sm">NAV1</span>
              <span className="text-white font-mono">110.40</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-800/40 border border-slate-600/40 rounded">
              <span className="text-cyan-400 text-sm">NAV2</span>
              <span className="text-white font-mono">114.90</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapTab() {
  // Absolute fill: breaks out of overflow-auto height containment issue
  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapDisplay />
    </div>
  );
}

function ChecklistsTab() {
  return (
    <div className="space-y-3">
      <div className="bg-green-950/20 border border-green-600/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-green-400 font-bold">Before Takeoff</div>
          <div className="text-green-400 text-xs">&#10003; Complete</div>
        </div>
      </div>
      <div className="bg-green-950/20 border border-green-600/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-green-400 font-bold">After Takeoff</div>
          <div className="text-green-400 text-xs">&#10003; Complete</div>
        </div>
      </div>
      <div className="bg-slate-900/40 border-2 border-cyan-600/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-cyan-300 font-bold">Descent</div>
          <div className="text-amber-400 text-xs">In Progress</div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-green-400">
            <span>&#10003;</span>
            <span>Altimeters - Set</span>
          </div>
          <div className="flex items-center gap-2 text-green-400">
            <span>&#10003;</span>
            <span>Autopilot - Check</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300">
            <span>&#9675;</span>
            <span>Approach Briefing - Complete</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-slate-600/50 rounded-lg p-3 opacity-50">
        <div className="flex items-center justify-between">
          <div className="text-slate-400 font-bold">Before Landing</div>
          <div className="text-slate-400 text-xs">Pending</div>
        </div>
      </div>
    </div>
  );
}

function MessagesTab({
  scenarioStatus,
}: {
  scenarioStatus: 'conflict' | 'resolved';
}) {
  return (
    <div className="space-y-2">
      {scenarioStatus === 'conflict' && (
        <div className="bg-amber-950/30 border border-amber-600/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-lg">&#9888;</span>
            <div className="flex-1">
              <div className="text-amber-400 font-bold text-sm mb-1">CAUTION</div>
              <div className="text-amber-300 text-xs">
                Altitude constraint active - VNAV limiting descent
              </div>
              <div className="text-amber-400/60 text-[10px] mt-1">
                {new Date().toISOString().slice(11, 19)}Z
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-cyan-400 text-lg">&#8505;</span>
          <div className="flex-1">
            <div className="text-cyan-300 font-bold text-sm mb-1">ADVISORY</div>
            <div className="text-cyan-200 text-xs">
              Approaching 10,000 ft - Speed restriction 250 KIAS
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-green-600/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-lg">&#10003;</span>
          <div className="flex-1">
            <div className="text-green-300 font-bold text-sm mb-1">STATUS</div>
            <div className="text-green-200 text-xs">
              Autopilot engaged - All systems normal
            </div>
          </div>
        </div>
      </div>
      {scenarioStatus === 'resolved' && (
        <div className="bg-green-950/20 border border-green-600/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-lg">&#10003;</span>
            <div className="flex-1">
              <div className="text-green-300 font-bold text-sm mb-1">RESOLVED</div>
              <div className="text-green-200 text-xs">
                Automation conflict resolved - descending to assigned altitude
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
