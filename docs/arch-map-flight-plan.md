# Map Display & Flight Plan Module

Map and flight plan subsystems that power the two primary MFD tabs. The Map tab renders a Google Maps-based avionics moving map with route overlays, aircraft tracking, and scenario visualisations. The Flight Plan tab provides a structured route view with enriched waypoint data, procedure status, progress metrics, and training annotations. Both tabs share state via `cockpit-store` and react to active drills from `scenario-store`.

---

## Map Display

### Component Architecture

```
MapDisplay (exported entry point — handles API key gating)
└── MapCanvas (inner, has Google Maps context)
    ├── RouteChangeController    — pans/zooms map when activeRouteId changes
    ├── RecenterController       — registers recenter callback for MapControls
    ├── RoutePolyline            — flown + ahead polyline segments
    ├── BreadcrumbTrail          — historical track dots
    ├── AircraftHalo             — pulsing cyan ring (AdvancedMarker, zIndex 99)
    ├── AircraftMarker           — heading-rotated SVG (AdvancedMarker, zIndex 100)
    ├── AirportMarkers           — ring icons with ICAO labels (zIndex 60)
    ├── WaypointMarkers          — diamond icons with name labels (zIndex 30/50)
    ├── ScenarioOverlays         — circles/polygons + label markers (zIndex 20-21)
    ├── MarkerInfoCard           — floating popup for selected waypoint/airport
    ├── OverlayInfoCard          — floating popup for selected overlay
    ├── MapControls              — zoom, recenter, layer toggles
    └── MapInfoPanel             — bottom status strip
```

All sub-layers are conditionally rendered based on `MapLayerVisibility` state held in `MapCanvas`.

### Google Maps Setup

- **Library**: `@vis.gl/react-google-maps` (`APIProvider`, `Map`, `useMap`, `useMapsLibrary`)
- **Required env var**: `VITE_GOOGLE_MAPS_API_KEY` — must have Maps JavaScript API enabled
- **Optional env var**: `VITE_GOOGLE_MAP_ID` — for cloud-based map styling (falls back to `DEMO_MAP_ID`)
- **Graceful degradation**: Missing key shows `MapApiKeyPlaceholder`; invalid/disabled key shows `MapAuthErrorPanel`
- **Libraries loaded**: `['marker']` for AdvancedMarkerElement

### Dark Avionics Theme

Defined in `mapTheme.ts`:

- **`AVIONICS_MAP_STYLE`** — `google.maps.MapTypeStyle[]` that suppresses POIs, transit, neighborhoods; mutes roads/labels; darkens water (#0d1b2e), landscape (#0f1923), canvas (#0a0e17)
- **`MAP_DEFAULT_OPTIONS`** — `disableDefaultUI: true`, `gestureHandling: 'greedy'`, `clickableIcons: false`, zoom range 4-14
- **`MAP_COLORS`** — frozen colour palette:
  - Route: `routeActive` (#00d4ff), `routeDim` (#0891b2), `routeAlternate` (#475569)
  - Waypoints: `waypointActive` (#00d4ff), `waypointInactive` (#334155)
  - Airports: `airportDep` (#22c55e green), `airportDest` (#00d4ff cyan), `airportAlt` (#f59e0b amber)
  - Aircraft: `aircraft` (#00d4ff), `breadcrumb` (cyan 35% opacity)
  - Overlays: weather (red), holding (amber), comms (magenta), vnav (red), annotation (cyan)

### Layer System

| Key | Toggle | Controls |
|-----|--------|----------|
| `route` | RTE | RoutePolyline (flown + ahead segments) |
| `airports` | APT | AirportMarkers (departure/destination/alternate) |
| `waypoints` | WPT | WaypointMarkers (enroute fixes) |
| `breadcrumbs` | TRK | BreadcrumbTrail (historical track) |
| `weather` | WX | ScenarioOverlays (weather, holding, comms, vnav) |
| `annotations` | — | Reserved for instructor annotations (not yet wired) |

### Route Overlay

`RouteOverlay.tsx` exports `RoutePolyline` and `BreadcrumbTrail` (imperative — Google Maps Polyline API):

- **Flown segment**: `routeDim`, strokeWeight 2, opacity 0.4 — waypoints[0..activeIndex]
- **Ahead segment**: `routeActive`, strokeWeight 2.5, opacity 0.9 — waypoints[activeIndex..]
- **Alternate route**: dashed pattern, `routeAlternate` — for diversion scenarios
- **Breadcrumbs**: circle symbol repeated every 14px, `breadcrumb` fill

### Markers

**AircraftMarker**: heading-aware SVG silhouette via `AdvancedMarkerElement`. `buildAircraftSVG()` generates inline SVG with glow filter. Rotation via `container.style.transform` with 0.8s ease-out transition.

**WaypointMarkers**: diamond icon (`rotate(45deg)`) for enroute fixes. Active waypoint: bright cyan with glow, higher zIndex (50). Inactive: muted slate (#334155). Click fires `onSelect({ type: 'waypoint', id })`.

**AirportMarkers**: ring icon (18px circle + 6px inner dot). Colour by role: departure=green, destination=cyan, alternate=amber. ICAO label with text-shadow.

### Scenario Overlays

`ScenarioOverlay.tsx` renders `google.maps.Circle` or `google.maps.Polygon` per active overlay:

| Kind | Colour | Severity |
|------|--------|----------|
| `weather` | Red | warning |
| `holding` | Amber | advisory |
| `comms_handoff` | Magenta | advisory |
| `vnav_conflict` | Red | caution |

Activation: `MapCanvas` maps `activeDrill.id` to overlay kind (e.g. `weather-diversion` activates `weather` overlays).

### Map Info Panel

Bottom status strip (42px): callsign, HDG (3-digit), ALT (FLxxx), GS (xxxKT), next waypoint (name + NM + bearing), destination ETE, active scenario badge with pulsing dot.

---

## Flight Plan Module

### FlightPlanTab Architecture

`FlightPlanTab.tsx` — the MFD "FPL" tab. Sub-components are file-local:

| Component | Purpose |
|-----------|---------|
| `RoutePicker` | Buttons for each route in `ROUTE_IDS`; calls `handleRouteChange` |
| `SummaryCard` | Callsign, aircraft type, tail, DEP-DEST-ALT routing, cruise params |
| `ProgressCard` | Phase chip, progress bar, active-to-next WPT strip, remaining NM/ETE, TOD cue, deviation banner |
| `ProceduresCard` | SID/STAR/APPR with live status badges (PLN/ACT/CHG/PND), runway display |
| `WaypointLegs` | Scrollable table: status icon, WPT name, training badge, airway, leg distance, bearing, altitude |
| `TrainingStatusCard` | Drill flags grid (6 flags), active drill name |

### Route Math Engine (`flight-plan-utils.ts`)

Pure functions, zero React/store dependencies. All route geometry derives from `enrichWaypoints()`.

**Core functions**:
- `haversineNm(lat1, lon1, lat2, lon2)` — great-circle distance in NM
- `bearingDeg(lat1, lon1, lat2, lon2)` — initial true bearing
- `enrichWaypoints(waypoints, cruiseSpeedKts)` → `EnrichedWaypoint[]` with computed distances, bearings, phases, ETE
- `computeProgress(waypoints, cruiseAltFt)` → `FlightPlanProgress` (single source of truth): progressPct, remainingDistNm, remainingEteMinutes, phase, todCueNm

**Training annotations**:
- `waypointTrainingAnnotation(wpId, flags, isActive)` → badge text + colour for annotated waypoints
- `deriveProcedureStatus(procType, phase, flags)` → phase-based promotion with training flag overrides

**Formatters**: `formatAltFp`, `formatBearingFp`, `formatEteFp`, `formatDistNm`, `formatRestriction`

### Types

In `types/flight-plan.ts`:
- **`EnrichedWaypoint`** — extends Waypoint with `distanceFromPrevNm`, `cumulativeDistanceNm`, `bearingToNextDeg`, `eteMinutes`, `flightPhase`, `passed`, `airway?`, `altitudeRestriction?`
- **`FlightPlanMeta`** — callsign, tail, aircraft, departure/destination/alternate, runways, Procedure objects (SID/STAR/approach), cruise params, total distance/ETE
- **`FlightPlanProgress`** — progressPct, remainingDistNm, remainingEteMinutes, distToNextNm, activeWaypointName, nextWaypointName, phase, todCueNm
- **`FlightPlanTrainingContext`** — activeDrillId?, flags: { vnavConflict, routeDeviation, wrongFrequency, runwayChange, holding, commsHandoff }
- **`FlightPlanPackage`** — meta + waypoints + training (complete route bundle)
- **`ProcedureStatus`** — `'planned' | 'active' | 'changed' | 'pending'`

In `types/map.ts`:
- **`AircraftState`** — position, heading, speedKts, altitudeFt, track, callsign
- **`MapAirport`** — id, icao, name, position, role, elevation, activeRunway?
- **`MapWaypoint`** — id, name, position, altitudeConstraintFt?, type, isActive, sequenceIndex
- **`ScenarioOverlay`** — id, kind, label, description, center, radiusMetres?, polygon?, severity, active
- **`MapLayerVisibility`** — route/airports/waypoints/weather/breadcrumbs/annotations booleans

### Procedure Status System

| Status | Badge | Visual | Trigger |
|--------|-------|--------|---------|
| `planned` | PLN | Muted cyan | Default before phase activation |
| `active` | ACT | Green | Phase matches procedure type |
| `changed` | CHG | Amber (bold) | `runwayChange` flag active |
| `pending` | PND | Amber (dim) | `routeDeviation` flag active |

---

## Route Data

### Route Registry

`route-registry.ts` — centralized `ROUTE_REGISTRY` mapping route IDs to `RouteConfig`:
- `package: FlightPlanPackage` — enriched waypoints + meta + training context
- `airports: MapAirport[]` — departure, destination, alternate
- `aircraftPosition` — starting lat/lon
- `mapCenter` + `mapZoom` — initial viewport
- `breadcrumbs: BreadcrumbPoint[]` — pre-seeded track history

**Available routes**:

| ID | Route | Aircraft | SID | STAR | Approach |
|----|-------|----------|-----|------|----------|
| `kteb-kpbi` | KTEB → KPBI | Citation CJ3+ (N389HW) | RUUDY5 | PBIE3 | ILS 10L |
| `kjfk-kbos` | KJFK → KBOS | (separate package) | — | — | — |

Lookup: `getRoute(id)` returns matching config or falls back to `kteb-kpbi`.

---

## Store Integration

### Cockpit Store Fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `activeRouteId` | `string` | `'kteb-kpbi'` | Selects route in registry |
| `selectedWaypointId` | `string \| null` | `null` | Syncs waypoint selection between map and flight plan |
| `flightPlan` | `Waypoint[]` | `[]` | Loaded waypoints for the active route |
| `heading` / `altitude` / `speed` | `number` | 360 / 36000 / 280 | Aircraft state consumed by MapDisplay |

### Data Flow

1. User selects route in `RoutePicker` → `handleRouteChange()` → `loadFlightPlan()` + `setActiveRouteId()` + clears `selectedWaypointId`
2. `MapCanvas` subscribes to `activeRouteId` → `getRoute()` → re-renders all sub-layers
3. `RouteChangeController` detects change → `map.panTo(center)` + `map.setZoom(zoom)`
4. `FlightPlanTab` loads waypoints on mount if `flightPlan` is empty

### Drill Integration

FlightPlanTab maps `activeDrill.id` to training flags:
- `descent-conflict` → `vnavConflict`
- `predict-wrong-freq` → `wrongFrequency`
- `weather-diversion` → `routeDeviation`
- `runway-change` → `runwayChange`
- `holding-pattern` → `holding`
- `comms-handoff` → `commsHandoff`

MapDisplay activates matching `ScenarioOverlay` entries by overlay kind.

---

## Mock Data (Current State)

`map-mock-data.ts` provides fallback/initial data:
- `MOCK_AIRCRAFT`: fixed position near COATE, heading 195, FL240, 280kt
- `MOCK_AIRPORTS`: KTEB (departure), KPBI (destination), KMIA (alternate)
- `MOCK_WAYPOINTS`: derived from kteb-kpbi raw waypoints
- `MOCK_SCENARIO_OVERLAYS`: 4 overlays (weather, vnav, comms, holding) — all inactive by default
- `MOCK_BREADCRUMBS`: 5 pre-seeded track points

**TODO**: Replace with live telemetry, real-time breadcrumb appending, direct drill event overlay activation.
