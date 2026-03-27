// Full FlightPlanPackage for KTEB → KPBI (Citation CJ3+, N389HW).
// Enriched with airways, altitude restrictions, procedures, and training context.

import { ktebKpbi } from './kteb-kpbi';
import { enrichWaypoints } from '@/lib/flight-plan-utils';
import type { FlightPlanPackage, EnrichedWaypoint } from '@/types/flight-plan';

const CRUISE_SPEED = 280; // knots

// Compute geometry (distance, bearing, ETE) from raw waypoints
const base = enrichWaypoints(ktebKpbi, CRUISE_SPEED);

// Layer in static airway / restriction / phase overrides
const waypoints: EnrichedWaypoint[] = base.map((wp) => {
  switch (wp.id) {
    case 'KTEB':
      return {
        ...wp,
        waypointType: 'departure',
        flightPhase: 'preflight',
        notes: 'Rwy 24 · SID: RUUDY5',
      };
    case 'LANNA':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q818',
        flightPhase: 'climb',
        altitudeRestriction: { type: 'at_or_above', valueFt: 10000 },
      };
    case 'COATE':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q818',
        flightPhase: 'climb',
        altitudeRestriction: { type: 'at_or_above', valueFt: 24000 },
      };
    case 'TERRI':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q818',
        flightPhase: 'cruise',
      };
    case 'HUBBS':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q64',
        flightPhase: 'cruise',
      };
    case 'FILTY':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q64',
        flightPhase: 'cruise',
      };
    case 'WITNY':
      return {
        ...wp,
        waypointType: 'fix',
        airway: 'Q64',
        flightPhase: 'descent',
        altitudeRestriction: { type: 'at_or_below', valueFt: 28000 },
      };
    case 'JIPIR':
      return {
        ...wp,
        waypointType: 'fix',
        flightPhase: 'descent',
        altitudeRestriction: { type: 'at_or_below', valueFt: 18000 },
      };
    case 'KPBI':
      return {
        ...wp,
        waypointType: 'destination',
        flightPhase: 'approach',
        notes: 'Rwy 10L · STAR: PBIE3',
      };
    default:
      return wp;
  }
});

const lastWp = waypoints[waypoints.length - 1];
const totalDistanceNm = lastWp?.cumulativeDistanceNm ?? 0;
const totalEteMinutes = lastWp?.eteMinutes ?? 0;

export const ktebKpbiPackage: FlightPlanPackage = {
  meta: {
    callsign: 'N271SY',
    tailNumber: 'N389HW',
    aircraftType: 'Citation CJ3+',
    departure: 'KTEB',
    destination: 'KPBI',
    alternate: 'KMIA',
    departureRunway: '24',
    arrivalRunway: '10L',
    sid: { code: 'RUUDY5', transition: 'RUUDY', status: 'planned' },
    star: { code: 'PBIE3', transition: 'JIPIR', status: 'planned' },
    approach: { code: 'ILS 10L', status: 'planned' },
    cruiseAltitudeFt: 36000,
    cruiseSpeedKts: CRUISE_SPEED,
    totalDistanceNm,
    totalEteMinutes,
  },
  waypoints,
  training: {
    flags: {
      vnavConflict: false,
      routeDeviation: false,
      wrongFrequency: false,
      runwayChange: false,
      holding: false,
      commsHandoff: false,
    },
  },
};
