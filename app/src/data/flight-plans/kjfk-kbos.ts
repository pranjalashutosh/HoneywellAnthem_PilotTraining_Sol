// T3.11 — JFK to Boston flight plan

import type { Waypoint } from '@/types';

export const kjfkKbos: Waypoint[] = [
  { id: 'KJFK', name: 'KJFK', lat: 40.6413, lon: -73.7781, altitude: 0, isActive: false },
  { id: 'MERIT', name: 'MERIT', lat: 40.8500, lon: -73.5700, altitude: 12000, isActive: false },
  { id: 'GREKI', name: 'GREKI', lat: 41.0200, lon: -73.0700, altitude: 18000, isActive: false },
  { id: 'JUDDS', name: 'JUDDS', lat: 41.2800, lon: -72.5000, altitude: 24000, isActive: true },
  { id: 'BOSOX', name: 'BOSOX', lat: 41.7500, lon: -72.0000, altitude: 36000, isActive: false },
  { id: 'BRUWN', name: 'BRUWN', lat: 42.0000, lon: -71.5000, altitude: 36000, isActive: false },
  { id: 'KBOS', name: 'KBOS', lat: 42.3656, lon: -71.0096, altitude: 0, isActive: false },
];
