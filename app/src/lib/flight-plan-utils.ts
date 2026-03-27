// Flight plan utility functions — pure math, no React/store dependencies.
// All progress metrics derive from enrichWaypoints() as the single source of truth.

import type { Waypoint } from '@/types';
import type {
  EnrichedWaypoint,
  FlightPhase,
  RouteWaypointType,
  AltitudeRestriction,
  FlightPlanProgress,
  FlightPlanTrainingContext,
  ProcedureStatus,
} from '@/types/flight-plan';

// ── Earth geometry ─────────────────────────────────────────────────────────────

const R_NM = 3440.065; // Earth radius in nautical miles

export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R_NM * 2 * Math.asin(Math.sqrt(a));
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

export function formatAltFp(ft: number): string {
  if (ft === 0) return 'GND';
  if (ft >= 18000) return `FL${Math.round(ft / 100).toString().padStart(3, '0')}`;
  return ft >= 1000 ? `${(ft / 1000).toFixed(0)}K` : `${ft}`;
}

export function formatBearingFp(deg: number): string {
  return `${Math.round(deg).toString().padStart(3, '0')}°`;
}

/** Format minutes as avionics ETE: "47MIN" or "3+07" */
export function formatEteFp(minutes: number): string {
  if (minutes < 0) return '--:--';
  if (minutes === 0) return '0MIN';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}+${m.toString().padStart(2, '0')}` : `${m}MIN`;
}

export function formatRestriction(r: AltitudeRestriction): string {
  switch (r.type) {
    case 'at':          return `=${formatAltFp(r.valueFt)}`;
    case 'at_or_above': return `↑${formatAltFp(r.valueFt)}`;
    case 'at_or_below': return `↓${formatAltFp(r.valueFt)}`;
    case 'between':     return `${formatAltFp(r.valueFt)}–${formatAltFp(r.value2Ft ?? r.valueFt)}`;
  }
}

export function formatDistNm(nm: number): string {
  return nm >= 10 ? `${Math.round(nm)}` : `${nm.toFixed(1)}`;
}

// ── Inference helpers ──────────────────────────────────────────────────────────

function inferFlightPhase(i: number, total: number, altitudeFt: number): FlightPhase {
  if (i === 0) return 'preflight';
  if (altitudeFt === 0 || i === total - 1) return 'approach';
  if (altitudeFt < 18000) return i < total / 2 ? 'climb' : 'descent';
  if (altitudeFt < 36000) return i < total / 2 ? 'climb' : 'descent';
  return 'cruise';
}

function inferWaypointType(i: number, total: number): RouteWaypointType {
  if (i === 0) return 'departure';
  if (i === total - 1) return 'destination';
  return 'fix';
}

// ── Core enrichment ────────────────────────────────────────────────────────────

/**
 * Enrich a raw Waypoint[] with all computed geometry.
 * Returns EnrichedWaypoint[] — the single source of truth for all route math.
 * Callers may override airway/restriction/phase/notes on top.
 */
export function enrichWaypoints(
  waypoints: Waypoint[],
  cruiseSpeedKts: number,
): EnrichedWaypoint[] {
  if (waypoints.length === 0) return [];

  const enriched: EnrichedWaypoint[] = [];
  let cumDistNm = 0;
  let cumEteMin = 0;
  const total = waypoints.length;

  waypoints.forEach((wp, i) => {
    const prev = i > 0 ? (waypoints[i - 1] ?? null) : null;
    const next = i < total - 1 ? (waypoints[i + 1] ?? null) : null;

    const distFromPrev =
      prev !== null ? haversineNm(prev.lat, prev.lon, wp.lat, wp.lon) : 0;
    cumDistNm += distFromPrev;

    // ETE for this leg at cruise speed
    const legEte = cruiseSpeedKts > 0 ? (distFromPrev / cruiseSpeedKts) * 60 : 0;
    cumEteMin += legEte;

    const bearingToNext =
      next !== null ? Math.round(bearingDeg(wp.lat, wp.lon, next.lat, next.lon)) : undefined;

    enriched.push({
      id: wp.id,
      name: wp.name,
      lat: wp.lat,
      lon: wp.lon,
      altitude: wp.altitude,
      isActive: wp.isActive,
      waypointType: inferWaypointType(i, total),
      distanceFromPrevNm: Math.round(distFromPrev * 10) / 10,
      cumulativeDistanceNm: Math.round(cumDistNm * 10) / 10,
      bearingToNextDeg: bearingToNext,
      eteMinutes: Math.round(cumEteMin),
      flightPhase: inferFlightPhase(i, total, wp.altitude),
      passed: false,
    });
  });

  // Mark waypoints before the active one as passed
  const activeIdx = enriched.findIndex((w) => w.isActive);
  return enriched.map((wp, i) => ({
    ...wp,
    passed: activeIdx >= 0 && i < activeIdx,
  }));
}

// ── Single source of truth: progress snapshot ──────────────────────────────────

/**
 * Compute all live progress metrics from enriched waypoints.
 * Use this instead of calling individual stat functions separately.
 */
export function computeProgress(
  waypoints: EnrichedWaypoint[],
  cruiseAltFt: number,
): FlightPlanProgress {
  const emptyProgress: FlightPlanProgress = {
    progressPct: 0,
    remainingDistNm: 0,
    remainingEteMinutes: 0,
    distToNextNm: 0,
    activeWaypointName: undefined,
    nextWaypointName: undefined,
    phase: 'preflight',
    todCueNm: undefined,
  };

  if (waypoints.length === 0) return emptyProgress;

  const activeIdx = waypoints.findIndex((w) => w.isActive);
  if (activeIdx < 0) return emptyProgress;

  const dest = waypoints[waypoints.length - 1];
  const active = waypoints[activeIdx];
  if (!dest || !active) return emptyProgress;

  const totalDist = dest.cumulativeDistanceNm;
  const progressPct = totalDist > 0
    ? Math.round((active.cumulativeDistanceNm / totalDist) * 100)
    : 0;

  const remainingDistNm =
    Math.max(0, Math.round((totalDist - active.cumulativeDistanceNm) * 10) / 10);

  // ETE uses cumulative waypoint data — consistent with leg-level ETEs
  const remainingEteMinutes = Math.max(0, dest.eteMinutes - active.eteMinutes);

  const nextWp = waypoints[activeIdx + 1] ?? null;
  const distToNextNm = nextWp
    ? Math.max(0, Math.round((nextWp.cumulativeDistanceNm - active.cumulativeDistanceNm) * 10) / 10)
    : 0;

  // TOD: ~300 ft/NM descent profile (3° glide ~= 318 ft/NM, round to 300 for conservatism)
  const todDistFromDestNm = Math.round(cruiseAltFt / 300);
  const todCueNm = active.flightPhase === 'cruise'
    ? Math.round(remainingDistNm - todDistFromDestNm)
    : undefined;

  return {
    progressPct,
    remainingDistNm,
    remainingEteMinutes,
    distToNextNm,
    activeWaypointName: active.name,
    nextWaypointName: nextWp?.name,
    phase: active.flightPhase,
    todCueNm,
  };
}

// ── Training annotations per waypoint ─────────────────────────────────────────

export type TrainingAnnotationColor = 'amber' | 'red' | 'magenta';

export interface TrainingAnnotation {
  text: string;
  color: TrainingAnnotationColor;
}

/**
 * Returns an inline training badge for a waypoint row, or null if not applicable.
 * Route-aware: uses waypoint IDs from KTEB→KPBI and KJFK→KBOS.
 */
export function waypointTrainingAnnotation(
  wpId: string,
  flags: FlightPlanTrainingContext['flags'],
  isActive: boolean,
): TrainingAnnotation | null {
  if (flags.vnavConflict && (wpId === 'WITNY' || wpId === 'JIPIR' || wpId === 'BRUWN')) {
    return { text: 'VNAV', color: 'amber' };
  }
  if (flags.holding && (wpId === 'JIPIR' || wpId === 'JUDDS')) {
    return { text: 'HOLD', color: 'amber' };
  }
  if (flags.commsHandoff && (wpId === 'JIPIR' || wpId === 'BRUWN')) {
    return { text: 'FREQ', color: 'magenta' };
  }
  if (flags.runwayChange && (wpId === 'KPBI' || wpId === 'KBOS')) {
    return { text: 'RWY?', color: 'red' };
  }
  if (flags.wrongFrequency && (wpId === 'LANNA' || wpId === 'MERIT')) {
    return { text: 'FREQ?', color: 'amber' };
  }
  if (flags.routeDeviation && isActive) {
    return { text: 'DEV', color: 'red' };
  }
  return null;
}

// ── Dynamic procedure status ───────────────────────────────────────────────────

/**
 * Derive the live operational status of a procedure based on current flight
 * phase and active training flags.
 * - SID → 'active' while in preflight/climb
 * - STAR → 'active' while in descent
 * - APPR → 'active' while in approach
 * - Any → 'changed' when the runway-change drill is active (STAR/APPR)
 * - Any → 'pending' when the route-deviation drill is active (APPR)
 */
export function deriveProcedureStatus(
  procType: 'sid' | 'star' | 'approach',
  phase: FlightPhase,
  flags: FlightPlanTrainingContext['flags'],
): ProcedureStatus {
  // Training flag overrides
  if (flags.runwayChange && (procType === 'approach' || procType === 'star')) {
    return 'changed';
  }
  if (flags.routeDeviation && procType === 'approach') {
    return 'pending';
  }
  // Phase-based promotion
  if (procType === 'sid' && (phase === 'preflight' || phase === 'climb')) return 'active';
  if (procType === 'star' && phase === 'descent') return 'active';
  if (procType === 'approach' && phase === 'approach') return 'active';
  return 'planned';
}

// ── Backward-compat helpers ────────────────────────────────────────────────────
// These derive from computeProgress; prefer computeProgress() for new code.

export function getProgressPercent(waypoints: EnrichedWaypoint[]): number {
  return computeProgress(waypoints, 36000).progressPct;
}

export function getRemainingDistanceNm(waypoints: EnrichedWaypoint[]): number {
  return computeProgress(waypoints, 36000).remainingDistNm;
}

/** ETE from waypoint-level data — consistent with leg ETEs. speedKts ignored (compat only). */
export function getRemainingEteMinutes(
  waypoints: EnrichedWaypoint[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _speedKts?: number,
): number {
  return computeProgress(waypoints, 36000).remainingEteMinutes;
}
