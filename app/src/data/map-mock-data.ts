// Mock aviation map data for the Map Display module.
// Plug live simulator telemetry here when the backend is ready.

import type {
  AircraftState,
  MapAirport,
  MapWaypoint,
  ScenarioOverlay,
  BreadcrumbPoint,
} from '@/types/map';
import { ktebKpbi } from '@/data/flight-plans/kteb-kpbi';

// ── Aircraft state ─────────────────────────────────────────────────────────
// TODO: replace with real-time telemetry from cockpit-store / Anthem avionics
export const MOCK_AIRCRAFT: AircraftState = {
  position: { lat: 40.06, lon: -74.6 }, // near COATE (active waypoint)
  heading: 195,
  track: 198,
  speedKts: 280,
  altitudeFt: 24000,
  callsign: 'N271SY',
};

// ── Airports ───────────────────────────────────────────────────────────────
export const MOCK_AIRPORTS: MapAirport[] = [
  {
    id: 'KTEB',
    icao: 'KTEB',
    name: 'Teterboro Airport',
    position: { lat: 40.8501, lon: -74.0608 },
    role: 'departure',
    elevation: 9,
    activeRunway: '19',
  },
  {
    id: 'KPBI',
    icao: 'KPBI',
    name: 'Palm Beach Intl',
    position: { lat: 26.6832, lon: -80.0956 },
    role: 'destination',
    elevation: 19,
    activeRunway: '28L',
  },
  {
    id: 'KMIA',
    icao: 'KMIA',
    name: 'Miami Intl (Alternate)',
    position: { lat: 25.7959, lon: -80.287 },
    role: 'alternate',
    elevation: 8,
    activeRunway: '12',
  },
];

// ── Waypoints (derived from flight plan + enriched) ─────────────────────────
export const MOCK_WAYPOINTS: MapWaypoint[] = ktebKpbi
  .filter((wp) => !['KTEB', 'KPBI'].includes(wp.id)) // airports handled separately
  .map((wp, i) => ({
    id: wp.id,
    name: wp.name,
    position: { lat: wp.lat, lon: wp.lon },
    altitudeConstraintFt: wp.altitude,
    type: 'fix' as const,
    isActive: wp.isActive,
    sequenceIndex: i + 1,
  }));

// ── Scenario overlays ──────────────────────────────────────────────────────
// Each overlay maps to a drill scenario; toggle visibility via LayerVisibility.
export const MOCK_SCENARIO_OVERLAYS: ScenarioOverlay[] = [
  {
    id: 'wx-diversion-zone',
    kind: 'weather',
    label: 'SIGMET UNIFORM',
    description:
      'Embedded CB activity reported FL240–FL380. Diversion recommended west of track.',
    center: { lat: 36.5, lon: -78.5 },
    radiusMetres: 120_000,
    severity: 'warning',
    active: false, // activated by weather-diversion drill
  },
  {
    id: 'vnav-conflict-zone',
    kind: 'vnav_conflict',
    label: 'VNAV CONSTRAINT',
    description:
      'ATC crossing restriction: cross WITNY at or below FL280. VNAV path conflict detected.',
    center: { lat: 33.0, lon: -79.5 },
    radiusMetres: 50_000,
    severity: 'caution',
    active: false, // activated by descent-conflict drill
  },
  {
    id: 'comms-handoff-region',
    kind: 'comms_handoff',
    label: 'FREQ HANDOFF',
    description:
      'Jacksonville Center boundary. Expect frequency change to JAX CTR 132.35.',
    center: { lat: 31.5, lon: -81.5 },
    radiusMetres: 80_000,
    severity: 'advisory',
    active: false, // activated by comms-handoff drill
  },
  {
    id: 'holding-fix',
    kind: 'holding',
    label: 'HOLDING PATTERN',
    description:
      'Expect holding at JIPIR. Inbound course 180, right turns, 1-min legs, FL180.',
    center: { lat: 30.0, lon: -80.5 },
    radiusMetres: 30_000,
    severity: 'advisory',
    active: false, // activated by holding-pattern drill
  },
];

// ── Breadcrumb trail ───────────────────────────────────────────────────────
// Pre-seeded trail from KTEB toward current position.
// TODO: append real positions during simulation playback.
export const MOCK_BREADCRUMBS: BreadcrumbPoint[] = [
  { position: { lat: 40.85, lon: -74.06 }, timestampMs: Date.now() - 3_600_000 },
  { position: { lat: 40.70, lon: -74.15 }, timestampMs: Date.now() - 3_200_000 },
  { position: { lat: 40.53, lon: -74.21 }, timestampMs: Date.now() - 2_800_000 },
  { position: { lat: 40.30, lon: -74.40 }, timestampMs: Date.now() - 2_400_000 },
  { position: { lat: 40.06, lon: -74.60 }, timestampMs: Date.now() - 1_800_000 },
];

// ── Map centre + zoom for the active route ─────────────────────────────────
export const KTEB_KPBI_MAP_CENTER = { lat: 34.5, lng: -77.5 };
export const KTEB_KPBI_MAP_ZOOM = 6;
