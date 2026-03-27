// Flight plan domain types — enriched waypoint model + metadata wrapper.
// EnrichedWaypoint extends the base Waypoint so cockpit-store Waypoint[] stays compatible.

import type { Waypoint } from './cockpit';

// ── Enumerations ───────────────────────────────────────────────────────────────

export type RouteWaypointType =
  | 'departure'
  | 'fix'
  | 'vor'
  | 'intersection'
  | 'ndb'
  | 'destination';

export type FlightPhase = 'preflight' | 'climb' | 'cruise' | 'descent' | 'approach';

export type ProcedureStatus = 'planned' | 'active' | 'changed' | 'pending';

// ── Procedure (SID / STAR / approach) ────────────────────────────────────────

export interface Procedure {
  code: string;
  transition?: string;
  status: ProcedureStatus;
}

// ── Altitude / speed constraints ──────────────────────────────────────────────

export interface AltitudeRestriction {
  type: 'at' | 'at_or_above' | 'at_or_below' | 'between';
  valueFt: number;
  value2Ft?: number; // used for 'between'
}

// ── Enriched waypoint ─────────────────────────────────────────────────────────

export interface EnrichedWaypoint extends Waypoint {
  waypointType: RouteWaypointType;
  airway?: string;
  altitudeRestriction?: AltitudeRestriction;
  speedRestrictionKts?: number;
  /** Leg distance: distance from previous waypoint to this one */
  distanceFromPrevNm: number;
  /** Cumulative distance from departure to this waypoint */
  cumulativeDistanceNm: number;
  /** Outbound course from this waypoint to the next */
  bearingToNextDeg?: number;
  /** Cumulative ETE from departure to this waypoint (minutes) */
  eteMinutes: number;
  flightPhase: FlightPhase;
  passed: boolean;
  notes?: string;
}

// ── Route metadata ────────────────────────────────────────────────────────────

export interface FlightPlanMeta {
  callsign: string;
  tailNumber: string;
  aircraftType: string;
  departure: string;
  destination: string;
  alternate?: string;
  departureRunway?: string;
  arrivalRunway?: string;
  sid?: Procedure;
  star?: Procedure;
  approach?: Procedure;
  cruiseAltitudeFt: number;
  cruiseSpeedKts: number;
  totalDistanceNm: number;
  totalEteMinutes: number;
}

// ── Live progress snapshot ────────────────────────────────────────────────────
// Single source of truth — computed once from enriched waypoints.

export interface FlightPlanProgress {
  progressPct: number;
  remainingDistNm: number;
  remainingEteMinutes: number;
  /** Distance from active waypoint to the next fix */
  distToNextNm: number;
  activeWaypointName: string | undefined;
  nextWaypointName: string | undefined;
  phase: FlightPhase;
  /**
   * Distance-to-go until TOD (Top of Descent).
   * Positive = NM to TOD; 0 = at TOD; negative = past TOD.
   * undefined when phase is not cruise.
   */
  todCueNm: number | undefined;
}

// ── Training context ──────────────────────────────────────────────────────────

export interface FlightPlanTrainingContext {
  activeDrillId?: string;
  flags: {
    vnavConflict: boolean;
    routeDeviation: boolean;
    wrongFrequency: boolean;
    runwayChange: boolean;
    holding: boolean;
    commsHandoff: boolean;
  };
}

// ── Package (meta + waypoints + training) ─────────────────────────────────────

export interface FlightPlanPackage {
  meta: FlightPlanMeta;
  waypoints: EnrichedWaypoint[];
  training: FlightPlanTrainingContext;
}
