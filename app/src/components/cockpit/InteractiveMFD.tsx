// Multi-Function Display — 6-tab avionics panel + training metrics.
// Tabs: Home, Radios, Flight Plan, Map, Checklists, Messages (matches real Anthem).

import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Radio, Route, Map, ListChecks, MessageSquare, AlertTriangle, Info, CheckCircle, Mic, type LucideIcon } from 'lucide-react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useUIStore, type MFDTab } from '@/stores/ui-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useVoiceStore } from '@/stores/voice-store';
import { useFreeTalkStore } from '@/stores/freetalk-store';
import { useDrillRunner } from '@/hooks/useDrillRunner';
import { startDrill as runnerStartDrill } from '@/services/scenario-runner';
import { useATCEngine } from '@/hooks/useATCEngine';
import { PilotSelector } from '@/components/shared/PilotSelector';
import { DrillTimer } from '@/components/drill/DrillTimer';
import { TranscriptDisplay } from '@/components/voice/TranscriptDisplay';
import { PTTButton } from '@/components/voice/PTTButton';
import { InlineFrequencyNumpad } from '@/components/controls/InlineFrequencyNumpad';
import { isFrequencyAction, frequencyMatchesExpected } from '@/lib/frequency-utils';
import { MapDisplay } from '@/components/map/MapDisplay';
import { FlightPlanTab } from '@/components/cockpit/FlightPlanTab';
import { FreeTalkPanel } from '@/components/cockpit/FreeTalkPanel';
import type { DrillDefinition, ATCInstructionEvent, CockpitActionEvent } from '@/types';
import { PHASE_II_DRILL_IDS } from '@/data/drills';


interface InteractiveMFDProps {
  scenarioStatus: 'conflict' | 'resolved';
  responseTimeMs: number;
  modeSelectionCorrect: boolean;
  atcCompliance: boolean;
  conditionStatus: Map<string, boolean>;
  width?: number;
}

