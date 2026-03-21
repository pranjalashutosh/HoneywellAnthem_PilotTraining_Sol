// Multi-Function Display — 6-tab avionics panel + training metrics.
// Adapted from prototype's MultiFunctionDisplay. Reads from Zustand stores.

import { useState } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';

type ActiveTab = 'home' | 'audio' | 'flightplan' | 'checklists' | 'synoptics' | 'messages';

interface InteractiveMFDProps {
  scenarioStatus: 'conflict' | 'resolved';
  responseTimeMs: number;
  modeSelectionCorrect: boolean;
  atcCompliance: boolean;
  conditionStatus: Map<string, boolean>;
}

const TAB_CONFIG: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'audio', label: 'Audio', icon: '♪' },
  { id: 'flightplan', label: 'Flight Plan', icon: '✈' },
  { id: 'checklists', label: 'Checklists', icon: '☐' },
  { id: 'synoptics', label: 'Synoptics', icon: '⚙' },
  { id: 'messages', label: 'Messages', icon: '⚠' },
];

export function InteractiveMFD({
  scenarioStatus,
  responseTimeMs,
  modeSelectionCorrect,
  atcCompliance,
  conditionStatus,
}: InteractiveMFDProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flightplan');
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const standbyFrequency = useCockpitStore((s) => s.standbyFrequency);
  const flightPlan = useCockpitStore((s) => s.flightPlan);
  const currentAltitude = useCockpitStore((s) => s.altitude);
  const desiredAltitude = useCockpitStore((s) => s.desiredAltitude);

  const responseTimeSec = responseTimeMs > 0 ? (responseTimeMs / 1000).toFixed(1) : '--';

  return (
    <div className="w-[420px] bg-gradient-to-b from-[#1a2736] to-[#0f1923] flex flex-col border-l border-slate-700/50">
      {/* Tab bar */}
      <div className="bg-gradient-to-b from-[#2a3948] to-[#1f2d3c] border-b border-cyan-700/30 flex items-center justify-around py-3 px-2 shadow-lg">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-900/40'
                : 'hover:bg-cyan-900/30'
            }`}
          >
            <span
              className={`text-lg ${
                activeTab === tab.id ? 'text-cyan-300' : 'text-cyan-400'
              }`}
            >
              {tab.icon}
            </span>
            <span
              className={`text-[9px] font-mono tracking-wide ${
                activeTab === tab.id ? 'text-cyan-300' : 'text-cyan-400'
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
        <div className="bg-gradient-to-r from-[#232e3d] to-[#1a2533] border-b border-cyan-700/20 px-4 py-2.5 shadow-sm">
          <div className="text-cyan-300 text-sm font-mono tracking-wider font-bold">
            {TAB_CONFIG.find((t) => t.id === activeTab)?.label}
          </div>
        </div>

        <div className="flex-1 bg-[#0f1923] p-4 overflow-auto">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'audio' && (
            <AudioTab
              activeFrequency={activeFrequency}
              standbyFrequency={standbyFrequency}
            />
          )}
          {activeTab === 'flightplan' && (
            <FlightPlanTab
              flightPlan={flightPlan}
              desiredAltitude={desiredAltitude}
            />
          )}
          {activeTab === 'checklists' && <ChecklistsTab />}
          {activeTab === 'synoptics' && <SynopticsTab />}
          {activeTab === 'messages' && (
            <MessagesTab scenarioStatus={scenarioStatus} />
          )}
        </div>
      </div>

      {/* Training Metrics Panel */}
      <div className="bg-gradient-to-b from-[#1a2736] to-[#151f2b] border-t-2 border-cyan-700/50 p-4 shadow-lg">
        {conditionStatus.size === 0 ? (
          /* Ambient mode — no active drill scenario */
          <div>
            <div className="text-cyan-400 text-xs font-mono tracking-widest mb-2 uppercase">
              Training Status
            </div>
            <div className="text-sm text-cyan-300/60 flex items-center gap-2">
              <span>&#9673;</span>
              <span>No Active Drill</span>
            </div>
            <p className="text-[10px] text-cyan-400/40 font-mono mt-2">
              Start a drill from the Drills tab to begin a training scenario.
            </p>
          </div>
        ) : (
          /* Active drill — show metrics and condition status */
          <>
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
                value={modeSelectionCorrect ? '✓ CORRECT' : 'PENDING'}
                active={modeSelectionCorrect}
              />
              <MetricRow
                label="ATC Compliance"
                value={atcCompliance ? '✓ ACHIEVED' : 'IN PROGRESS'}
                active={atcCompliance}
              />
              {/* Show individual condition status */}
              {Array.from(conditionStatus.entries()).map(([label, met]) => (
                <MetricRow
                  key={label}
                  label={label}
                  value={met ? '✓ MET' : 'PENDING'}
                  active={met}
                />
              ))}
            </div>
          </>
        )}
      </div>

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

function HomeTab() {
  return (
    <div className="space-y-4">
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
      <div className="bg-slate-900/40 border border-green-600/50 rounded-lg p-4">
        <div className="text-green-300 font-bold mb-2">All Systems Normal</div>
        <div className="text-xs text-cyan-400/70">No cautions or warnings</div>
      </div>
    </div>
  );
}

function AudioTab({
  activeFrequency,
  standbyFrequency,
}: {
  activeFrequency: { value: number; label: string };
  standbyFrequency: { value: number; label: string };
}) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
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
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
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
    </div>
  );
}

