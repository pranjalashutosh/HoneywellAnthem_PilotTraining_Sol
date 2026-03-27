// Full FlightPlanPackage for KJFK → KBOS (Citation CJ3+, N389HW).

import { kjfkKbos } from './kjfk-kbos';
import { enrichWaypoints } from '@/lib/flight-plan-utils';
import type { FlightPlanPackage, EnrichedWaypoint } from '@/types/flight-plan';

const CRUISE_SPEED = 280;

const base = enrichWaypoints(kjfkKbos, CRUISE_SPEED);

const waypoints: EnrichedWaypoint[] = base.map((wp) => {
  switch (wp.id) {
    case 'KJFK':
      return { ...wp, waypointType: 'departure', flightPhase: 'preflight', notes: 'Rwy 31L · SID: SKORR5' };
    case 'MERIT':
      return { ...wp, waypointType: 'fix', airway: 'Q818', flightPhase: 'climb', altitudeRestriction: { type: 'at_or_above', valueFt: 12000 } };
    case 'GREKI':
      return { ...wp, waypointType: 'fix', airway: 'Q818', flightPhase: 'climb', altitudeRestriction: { type: 'at_or_above', valueFt: 18000 } };
    case 'JUDDS':
      return { ...wp, waypointType: 'fix', airway: 'Q818', flightPhase: 'cruise' };
    case 'BOSOX':
      return { ...wp, waypointType: 'fix', airway: 'Q818', flightPhase: 'cruise' };
    case 'BRUWN':
      return { ...wp, waypointType: 'fix', flightPhase: 'descent', altitudeRestriction: { type: 'at_or_below', valueFt: 10000 } };
    case 'KBOS':
      return { ...wp, waypointType: 'destination', flightPhase: 'approach', notes: 'Rwy 22R · STAR: ROBUC3' };
    default:
      return wp;
  }
});

const lastWp = waypoints[waypoints.length - 1];
const totalDistanceNm = lastWp?.cumulativeDistanceNm ?? 0;
const totalEteMinutes = lastWp?.eteMinutes ?? 0;

export const kjfkKbosPackage: FlightPlanPackage = {
  meta: {
    callsign: 'N271SY',
    tailNumber: 'N389HW',
    aircraftType: 'Citation CJ3+',
    departure: 'KJFK',
    destination: 'KBOS',
    alternate: 'KEWR',
    departureRunway: '31L',
    arrivalRunway: '22R',
    sid: { code: 'SKORR5', transition: 'MERIT', status: 'planned' },
    star: { code: 'ROBUC3', transition: 'BRUWN', status: 'planned' },
    approach: { code: 'ILS 22R', status: 'planned' },
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
