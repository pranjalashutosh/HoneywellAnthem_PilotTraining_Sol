// T3.14 — Waypoint database for flight plans

import type { Waypoint } from '@/types';

// Master waypoint database — lat/lon only, altitude set per flight plan
export const waypointDb: Record<string, Omit<Waypoint, 'altitude' | 'isActive'>> = {
  KJFK: { id: 'KJFK', name: 'KJFK', lat: 40.6413, lon: -73.7781 },
  KBOS: { id: 'KBOS', name: 'KBOS', lat: 42.3656, lon: -71.0096 },
  KTEB: { id: 'KTEB', name: 'KTEB', lat: 40.8501, lon: -74.0608 },
  KPBI: { id: 'KPBI', name: 'KPBI', lat: 26.6832, lon: -80.0956 },
  MERIT: { id: 'MERIT', name: 'MERIT', lat: 40.8500, lon: -73.5700 },
  GREKI: { id: 'GREKI', name: 'GREKI', lat: 41.0200, lon: -73.0700 },
  JUDDS: { id: 'JUDDS', name: 'JUDDS', lat: 41.2800, lon: -72.5000 },
  BOSOX: { id: 'BOSOX', name: 'BOSOX', lat: 41.7500, lon: -72.0000 },
  BRUWN: { id: 'BRUWN', name: 'BRUWN', lat: 42.0000, lon: -71.5000 },
  LANNA: { id: 'LANNA', name: 'LANNA', lat: 40.5300, lon: -74.2100 },
  COATE: { id: 'COATE', name: 'COATE', lat: 40.0600, lon: -74.6000 },
  TERRI: { id: 'TERRI', name: 'TERRI', lat: 39.1000, lon: -75.3000 },
  HUBBS: { id: 'HUBBS', name: 'HUBBS', lat: 37.5000, lon: -76.5000 },
  FILTY: { id: 'FILTY', name: 'FILTY', lat: 35.5000, lon: -78.0000 },
  WITNY: { id: 'WITNY', name: 'WITNY', lat: 33.0000, lon: -79.5000 },
  JIPIR: { id: 'JIPIR', name: 'JIPIR', lat: 30.0000, lon: -80.5000 },
};