const TAB_CONFIG: { id: MFDTab; label: string; Icon: LucideIcon }[] = [
  { id: 'home',       label: 'HOME',     Icon: Home },
  { id: 'radios',     label: 'RADIOS',   Icon: Radio },
  { id: 'flightplan', label: 'FLT PLAN', Icon: Route },
  { id: 'map',        label: 'MAP',      Icon: Map },
  { id: 'checklists', label: 'CHKLST',   Icon: ListChecks },
  { id: 'messages',   label: 'MSGS',     Icon: MessageSquare },
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

  const freetalkPhase = useFreeTalkStore((s) => s.phase);

  const { phase, currentEvent } = useDrillRunner();

  // Detect frequency-related cockpit_action events for the inline numpad
  const isFreqCockpitAction =
    (phase === 'active' || phase === 'decision') &&
    currentEvent?.type === 'cockpit_action' &&
    isFrequencyAction((currentEvent as CockpitActionEvent).expectedAction);

  const freqActionEvent = isFreqCockpitAction
    ? (currentEvent as CockpitActionEvent)
    : null;

  // Track whether the frequency action was completed (for auto-advance)
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
      <div
        className="flex items-center justify-around px-1"
        style={{ backgroundColor: 'rgba(6,16,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, paddingBottom: 6 }}
      >
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center transition-all"
              style={{
                gap: 4,
                minWidth: 52,
                minHeight: 52,
                flex: 1,
                borderRadius: 0,
                borderBottom: isActive ? '2.5px solid #0d7377' : '2.5px solid transparent',
                backgroundColor: isActive ? 'rgba(13,115,119,0.08)' : 'transparent',
                padding: '6px 4px',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            >
              <tab.Icon
                size={20}
                strokeWidth={1.6}
                color={isActive ? '#22d3ee' : 'rgba(255,255,255,0.55)'}
              />
              <span
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab header */}
        <div className="px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.18)', paddingTop: 10, paddingBottom: 10 }}>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 600, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {TAB_CONFIG.find((t) => t.id === activeTab)?.label}
          </div>
        </div>

        {/* Tab content — ATC radios uses overflow-hidden + flex to pin PTT at bottom */}
        <div className={`flex-1 relative bg-[#0f1923] ${
          activeTab === 'map'
            ? 'overflow-hidden'
            : (activeTab === 'radios' && (phase === 'active' || phase === 'decision') && currentEvent?.type === 'atc_instruction')
              ? 'overflow-hidden p-4 flex flex-col'
              : 'overflow-auto p-4'
        }`}>
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'radios' && (
            <>
              <RadiosTab
                activeFrequency={activeFrequency}
                standbyFrequency={standbyFrequency}
                freqActionEvent={freqActionEvent}
                freqActionDone={freqActionDone}
              />
              {freetalkPhase === 'active' && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                  <FreeTalkPanel />
                </div>
              )}
            </>
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
        <div style={{ background: 'rgba(6,16,26,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fontWeight: 600, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Training Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: scenarioStatus === 'conflict' ? '#ef4444' : '#34d399' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: scenarioStatus === 'conflict' ? '#ef4444' : '#34d399', display: 'inline-block', flexShrink: 0 }} />
              {scenarioStatus === 'conflict' ? 'VNAV Constraint Active' : 'Scenario Resolved'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MetricRow label="Response Time" value={`${responseTimeSec}s`} active={responseTimeMs > 0} />
            <MetricRow label="Mode Selection" value={modeSelectionCorrect ? 'CORRECT' : 'PENDING'} active={modeSelectionCorrect} />
            <MetricRow label="ATC Compliance" value={atcCompliance ? 'ACHIEVED' : 'IN PROGRESS'} active={atcCompliance} />
            {Array.from(conditionStatus.entries()).map(([label, met]) => (
              <MetricRow key={label} label={label} value={met ? 'MET' : 'PENDING'} active={met} />
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
      <div className="flex items-center justify-between px-4" style={{ height: 34, borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(6,16,26,0.98)' }}>
        <div className="flex gap-4">
          <StatusItem label="ALT" value={`${currentAltitude.toLocaleString()}`} />
          <StatusItem label="TGT" value={`${desiredAltitude.toLocaleString()}`} />
        </div>
        <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ft</span>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MetricRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: '#0891b2' }}>{label}</span>
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 4,
        color: active ? '#34d399' : 'rgba(255,255,255,0.25)',
        background: active ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {value}
      </span>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: '#0891b2', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace", fontSize: 13, fontWeight: 500, color: '#22d3ee' }}>{value}</span>
    </div>
  );
}

// --- Tab Content Components ---

const DIFFICULTY_COLORS: Record<string, { border: string; color: string; bg: string }> = {
  beginner: { border: 'rgba(52,211,153,0.45)', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  intermediate: { border: 'rgba(252,176,69,0.45)', color: '#fbbf24', bg: 'rgba(252,176,69,0.08)' },
  advanced: { border: 'rgba(248,113,113,0.45)', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
};

function HomeTab() {
  const { phase, activeDrill, currentEventIndex, startTime } = useDrillRunner();
  const setShowAssessment = useUIStore((s) => s.setShowAssessment);
  const sessionHistory = useAssessmentStore((s) => s.sessionHistory);

  const cardStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: '12px 14px',
  };

  return (
    <div className="flex flex-col gap-[14px] min-h-full">
      {/* Pilot selector */}
      <div style={cardStyle}>
        <div className="font-graduate font-semibold mb-2" style={{ fontSize: 14, color: '#22d3ee', letterSpacing: '0.05em' }}>
          PILOT
        </div>
        <PilotSelector />
      </div>

      {/* System Status */}
      <div style={cardStyle}>
        <div className="font-graduate font-semibold mb-3" style={{ fontSize: 14, color: '#22d3ee', letterSpacing: '0.02em' }}>
          System Status
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span style={{ fontSize: 13, color: '#0891b2' }}>Aircraft:</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#e0e8ec' }}>Citation CJ3+</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span style={{ fontSize: 13, color: '#0891b2' }}>Registration:</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#e0e8ec' }}>N389HW</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span style={{ fontSize: 13, color: '#0891b2' }}>Flight Time:</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#e0e8ec' }}>1:23:45</span>
          </div>
        </div>
      </div>

      {/* All Systems Normal */}
      <div style={{ ...cardStyle, borderColor: 'rgba(52,211,153,0.12)' }}>
        <div className="font-graduate font-semibold mb-1" style={{ fontSize: 14, color: '#34d399' }}>All Systems Normal</div>
        <div style={{ fontSize: 12, color: '#0891b2' }}>No cautions or warnings</div>
      </div>

      {/* Session Stats */}
      <div style={cardStyle}>
        <div className="font-graduate font-semibold mb-2" style={{ fontSize: 13, color: '#22d3ee', letterSpacing: '0.04em' }}>SESSION</div>
        {phase === 'active' || phase === 'briefing' ? (
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 12, color: '#0891b2' }}>Active drill:</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e0e8ec' }} className="truncate ml-2 text-right max-w-[55%]">{activeDrill?.title ?? '--'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 12, color: '#0891b2' }}>Duration:</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#22d3ee', fontFamily: "'JetBrains Mono', monospace" }}>
                {startTime ? `${Math.floor((Date.now() - startTime) / 60000).toString().padStart(2,'0')}:${Math.floor(((Date.now() - startTime) % 60000) / 1000).toString().padStart(2,'0')}` : '--:--'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 12, color: '#0891b2' }}>Score:</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Tracking…</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 12, color: '#0891b2' }}>Ready state:</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e0e8ec' }}>Idle</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 12, color: '#0891b2' }}>Last drill:</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e0e8ec' }} className="truncate ml-2 text-right max-w-[55%]">
                {sessionHistory.length > 0 ? (sessionHistory[sessionHistory.length - 1]?.drillId ?? '--') : '--'}
              </span>
            </div>
            {sessionHistory.length === 0 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                Start a drill to begin tracking
              </div>
            )}
          </div>
        )}
      </div>

      {/* Push Training to bottom */}
      <div className="flex-1" />

      {/* Training Section — anchored to bottom */}
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
          className="w-full text-left transition-colors"
          style={{ ...cardStyle, borderColor: 'rgba(34,211,238,0.15)' }}
        >
          <div className="font-graduate font-semibold" style={{ fontSize: 14, color: '#22d3ee' }}>View Assessment</div>
          <div className="mt-1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
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
  const freetalkPhase = useFreeTalkStore((s) => s.phase);
  const freetalkPersonas = useFreeTalkStore((s) => s.personas);
  const freetalkActivePersonaId = useFreeTalkStore((s) => s.activePersonaId);
  const startFreeTalk = useFreeTalkStore((s) => s.startFreeTalk);
  const stopFreeTalk = useFreeTalkStore((s) => s.stopFreeTalk);
  const setActiveTab = useUIStore((s) => s.setMfdTab);
  const setFrequency = useCockpitStore((s) => s.setFrequency);

  // Free Talk active — show compact status card
  if (freetalkPhase === 'active') {
    const activePersona = freetalkPersonas.find((p) => p.id === freetalkActivePersonaId);
    return (
      <div
        className="rounded-lg"
        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', padding: '14px 16px' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" />
          <span className="font-graduate font-semibold" style={{ fontSize: 14, color: '#a78bfa', letterSpacing: '0.06em' }}>FREE TALK ACTIVE</span>
        </div>
        <div className="font-semibold" style={{ fontSize: 13, color: '#e0e8ec' }}>{activePersona?.facility ?? 'ATC'}</div>
        <button
          onClick={stopFreeTalk}
          className="mt-3 w-full transition-all active:scale-[0.98] min-h-[36px]"
          style={{
            borderRadius: 6,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          End Session
        </button>
      </div>
    );
  }

  // Free Talk connecting
  if (freetalkPhase === 'connecting') {
    return (
      <div
        className="rounded-lg"
        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', padding: '14px 16px' }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" />
          <span className="font-graduate font-semibold" style={{ fontSize: 14, color: '#a78bfa', letterSpacing: '0.06em' }}>CONNECTING...</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Establishing Free Talk session</div>
      </div>
    );
  }

  // Idle — show Start Drill button and drill list
  if (phase === 'idle') {
    return (
      <div
        className="rounded-lg"
        style={{ background: 'rgba(13,115,119,0.08)', border: '1px solid rgba(13,115,119,0.25)', padding: '16px 18px' }}
      >
        <div className="font-graduate font-semibold mb-3" style={{ fontSize: 14, color: '#22d3ee', letterSpacing: '0.06em' }}>
          TRAINING
        </div>

        {!showDrillList ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowDrillList(true)}
              className="w-full transition-all active:scale-[0.98] min-h-[44px]"
              style={{ background: '#0d7377', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', letterSpacing: '0.02em' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f8b8f'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0d7377'; }}
            >
              Start Drill
            </button>
            <button
              onClick={() => {
                // Set cockpit frequencies for Free Talk
                setFrequency({ value: 124.350, label: 'Boston Center' }, 'active');
                setFrequency({ value: 132.450, label: 'New York Approach' }, 'standby');
                startFreeTalk();
                setActiveTab('radios');
              }}
              className="w-full flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[44px]"
              style={{
                background: 'rgba(139,92,246,0.12)',
                color: '#a78bfa',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 24px',
                borderRadius: 6,
                border: '1px solid rgba(139,92,246,0.3)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.18)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.12)'; }}
            >
              <Mic size={16} strokeWidth={2} />
              Free Talk
            </button>
          </div>
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
                {drills.map((drill) => {
                  const isPhaseII = PHASE_II_DRILL_IDS.has(drill.id);
                  return (
                    <DrillListItem
                      key={drill.id}
                      drill={drill}
                      isExpanded={expandedDrillId === drill.id}
                      disabled={isPhaseII}
                      onToggle={() =>
                        setExpandedDrillId(expandedDrillId === drill.id ? null : drill.id)
                      }
                      onStart={() => {
                        runnerStartDrill(drill.id);
                        setShowDrillList(false);
                        setExpandedDrillId(null);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Active/Decision — compact HUD
  if ((phase === 'active' || phase === 'decision') && activeDrill && startTime) {
    const totalEvents = activeDrill.events.length;
    const progress = ((currentEventIndex + 1) / totalEvents) * 100;

    return (
      <div className="rounded-lg" style={{ background: 'rgba(13,115,119,0.08)', border: '1px solid rgba(13,115,119,0.25)', padding: '14px 16px' }}>
        <div className="font-graduate font-semibold mb-2" style={{ fontSize: 14, color: '#22d3ee', letterSpacing: '0.06em' }}>ACTIVE DRILL</div>
        <div className="font-semibold mb-2" style={{ fontSize: 13, color: '#e0e8ec' }}>{activeDrill.title}</div>
        <div className="flex items-center justify-between mb-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span>Event {currentEventIndex + 1}/{totalEvents}</span>
          <DrillTimer startTime={startTime} durationSeconds={activeDrill.duration} mode="elapsed" />
        </div>
        <div className="w-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#22d3ee', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
          <span style={{ fontSize: 11, color: '#34d399' }}>In Progress</span>
        </div>
      </div>
    );
  }

  // Outcome — compact summary (full outcome is shown as overlay on PFD)
  if (phase === 'outcome') {
    return (
      <div className="rounded-lg" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', padding: '14px 16px' }}>
        <div className="font-graduate font-semibold mb-2" style={{ fontSize: 14, color: '#34d399', letterSpacing: '0.06em' }}>DRILL COMPLETE</div>
        <div className="font-semibold mb-1" style={{ fontSize: 13, color: '#e0e8ec' }}>{activeDrill?.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Review results in the overlay.</div>
      </div>
    );
  }

  return null;
}

// --- Individual drill list item ---

function DrillListItem({
  drill,
  isExpanded,
  disabled,
  onToggle,
  onStart,
}: {
  drill: DrillDefinition;
  isExpanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const diffColors = DIFFICULTY_COLORS[drill.difficulty];
  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{
        border: disabled ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all active:scale-[0.99] min-h-[44px]"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <span className="font-graduate font-semibold truncate" style={{ fontSize: 12, color: '#e0e8ec' }}>{drill.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {disabled && (
            <span
              className="font-graduate font-bold uppercase"
              style={{
                fontSize: 8,
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(139,92,246,0.4)',
                color: 'rgba(167,139,250,0.9)',
                background: 'rgba(139,92,246,0.1)',
                letterSpacing: '0.05em',
              }}
            >
              PHASE II
            </span>
          )}
          <span
            className="font-graduate font-bold uppercase"
            style={{
              fontSize: 9,
              padding: '2px 7px',
              borderRadius: 4,
              border: `1px solid ${diffColors?.border ?? 'rgba(255,255,255,0.2)'}`,
              color: diffColors?.color ?? 'rgba(255,255,255,0.5)',
              background: diffColors?.bg ?? 'transparent',
              minWidth: 64,
              textAlign: 'center',
            }}
          >
            {drill.difficulty}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="mt-2 mb-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{drill.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {drill.competencies.map((comp) => (
              <span
                key={comp}
                className="font-graduate"
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(13,115,119,0.1)',
                  border: '1px solid rgba(13,115,119,0.3)',
                  color: '#22d3ee',
                }}
              >
                {comp}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-3" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            <span>{drill.events.length} events</span>
            <span>{Math.ceil(drill.duration / 60)} min</span>
          </div>
          {disabled ? (
            <div
              className="w-full font-graduate font-bold text-center min-h-[40px] flex items-center justify-center"
              style={{
                borderRadius: 6,
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: 'rgba(167,139,250,0.7)',
                fontSize: 11,
                letterSpacing: '0.04em',
              }}
            >
              Coming in Phase II
            </div>
          ) : (
            <button
              onClick={onStart}
              className="w-full font-graduate font-bold transition-all min-h-[40px]"
              style={{
                borderRadius: 6,
                background: '#0d7377',
                border: '1px solid rgba(13,115,119,0.7)',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f8b8f'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0d7377'; }}
            >
              Begin Drill
            </button>
          )}
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
  const handleKeyboardReadback = useScenarioStore((s) => s.handleKeyboardReadback);
  const { speakATCInstruction } = useATCEngine();

  const [contactAccepted, setContactAccepted] = useState(false);
  const atcSpokenRef = useRef<number>(-1);
  const freqActionStartRef = useRef<number>(0);
  const freqResultRecordedRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isATCEvent =
    (phase === 'active' || phase === 'decision') &&
    currentEvent?.type === 'atc_instruction';

  const isCockpitActionFreqEvent = !!freqActionEvent;

  const atcEvent = isATCEvent ? (currentEvent as ATCInstructionEvent) : null;
  const totalEvents = activeDrill?.events.length ?? 0;
  const isLastEvent = currentEventIndex >= totalEvents - 1;

  const handleAdvanceOrComplete = useCallback(() => {
    if (isLastEvent) {
      complete();
    } else {
      advance();
    }
  }, [isLastEvent, complete, advance]);

  const handleAcceptContact = useCallback(() => {
    if (!atcEvent) return;
    setContactAccepted(true);

    // Trigger ATC TTS (only once per event)
    if (livekitConnected && atcSpokenRef.current !== currentEventIndex) {
      atcSpokenRef.current = currentEventIndex;
      speakATCInstruction(atcEvent.prompt, atcEvent.keywords).catch((err) =>
        console.error('[RadiosTab] speakATCInstruction failed:', err),
      );
    }
  }, [atcEvent, livekitConnected, currentEventIndex, speakATCInstruction]);

  // Auto-advance for ATC readback is handled headlessly by scenario-store's
  // setReadbackReceived(). No useEffect here — the store owns the entire
  // readback → verification → advance flow. See feedback_headless_evaluation.md.

  // Reset state when event changes
  // Reset state when event changes
  useEffect(() => {
    setContactAccepted(false);
    if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
  }, [currentEventIndex]);

  // Auto-advance after frequency action is completed
  const freqAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (freqActionDone && freqActionEvent && !freqResultRecordedRef.current) {
      freqResultRecordedRef.current = true;
      const elapsed = Date.now() - freqActionStartRef.current;
      recordResult({
        eventType: 'cockpit_action',
        success: freqActionDone.success,
        details: {
          ...freqActionDone.details,
          timeToComplete: elapsed,
        },
      });
      // Brief delay so pilot sees the success/failure feedback
      freqAutoAdvanceRef.current = setTimeout(() => {
        handleAdvanceOrComplete();
      }, 1500);
    }
    return () => {
      if (freqAutoAdvanceRef.current) clearTimeout(freqAutoAdvanceRef.current);
    };
  }, [freqActionDone, freqActionEvent, recordResult, handleAdvanceOrComplete]);

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
      <div className="shrink-0" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 14px' }}>
        <div className="font-graduate font-semibold mb-3" style={{ fontSize: 13, color: '#22d3ee', letterSpacing: '0.04em' }}>COM RADIOS</div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-2 py-1.5 rounded" style={{ background: 'rgba(13,115,119,0.06)', borderLeft: '2px solid rgba(34,211,238,0.4)' }}>
            <span style={{ fontSize: 12, color: '#0891b2' }}>COM1</span>
            <span className="font-mono font-semibold" style={{ fontSize: 13, color: '#22d3ee' }}>{activeFrequency.value.toFixed(3)}</span>
            <span style={{ fontSize: 11, color: '#34d399' }}>Active</span>
          </div>
          <div className="flex justify-between items-center px-2 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: 12, color: '#0891b2' }}>COM2</span>
            <span className="font-mono" style={{ fontSize: 13, color: '#e0e8ec' }}>{standbyFrequency.value.toFixed(3)}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Standby</span>
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

          {/* Auto-advances after completion — no manual button needed */}
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
          <div className="flex-1 min-h-[120px] overflow-hidden">
            <TranscriptDisplay />
          </div>

          {/* PTT button (when connected) + keyboard fallback (always available) */}
          <div className="shrink-0 space-y-2">
            {livekitConnected && <PTTButton />}
            <div className="flex gap-2">
              <button
                onClick={() => { console.log('🟣 [InteractiveMFD] Readback Correct clicked'); handleKeyboardReadback(true); }}
                className="flex-1 py-2 rounded-lg bg-green-600/20 border border-green-500/50 text-green-300 font-bold text-xs hover:bg-green-600/30 transition-colors min-h-[36px]"
              >
                Readback Correct
              </button>
              <button
                onClick={() => { console.log('🟣 [InteractiveMFD] Skip clicked'); handleKeyboardReadback(false); }}
                className="py-2 px-4 rounded-lg bg-red-600/20 border border-red-500/50 text-red-300 font-bold text-xs hover:bg-red-600/30 transition-colors min-h-[36px]"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV Radios — only shown when no ATC or frequency cockpit_action event is active */}
      {!isATCEvent && !isCockpitActionFreqEvent && (
        <>
          <div className="shrink-0" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 14px' }}>
            <div className="font-graduate font-semibold mb-3" style={{ fontSize: 13, color: '#22d3ee', letterSpacing: '0.04em' }}>NAV RADIOS</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 12, color: '#0891b2' }}>NAV1</span>
                <span className="font-mono" style={{ fontSize: 13, color: '#e0e8ec' }}>110.40</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 12, color: '#0891b2' }}>NAV2</span>
                <span className="font-mono" style={{ fontSize: 13, color: '#e0e8ec' }}>114.90</span>
              </div>
            </div>
          </div>

          {/* RECENT — quick-tune frequencies */}
          <div className="shrink-0" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 14px' }}>
            <div className="font-graduate font-semibold mb-2" style={{ fontSize: 13, color: '#22d3ee', letterSpacing: '0.04em' }}>RECENT</div>
            <div className="space-y-0.5">
              {[
                { freq: '121.500', label: 'GUARD' },
                { freq: '124.350', label: 'KPBI Tower' },
                { freq: '118.400', label: 'KTEB Appr' },
              ].map(({ freq, label }) => (
                <div key={freq} className="flex justify-between items-center px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/[0.03]">
                  <span className="font-mono font-medium" style={{ fontSize: 13, color: '#22d3ee' }}>{freq}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
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
      {/* Progress summary */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Phase progress</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#22d3ee' }}>2 / 4 complete</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: '#34d399', borderRadius: 2 }} />
        </div>
      </div>

      {/* Complete phases */}
      {[{ label: 'Before Takeoff' }, { label: 'After Takeoff' }].map(({ label }) => (
        <div key={label} style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 8, padding: '10px 14px' }}>
          <div className="flex items-center justify-between">
            <div className="font-graduate font-semibold" style={{ fontSize: 13, color: '#34d399' }}>{label}</div>
            <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#34d399' }}>
              <span>&#10003;</span><span>Complete</span>
            </div>
          </div>
        </div>
      ))}

      {/* Active phase */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(34,211,238,0.25)', borderRadius: 8, padding: '12px 14px' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-graduate font-semibold" style={{ fontSize: 13, color: '#22d3ee' }}>Descent</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#eab308' }}>In Progress</div>
        </div>
        <div className="space-y-2">
          {[
            { done: true, label: 'Altimeters — Set' },
            { done: true, label: 'Autopilot — Check' },
            { done: false, label: 'Approach Briefing — Complete' },
          ].map(({ done, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              {done ? (
                <span style={{ fontSize: 13, color: '#34d399', flexShrink: 0 }}>&#10003;</span>
              ) : (
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 12, color: done ? '#34d399' : '#e0e8ec' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending phase */}
      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px', opacity: 0.5 }}>
        <div className="flex items-center justify-between">
          <div className="font-graduate font-semibold" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Before Landing</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Pending</div>
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
  const ts = new Date().toISOString().slice(11, 16) + 'Z';
  const activeMessages = scenarioStatus === 'conflict' ? 1 : 0;

  return (
    <div className="space-y-2">
      {/* Group header — ACTIVE */}
      {activeMessages > 0 && (
        <div style={{ fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.25)', paddingBottom: 4 }}>
          ACTIVE
        </div>
      )}

      {scenarioStatus === 'conflict' && (
        <div style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', borderLeft: '3px solid #eab308', borderRadius: 8, padding: '10px 12px 10px 10px' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} strokeWidth={1.8} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#eab308' }}>CAUTION</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{ts}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(234,179,8,0.8)' }}>Altitude constraint active — VNAV limiting descent</div>
            </div>
          </div>
        </div>
      )}

      {/* Group header — RESOLVED */}
      <div style={{ fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.25)', paddingTop: 4, paddingBottom: 4 }}>
        RESOLVED
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(34,211,238,0.3)', borderRadius: 8, padding: '10px 12px 10px 10px' }}>
        <div className="flex items-start gap-2">
          <Info size={15} strokeWidth={1.8} color="#22d3ee" style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#22d3ee' }}>ADVISORY</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{ts}</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Approaching 10,000 ft — speed restriction 250 KIAS</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.1)', borderLeft: '3px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '10px 12px 10px 10px' }}>
        <div className="flex items-start gap-2">
          <CheckCircle size={15} strokeWidth={1.8} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>STATUS</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{ts}</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Autopilot engaged — all systems normal</div>
          </div>
        </div>
      </div>

      {scenarioStatus === 'resolved' && (
        <div style={{ background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.12)', borderLeft: '3px solid #34d399', borderRadius: 8, padding: '10px 12px 10px 10px' }}>
          <div className="flex items-start gap-2">
            <CheckCircle size={15} strokeWidth={1.8} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>RESOLVED</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{ts}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Automation conflict resolved — descending to assigned altitude</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