function FlightPlanTab({
  flightPlan,
  desiredAltitude,
}: {
  flightPlan: { id: string; name: string; altitude: number; isActive: boolean }[];
  desiredAltitude: number;
}) {
  if (flightPlan.length === 0) {
    return (
      <div className="text-cyan-400/50 text-sm text-center py-8 font-mono">
        No flight plan loaded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flightPlan.map((wp, i) => {
        const isActiveWaypoint = wp.isActive;
        const borderColor = isActiveWaypoint
          ? 'border-fuchsia-600/50 bg-fuchsia-950/30'
          : i === flightPlan.length - 1
            ? 'border-green-600/50 bg-green-950/20'
            : 'border-cyan-600/50 bg-slate-900/40';

        return (
          <div
            key={wp.id}
            className={`border rounded-lg p-3 transition-all shadow-md ${borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div
                  className={`font-bold mb-1 ${
                    isActiveWaypoint
                      ? 'text-fuchsia-400 text-lg'
                      : i === flightPlan.length - 1
                        ? 'text-green-400 text-lg'
                        : 'text-cyan-300'
                  }`}
                >
                  {isActiveWaypoint ? '+ ' : i === flightPlan.length - 1 ? '✈ ' : '◆ '}
                  {wp.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-200 font-bold font-mono">
                  {wp.altitude.toLocaleString()} ft
                </div>
              </div>
            </div>
            {isActiveWaypoint && (
              <div className="mt-2 pt-2 border-t border-fuchsia-600/30">
                <div className="text-[10px] text-fuchsia-300/70 font-mono">
                  CONSTRAINT: {desiredAltitude.toLocaleString()} ft
                </div>
              </div>
            )}
          </div>
        );
      })}
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

function SynopticsTab() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-300 font-bold mb-3 text-sm">Electrical System</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Battery:</span>
            <span className="text-green-400">24.8V</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Generator 1:</span>
            <span className="text-green-400">28.5V</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Generator 2:</span>
            <span className="text-green-400">28.4V</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-300 font-bold mb-3 text-sm">Hydraulics</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-cyan-400/70">System Pressure:</span>
            <span className="text-green-400">3000 PSI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Fluid Level:</span>
            <span className="text-green-400">Normal</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-cyan-600/50 rounded-lg p-3">
        <div className="text-cyan-300 font-bold mb-3 text-sm">Fuel System</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Left Tank:</span>
            <span className="text-white">537 lb</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Right Tank:</span>
            <span className="text-white">537 lb</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400/70">Total Fuel:</span>
            <span className="text-green-400 font-bold">1074 lb</span>
          </div>
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
