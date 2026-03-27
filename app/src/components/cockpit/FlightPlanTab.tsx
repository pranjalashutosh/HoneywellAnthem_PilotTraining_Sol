// FlightPlanTab — Avionics-style MFD flight plan display.
// Flight-plan-first: real route structure is primary, training metadata is secondary.

import { useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { ROUTE_REGISTRY, ROUTE_IDS, getRoute } from '@/data/flight-plans/route-registry';
import {
  enrichWaypoints,
  computeProgress,
  deriveProcedureStatus,
  formatAltFp,
  formatBearingFp,
  formatEteFp,
  formatDistNm,
  formatRestriction,
  waypointTrainingAnnotation,
  type TrainingAnnotation,
} from '@/lib/flight-plan-utils';
import type {
  EnrichedWaypoint,
  FlightPlanMeta,
  FlightPlanProgress,
  FlightPlanTrainingContext,
  Procedure,
  ProcedureStatus,
  FlightPhase,
} from '@/types/flight-plan';

// ── Root export ───────────────────────────────────────────────────────────────

export function FlightPlanTab() {
  const flightPlan        = useCockpitStore((s) => s.flightPlan);
  const loadFlightPlan    = useCockpitStore((s) => s.loadFlightPlan);
  const activeRouteId     = useCockpitStore((s) => s.activeRouteId);
  const setActiveRouteId  = useCockpitStore((s) => s.setActiveRouteId);
  const selectedWaypointId    = useCockpitStore((s) => s.selectedWaypointId);
  const setSelectedWaypointId = useCockpitStore((s) => s.setSelectedWaypointId);
  const speed             = useCockpitStore((s) => s.speed);
  const activeDrill       = useScenarioStore((s) => s.activeDrill);

  const activeConfig = getRoute(activeRouteId);

  // Auto-load the active route's waypoints on mount if store is empty
  useEffect(() => {
    if (flightPlan.length === 0) {
      loadFlightPlan(activeConfig.package.waypoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch route: load new waypoints + update route ID (triggers map re-center)
  const handleRouteChange = useCallback(
    (routeId: string) => {
      const config = ROUTE_REGISTRY[routeId];
      if (!config || routeId === activeRouteId) return;
      loadFlightPlan(config.package.waypoints);
      setActiveRouteId(routeId);
      setSelectedWaypointId(null); // clear selection on route change
    },
    [activeRouteId, loadFlightPlan, setActiveRouteId, setSelectedWaypointId],
  );

  const enriched = useMemo(
    () => enrichWaypoints(flightPlan, speed || 280),
    [flightPlan, speed],
  );

  const meta = activeConfig.package.meta;

  // Merge training flags with active drill
  const training: FlightPlanTrainingContext = useMemo(() => {
    const flags = { ...activeConfig.package.training.flags };
    if (activeDrill) {
      if (activeDrill.id === 'descent-conflict')   flags.vnavConflict   = true;
      if (activeDrill.id === 'predict-wrong-freq') flags.wrongFrequency = true;
      if (activeDrill.id === 'weather-diversion')  flags.routeDeviation = true;
      if (activeDrill.id === 'runway-change')      flags.runwayChange   = true;
      if (activeDrill.id === 'holding-pattern')    flags.holding        = true;
      if (activeDrill.id === 'comms-handoff')      flags.commsHandoff   = true;
    }
    return { activeDrillId: activeDrill?.id, flags };
  }, [activeDrill, activeConfig]);

  // Single source of truth for all progress math
  const progress = useMemo(
    () => computeProgress(enriched, meta.cruiseAltitudeFt),
    [enriched, meta.cruiseAltitudeFt],
  );

  const activeIdx = enriched.findIndex((w) => w.isActive);

  if (enriched.length === 0) {
    return (
      <div className="text-cyan-400/50 text-sm text-center py-8 font-mono">
        Loading flight plan…
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-2">
      <RoutePicker activeRouteId={activeRouteId} onSelect={handleRouteChange} />
      <SummaryCard meta={meta} progress={progress} />
      <ProgressCard progress={progress} meta={meta} training={training} />
      <ProceduresCard meta={meta} training={training} phase={progress.phase} />
      <WaypointLegs
        waypoints={enriched}
        activeIdx={activeIdx}
        training={training}
        selectedWaypointId={selectedWaypointId}
        onSelectWaypoint={(id) =>
          setSelectedWaypointId(id === selectedWaypointId ? null : id)
        }
      />
      <TrainingStatusCard training={training} drillName={activeDrill?.title} />
    </div>
  );
}

// ── Route picker ──────────────────────────────────────────────────────────────

function RoutePicker({
  activeRouteId,
  onSelect,
}: {
  activeRouteId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-[#0a1118] border border-cyan-800/40 rounded px-2.5 py-1.5 flex items-center gap-2">
      <span className="text-[9px] font-mono text-cyan-600/60 uppercase tracking-wider shrink-0">
        Route
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ROUTE_IDS.map((id) => {
          const config = ROUTE_REGISTRY[id];
          const isActive = id === activeRouteId;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={[
                'font-mono text-[10px] px-2 py-0.5 rounded border transition-all',
                isActive
                  ? 'bg-cyan-900/50 border-cyan-400/60 text-cyan-200 font-bold'
                  : 'bg-transparent border-cyan-800/40 text-cyan-500/60 hover:border-cyan-600/60 hover:text-cyan-400/80',
              ].join(' ')}
            >
              {config?.label ?? id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ meta, progress }: { meta: FlightPlanMeta; progress: FlightPlanProgress }) {
  const traveledNm = Math.round(meta.totalDistanceNm - progress.remainingDistNm);

  return (
    <div className="bg-[#0d1520] border border-cyan-800/40 rounded p-2.5">
      {/* Row 1: callsign / type / tail */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-cyan-300 font-mono font-bold text-sm tracking-widest">
          {meta.callsign}
        </span>
        <span className="text-cyan-500/70 font-mono text-[10px] tracking-wider">
          {meta.aircraftType}
        </span>
        <span className="text-cyan-400/60 font-mono text-[11px]">{meta.tailNumber}</span>
      </div>

      {/* Row 2: departure → destination (→ alternate) */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-green-400 font-mono font-bold text-sm">{meta.departure}</span>
        <div className="flex-1 border-t border-cyan-700/30 mx-1" />
        <span className="text-cyan-400 font-mono font-bold text-sm">{meta.destination}</span>
        {meta.alternate && (
          <>
            <span className="text-cyan-600/50 font-mono text-[10px]">ALT</span>
            <span className="text-amber-400/80 font-mono text-[11px]">{meta.alternate}</span>
          </>
        )}
      </div>

      {/* Row 3: cruise params + traveled */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/70 flex-wrap">
        <span>FL{Math.round(meta.cruiseAltitudeFt / 100).toString().padStart(3, '0')}</span>
        <span className="text-cyan-700/50">·</span>
        <span>{meta.cruiseSpeedKts}KT</span>
        <span className="text-cyan-700/50">·</span>
        <span>{Math.round(meta.totalDistanceNm)}NM</span>
        <span className="text-cyan-700/50">·</span>
        <span>{formatEteFp(meta.totalEteMinutes)}</span>
        {traveledNm > 0 && (
          <>
            <span className="text-cyan-700/50">·</span>
            <span className="text-green-400/50">{traveledNm}NM fln</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Progress card ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  preflight: 'PRE-FLT',
  climb:     'CLIMB',
  cruise:    'CRUISE',
  descent:   'DESCENT',
  approach:  'APPR',
};

const PHASE_COLOR: Record<string, string> = {
  preflight: 'text-cyan-400/60 border-cyan-800/50 bg-cyan-900/20',
  climb:     'text-green-300/80 border-green-800/50 bg-green-950/20',
  cruise:    'text-cyan-300/80 border-cyan-700/50 bg-cyan-900/30',
  descent:   'text-amber-300/80 border-amber-800/50 bg-amber-950/20',
  approach:  'text-green-300/90 border-green-700/60 bg-green-950/30',
};

function ProgressCard({
  progress,
  meta,
  training,
}: {
  progress: FlightPlanProgress;
  meta: FlightPlanMeta;
  training: FlightPlanTrainingContext;
}) {
  const {
    progressPct, remainingDistNm, remainingEteMinutes, distToNextNm,
    activeWaypointName, nextWaypointName, phase, todCueNm,
  } = progress;

  const phaseColor = PHASE_COLOR[phase] ?? PHASE_COLOR['cruise'];
  const deviating  = training.flags.routeDeviation;

  return (
    <div className={[
      'border rounded p-2.5 transition-colors',
      deviating ? 'bg-red-950/15 border-red-800/40' : 'bg-[#0d1520] border-cyan-800/40',
    ].join(' ')}>

      {/* Phase chip + progress pct */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={[
          'text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider',
          phaseColor,
        ].join(' ')}>
          {PHASE_LABELS[phase] ?? phase}
        </span>

        <div className="flex items-center gap-2">
          {deviating && (
            <span className="text-[9px] font-mono text-red-400/90 font-bold tracking-wider animate-pulse">
              ⚠ OFF ROUTE
            </span>
          )}
          <span className="text-[10px] font-mono text-cyan-400/50">{progressPct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-slate-800/60 rounded-full overflow-hidden mb-1.5">
        <div
          className={[
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            deviating ? 'bg-red-500/60' : 'bg-cyan-500/70',
          ].join(' ')}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Dep → Dest labels */}
      <div className="flex items-center justify-between text-[9px] font-mono mb-1.5">
        <span className="text-green-400/60">{meta.departure}</span>
        <span className="text-cyan-600/40 text-[8px]">
          {Math.round(meta.totalDistanceNm - remainingDistNm)}NM · {Math.round(remainingDistNm)}NM rem
        </span>
        <span className="text-cyan-400/50">{meta.destination}</span>
      </div>

      {/* Active → Next leg strip */}
      {activeWaypointName && (
        <div className="flex items-center gap-1.5 mb-1.5 px-1 py-1 rounded bg-[#0a1520]/60 border border-cyan-900/30">
          <span className="text-cyan-300 font-mono font-bold text-[12px] tracking-wider">
            {activeWaypointName}
          </span>
          <span className="text-cyan-700/50 text-[10px]">▶</span>
          {nextWaypointName ? (
            <span className="text-cyan-500/80 font-mono text-[11px] tracking-wide">
              {nextWaypointName}
            </span>
          ) : (
            <span className="text-green-400/60 font-mono text-[10px]">DEST</span>
          )}
          {distToNextNm > 0 && (
            <span className="ml-auto text-[10px] font-mono text-cyan-400/60 tabular-nums">
              {formatDistNm(distToNextNm)}NM
            </span>
          )}
        </div>
      )}

      {/* Stats row: ETE / TOD cue */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/60">
        <span className="tabular-nums">{Math.round(remainingDistNm)}NM rem</span>
        <span className="text-cyan-800/50">·</span>
        <span>ETE {formatEteFp(remainingEteMinutes)}</span>
        {todCueNm !== undefined && todCueNm > 2 && (
          <>
            <span className="text-cyan-800/50">·</span>
            <span className="text-amber-400/70">TOD {Math.round(todCueNm)}NM</span>
          </>
        )}
        {todCueNm !== undefined && todCueNm <= 2 && (
          <>
            <span className="text-cyan-800/50">·</span>
            <span className="text-amber-300/90 font-bold">↓ DESCEND NOW</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Procedures card ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ProcedureStatus, string> = {
  planned: 'text-cyan-700/60 border-cyan-800/40 bg-transparent',
  active:  'text-green-300/90 border-green-700/60 bg-green-950/20',
  changed: 'text-amber-300/90 border-amber-600/70 bg-amber-950/20',
  pending: 'text-amber-500/70 border-amber-800/50 bg-amber-950/10',
};

const STATUS_LABEL: Record<ProcedureStatus, string> = {
  planned: 'PLN',
  active:  'ACT',
  changed: 'CHG',
  pending: 'PND',
};

function ProcedureBadge({ proc, liveStatus }: { proc: Procedure; liveStatus: ProcedureStatus }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className={[
        'font-mono font-bold text-[11px] tracking-wider',
        liveStatus === 'changed' ? 'text-amber-300' :
        liveStatus === 'active'  ? 'text-green-300/90' :
        liveStatus === 'pending' ? 'text-amber-400/70' :
        'text-cyan-300/80',
      ].join(' ')}>
        {proc.code}
      </span>
      {proc.transition && (
        <span className="text-[9px] font-mono text-cyan-600/50 truncate">/{proc.transition}</span>
      )}
      <span className={[
        'text-[8px] font-mono px-1 py-0.5 rounded border uppercase tracking-wider shrink-0',
        STATUS_STYLE[liveStatus],
      ].join(' ')}>
        {STATUS_LABEL[liveStatus]}
      </span>
    </div>
  );
}

function ProceduresCard({
  meta,
  training,
  phase,
}: {
  meta: FlightPlanMeta;
  training: FlightPlanTrainingContext;
  phase: FlightPhase;
}) {
  // Derive live status for each procedure from phase + training flags
  const sidStatus  = deriveProcedureStatus('sid',      phase, training.flags);
  const starStatus = deriveProcedureStatus('star',     phase, training.flags);
  const apprStatus = deriveProcedureStatus('approach', phase, training.flags);

  const runwayChanged = training.flags.runwayChange;

  return (
    <div className="bg-[#0d1520] border border-cyan-800/40 rounded px-2.5 py-1.5">
      {/* SID / STAR / APPR row */}
      <div className="flex items-start gap-4 flex-wrap">
        {meta.sid && (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-mono text-cyan-600/50 uppercase tracking-wider">SID</span>
            <ProcedureBadge proc={meta.sid} liveStatus={sidStatus} />
          </div>
        )}
        {meta.star && (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-mono text-cyan-600/50 uppercase tracking-wider">STAR</span>
            <ProcedureBadge proc={meta.star} liveStatus={starStatus} />
          </div>
        )}
        {meta.approach && (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-mono text-cyan-600/50 uppercase tracking-wider">APPR</span>
            <ProcedureBadge proc={meta.approach} liveStatus={apprStatus} />
          </div>
        )}
      </div>

      {/* Runways row */}
      {(meta.departureRunway || meta.arrivalRunway) && (
        <div className="mt-1.5 pt-1.5 border-t border-cyan-800/20 flex items-center gap-4">
          {meta.departureRunway && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-cyan-600/50 uppercase tracking-wider">
                DEP RWY
              </span>
              <span className="text-[11px] font-mono text-cyan-300/80 font-bold">
                {meta.departureRunway}
              </span>
            </div>
          )}
          {meta.arrivalRunway && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-cyan-600/50 uppercase tracking-wider">
                ARR RWY
              </span>
              <span className={[
                'text-[11px] font-mono font-bold',
                runwayChanged ? 'text-amber-300' : 'text-cyan-300/80',
              ].join(' ')}>
                {meta.arrivalRunway}
              </span>
              {runwayChanged && (
                <span className="text-[8px] font-mono px-1 py-0.5 rounded border text-amber-300/90 border-amber-600/70 bg-amber-950/20 uppercase tracking-wider">
                  CHG
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Waypoint legs ─────────────────────────────────────────────────────────────

// Waypoints that can receive a HOLD insert when holding drill is active
const HOLD_WAYPOINTS = new Set(['JIPIR', 'JUDDS']);

function TrainingBadge({ annotation }: { annotation: TrainingAnnotation }) {
  const colorClass =
    annotation.color === 'red'
      ? 'text-red-400 border-red-700/60 bg-red-950/40'
      : annotation.color === 'magenta'
        ? 'text-fuchsia-400 border-fuchsia-700/60 bg-fuchsia-950/40'
        : 'text-amber-400 border-amber-700/60 bg-amber-950/40';

  return (
    <span className={[
      'text-[8px] font-mono px-1 py-0.5 rounded border leading-none shrink-0 tabular-nums',
      colorClass,
    ].join(' ')}>
      {annotation.text}
    </span>
  );
}

function WaypointLegs({
  waypoints,
  activeIdx,
  training,
  selectedWaypointId,
  onSelectWaypoint,
}: {
  waypoints: EnrichedWaypoint[];
  activeIdx: number;
  training: FlightPlanTrainingContext;
  selectedWaypointId: string | null;
  onSelectWaypoint: (id: string) => void;
}) {
  const activeRef   = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active waypoint
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIdx]);

  return (
    <div className="bg-[#0d1520] border border-cyan-800/40 rounded overflow-hidden">

      {/* Condensed route label */}
      <div className="px-2.5 py-0.5 bg-[#080f16] border-b border-cyan-900/30 flex items-center justify-between">
        <span className="text-[8px] font-mono text-cyan-700/50 uppercase tracking-widest">
          Condensed Route
        </span>
        <span className="text-[8px] font-mono text-cyan-800/40">
          {waypoints.length} legs
        </span>
      </div>

      {/* Column header
          Layout: [icon w-5][WPT w-14][ANNO w-7][AWY w-9][LEG w-11][BRG w-9][ALT flex-1] */}
      <div className="flex items-center px-2.5 py-1 border-b border-cyan-800/30 bg-[#0a1118]">
        <span className="w-5 shrink-0" />
        <span className="w-14 text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider shrink-0">
          WPT
        </span>
        <span className="w-7 shrink-0" /> {/* ANNO column — no header */}
        <span className="w-9 text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider shrink-0">
          AWY
        </span>
        <span className="w-11 text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider text-right pr-1 shrink-0">
          LEG
        </span>
        <span className="w-9 text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider text-right pr-1 shrink-0">
          BRG
        </span>
        <span className="flex-1 text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider text-right pr-1">
          ALT
        </span>
      </div>

      {waypoints.map((wp, rowIdx) => {
        const isActive   = !!wp.isActive;
        const isPassed   = wp.passed;
        const isDest     = wp.waypointType === 'destination';
        const isDep      = wp.waypointType === 'departure';
        const isSelected = selectedWaypointId === wp.id;
        const annotation = waypointTrainingAnnotation(wp.id, training.flags, isActive);

        // VNAV conflict applies amber to the altitude column
        const vnavOnThisWp = training.flags.vnavConflict &&
          (wp.id === 'WITNY' || wp.id === 'JIPIR' || wp.id === 'BRUWN');

        // Deviation banner shown immediately before the active waypoint
        const showDeviationBanner =
          training.flags.routeDeviation && rowIdx === activeIdx && activeIdx > 0;

        return (
          <Fragment key={wp.id}>

            {/* Deviation banner — appears before active waypoint when off-route */}
            {showDeviationBanner && (
              <div className="flex items-center gap-2 px-2.5 py-0.5 bg-red-950/25 border-b border-red-900/40">
                <span className="text-[8px] font-mono text-red-400/80 font-bold tracking-wider">
                  ⚠ OFF ROUTE
                </span>
                <span className="text-[8px] font-mono text-red-500/50">DEV DETECTED · RESUME NAV</span>
              </div>
            )}

            {/* Main waypoint row */}
            <div
              ref={isActive ? activeRef : isSelected ? selectedRef : undefined}
              onClick={() => onSelectWaypoint(wp.id)}
              className={[
                'flex items-center px-2.5 py-1.5 border-b border-cyan-900/20 last:border-0',
                'cursor-pointer transition-all select-none',
                isActive
                  ? 'bg-cyan-900/25 border-l-2 border-l-cyan-400/80 shadow-[inset_0_0_8px_rgba(0,212,255,0.05)]'
                  : isSelected
                    ? 'bg-slate-800/40 border-l-2 border-l-slate-500/60'
                    : isPassed
                      ? 'opacity-40 hover:opacity-60'
                      : isDest
                        ? 'bg-green-950/15 hover:bg-green-950/25'
                        : 'hover:bg-cyan-900/10',
              ].join(' ')}
            >
              {/* Status icon — col w-5 */}
              <div className="w-5 shrink-0 text-center">
                {isPassed ? (
                  <span className="text-green-500/70 text-[9px]">✓</span>
                ) : isActive ? (
                  <span className="text-cyan-300 text-[11px] font-bold">▶</span>
                ) : isDest ? (
                  <span className="text-green-400 text-[10px]">✈</span>
                ) : isDep ? (
                  <span className="text-green-400/60 text-[9px]">⬆</span>
                ) : isSelected ? (
                  <span className="text-slate-400/70 text-[9px]">◈</span>
                ) : (
                  <span className="text-cyan-800/50 text-[9px]">◆</span>
                )}
              </div>

              {/* Waypoint name — col w-14 */}
              <div className="w-14 shrink-0 min-w-0">
                <span className={[
                  'font-mono font-bold text-[12px] tracking-wider block truncate',
                  isActive
                    ? 'text-cyan-200'
                    : isPassed
                      ? 'text-green-500/60'
                      : isDest
                        ? 'text-green-400'
                        : isSelected
                          ? 'text-slate-200/90'
                          : 'text-cyan-400/80',
                ].join(' ')}>
                  {wp.name}
                </span>
              </div>

              {/* Training annotation — col w-7 */}
              <div className="w-7 shrink-0 flex items-center justify-start">
                {annotation && <TrainingBadge annotation={annotation} />}
              </div>

              {/* Airway — col w-9 */}
              <div className="w-9 shrink-0">
                <span className="font-mono text-[9px] text-cyan-600/55 truncate block">
                  {wp.airway ?? (isDep || isDest ? '----' : '')}
                </span>
              </div>

              {/* Leg distance — col w-11 */}
              <div className="w-11 shrink-0 text-right pr-1">
                <span className={[
                  'font-mono text-[11px] tabular-nums',
                  isPassed ? 'text-cyan-600/40' : 'text-cyan-400/70',
                ].join(' ')}>
                  {wp.distanceFromPrevNm > 0
                    ? `${formatDistNm(wp.distanceFromPrevNm)}NM`
                    : '---'}
                </span>
              </div>

              {/* Bearing to next — col w-9 */}
              <div className="w-9 shrink-0 text-right pr-1">
                <span className="font-mono text-[10px] text-cyan-600/50 tabular-nums">
                  {wp.bearingToNextDeg !== undefined
                    ? formatBearingFp(wp.bearingToNextDeg)
                    : '---'}
                </span>
              </div>

              {/* Altitude + restriction — flex-1 */}
              <div className="flex-1 text-right pr-1 flex flex-col items-end">
                <span className={[
                  'font-mono text-[11px] tabular-nums',
                  vnavOnThisWp
                    ? 'text-amber-300/90 font-bold'
                    : isActive
                      ? 'text-cyan-200 font-bold'
                      : isPassed
                        ? 'text-cyan-600/40'
                        : 'text-cyan-400/70',
                ].join(' ')}>
                  {formatAltFp(wp.altitude)}
                </span>
                {wp.altitudeRestriction && (
                  <span className={[
                    'font-mono text-[8px] leading-none',
                    vnavOnThisWp ? 'text-amber-400/90' : 'text-amber-400/70',
                  ].join(' ')}>
                    {formatRestriction(wp.altitudeRestriction)}
                  </span>
                )}
              </div>
            </div>

            {/* Selected waypoint detail strip */}
            {isSelected && (
              <div className="flex items-center gap-3 px-2.5 py-1 bg-slate-900/50 border-b border-slate-700/30">
                <span className="text-[8px] font-mono text-slate-500/70 uppercase tracking-wider">CUM</span>
                <span className="text-[9px] font-mono text-slate-300/70 tabular-nums">
                  {Math.round(wp.cumulativeDistanceNm)}NM
                </span>
                <span className="text-slate-700/50">·</span>
                <span className="text-[8px] font-mono text-slate-500/70 uppercase tracking-wider">ETE</span>
                <span className="text-[9px] font-mono text-slate-300/70">
                  {formatEteFp(wp.eteMinutes)}
                </span>
                {wp.notes && (
                  <>
                    <span className="text-slate-700/50">·</span>
                    <span className="text-[9px] font-mono text-slate-400/60 truncate">{wp.notes}</span>
                  </>
                )}
                {wp.speedRestrictionKts && (
                  <>
                    <span className="text-slate-700/50 ml-auto">·</span>
                    <span className="text-[8px] font-mono text-cyan-600/60">
                      {wp.speedRestrictionKts}KT SPD
                    </span>
                  </>
                )}
              </div>
            )}

            {/* HOLD insert row — appears after the assigned hold fix */}
            {training.flags.holding && HOLD_WAYPOINTS.has(wp.id) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/15 border-b border-amber-900/30">
                <div className="w-5 shrink-0 text-center">
                  <span className="text-amber-400/80 text-[10px]">⟳</span>
                </div>
                <span className="text-[9px] font-mono text-amber-400/80 font-bold w-14 shrink-0">
                  HOLD
                </span>
                <span className="text-[8px] font-mono text-amber-500/60">
                  {wp.id} · RGHT TURNS · EFC +10MIN
                </span>
              </div>
            )}
          </Fragment>
        );
      })}

      {/* ETE footer row */}
      <EteRow waypoints={waypoints} activeIdx={activeIdx} />
    </div>
  );
}

function EteRow({
  waypoints,
  activeIdx,
}: {
  waypoints: EnrichedWaypoint[];
  activeIdx: number;
}) {
  if (activeIdx < 0 || waypoints.length === 0) return null;
  const dest   = waypoints[waypoints.length - 1];
  const active = waypoints[activeIdx];
  if (!dest || !active) return null;
  const remainEte = dest.eteMinutes - active.eteMinutes;

  return (
    <div className="flex items-center justify-between px-2.5 py-1 bg-[#0a1118] border-t border-cyan-800/20">
      <span className="text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider">
        ETE → {dest.name}
      </span>
      <span className="text-[11px] font-mono text-cyan-300/80 font-bold tabular-nums">
        {formatEteFp(Math.max(0, remainEte))}
      </span>
    </div>
  );
}

// ── Training status card ──────────────────────────────────────────────────────

function TrainingStatusCard({
  training,
  drillName,
}: {
  training: FlightPlanTrainingContext;
  drillName?: string;
}) {
  const { flags } = training;
  const anyActive = Object.values(flags).some(Boolean);

  const flagItems: { key: keyof typeof flags; label: string }[] = [
    { key: 'vnavConflict',   label: 'VNAV CONFLICT' },
    { key: 'routeDeviation', label: 'ROUTE DEV'     },
    { key: 'wrongFrequency', label: 'WRONG FREQ'    },
    { key: 'runwayChange',   label: 'RWY CHANGE'    },
    { key: 'holding',        label: 'HOLDING'       },
    { key: 'commsHandoff',   label: 'COMMS HO'      },
  ];

  return (
    <div className={[
      'border rounded p-2.5',
      anyActive
        ? 'bg-amber-950/20 border-amber-700/50'
        : 'bg-[#0d1520] border-cyan-800/40',
    ].join(' ')}>

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[8px] font-mono text-cyan-700/50 uppercase tracking-wider">
          Training Status
        </span>
        <span className={[
          'text-[9px] font-mono font-bold',
          anyActive ? 'text-amber-400' : 'text-cyan-600/40',
        ].join(' ')}>
          {drillName ? `● ${drillName}` : '○ No Active Drill'}
        </span>
      </div>

      {/* Flags grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {flagItems.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={[
              'text-[9px]',
              flags[key] ? 'text-amber-400' : 'text-cyan-800/50',
            ].join(' ')}>
              {flags[key] ? '●' : '○'}
            </span>
            <span className={[
              'text-[9px] font-mono',
              flags[key] ? 'text-amber-300/90' : 'text-cyan-700/40',
            ].join(' ')}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
