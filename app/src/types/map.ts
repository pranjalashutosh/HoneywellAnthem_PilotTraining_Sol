// Map Display — TypeScript domain models for the aviation map module.

export interface LatLon {
  lat: number;
  lon: number;
}

export interface AircraftState {
  /** Current aircraft position */
  position: LatLon;
  /** Magnetic heading in degrees (0–360) */
  heading: number;
  /** Indicated airspeed in knots */
  speedKts: number;
  /** Altitude in feet MSL */
  altitudeFt: number;
  /** Ground track in degrees */
  track: number;
  /** Callsign displayed on the map */
  callsign: string;
}

export type AirportRole = 'departure' | 'destination' | 'alternate';

export interface MapAirport {
  id: string;
  icao: string;
  name: string;
  position: LatLon;
  role: AirportRole;
  elevation: number;
  /** Active runway for display (e.g. "22L") */
  activeRunway?: string;
}

export type WaypointType = 'fix' | 'vor' | 'ndb' | 'waypoint';

export interface MapWaypoint {
  id: string;
  name: string;
  position: LatLon;
  altitudeConstraintFt?: number;
  type: WaypointType;
  isActive: boolean;
  /** Index within the flight plan */
  sequenceIndex: number;
}

export type OverlayKind =
  | 'weather'
  | 'holding'
  | 'runway_change'
  | 'comms_handoff'
  | 'vnav_conflict'
  | 'instructor_annotation'
  | 'deviation';

export interface ScenarioOverlay {
  id: string;
  kind: OverlayKind;
  label: string;
  description: string;
  center: LatLon;
  /** Radius in metres for circle overlays */
  radiusMetres?: number;
  /** Polygon path for zone overlays */
  polygon?: LatLon[];
  /** Severity level drives colour */
  severity: 'advisory' | 'caution' | 'warning';
  /** Whether this overlay is currently active/visible */
  active: boolean;
}

export interface BreadcrumbPoint {
  position: LatLon;
  timestampMs: number;
}

export type MapLayer =
  | 'route'
  | 'airports'
  | 'waypoints'
  | 'weather'
  | 'breadcrumbs'
  | 'annotations';

export interface MapLayerVisibility {
  route: boolean;
  airports: boolean;
  waypoints: boolean;
  weather: boolean;
  breadcrumbs: boolean;
  annotations: boolean;
}

export interface SelectedMapFeature {
  type: 'waypoint' | 'airport' | 'overlay';
  id: string;
}
