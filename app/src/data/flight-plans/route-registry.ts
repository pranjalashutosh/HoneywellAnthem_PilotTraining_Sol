// Route registry — maps a route ID to its full package, airports, and map viewport.
// Add new routes here; the FlightPlanTab picker and MapDisplay both read from this.

import { ktebKpbiPackage } from './kteb-kpbi-full';
import { kjfkKbosPackage } from './kjfk-kbos-full';
import type { FlightPlanPackage } from '@/types/flight-plan';
import type { MapAirport, BreadcrumbPoint } from '@/types/map';

export interface RouteConfig {
  id: string;
  label: string;             // short label shown in picker, e.g. "KTEB → KPBI"
  package: FlightPlanPackage;
  airports: MapAirport[];
  /** Position shown for the aircraft marker (near active waypoint) */
  aircraftPosition: { lat: number; lon: number };
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  breadcrumbs: BreadcrumbPoint[];
}

// ── KTEB → KPBI ──────────────────────────────────────────────────────────────

const KTEB_KPBI: RouteConfig = {
  id: 'kteb-kpbi',
  label: 'KTEB → KPBI',
  package: ktebKpbiPackage,
  airports: [
    {
      id: 'KTEB',
      icao: 'KTEB',
      name: 'Teterboro Airport',
      position: { lat: 40.8501, lon: -74.0608 },
      role: 'departure',
      elevation: 9,
      activeRunway: '24',
    },
    {
      id: 'KPBI',
      icao: 'KPBI',
      name: 'Palm Beach Intl',
      position: { lat: 26.6832, lon: -80.0956 },
      role: 'destination',
      elevation: 19,
      activeRunway: '10L',
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
  ],
  // Near COATE — the active waypoint for this route
  aircraftPosition: { lat: 40.06, lon: -74.6 },
  mapCenter: { lat: 34.5, lng: -77.5 },
  mapZoom: 6,
  breadcrumbs: [
    { position: { lat: 40.85, lon: -74.06 }, timestampMs: Date.now() - 3_600_000 },
    { position: { lat: 40.70, lon: -74.15 }, timestampMs: Date.now() - 3_200_000 },
    { position: { lat: 40.53, lon: -74.21 }, timestampMs: Date.now() - 2_800_000 },
    { position: { lat: 40.30, lon: -74.40 }, timestampMs: Date.now() - 2_400_000 },
    { position: { lat: 40.06, lon: -74.60 }, timestampMs: Date.now() - 1_800_000 },
  ],
};

// ── KJFK → KBOS ──────────────────────────────────────────────────────────────

const KJFK_KBOS: RouteConfig = {
  id: 'kjfk-kbos',
  label: 'KJFK → KBOS',
  package: kjfkKbosPackage,
  airports: [
    {
      id: 'KJFK',
      icao: 'KJFK',
      name: 'John F. Kennedy Intl',
      position: { lat: 40.6413, lon: -73.7781 },
      role: 'departure',
      elevation: 13,
      activeRunway: '31L',
    },
    {
      id: 'KBOS',
      icao: 'KBOS',
      name: 'Logan International',
      position: { lat: 42.3656, lon: -71.0096 },
      role: 'destination',
      elevation: 20,
      activeRunway: '22R',
    },
    {
      id: 'KEWR',
      icao: 'KEWR',
      name: 'Newark Liberty (Alternate)',
      position: { lat: 40.6895, lon: -74.1745 },
      role: 'alternate',
      elevation: 18,
      activeRunway: '22L',
    },
  ],
  // Near JUDDS — the active waypoint for this route
  aircraftPosition: { lat: 41.28, lon: -72.5 },
  mapCenter: { lat: 41.5, lng: -72.4 },
  mapZoom: 7,
  breadcrumbs: [
    { position: { lat: 40.64, lon: -73.78 }, timestampMs: Date.now() - 2_400_000 },
    { position: { lat: 40.75, lon: -73.65 }, timestampMs: Date.now() - 2_000_000 },
    { position: { lat: 40.85, lon: -73.50 }, timestampMs: Date.now() - 1_600_000 },
    { position: { lat: 41.02, lon: -73.20 }, timestampMs: Date.now() - 1_200_000 },
    { position: { lat: 41.28, lon: -72.50 }, timestampMs: Date.now() - 600_000 },
  ],
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const ROUTE_REGISTRY: Record<string, RouteConfig> = {
  'kteb-kpbi': KTEB_KPBI,
  'kjfk-kbos': KJFK_KBOS,
};

export const ROUTE_IDS = Object.keys(ROUTE_REGISTRY) as (keyof typeof ROUTE_REGISTRY)[];

export const DEFAULT_ROUTE_ID = 'kteb-kpbi';

export function getRoute(id: string): RouteConfig {
  return ROUTE_REGISTRY[id] ?? KTEB_KPBI;
}
