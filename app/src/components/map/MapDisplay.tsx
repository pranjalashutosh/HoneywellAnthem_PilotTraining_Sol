// MapDisplay — Honeywell Anthem-inspired aviation map panel.
//
// Wires together Google Maps (via @vis.gl/react-google-maps), the cockpit store,
// scenario overlays, and drill state into a cohesive avionics MFD map view.
//
// Environment variable required:
//   VITE_GOOGLE_MAPS_API_KEY=<your Google Maps JavaScript API key>
//   Ensure "Maps JavaScript API" is enabled in your Google Cloud Console.
//
// Live simulator integration points are marked with TODO comments.

import { useState, useCallback, useRef, useEffect } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { AircraftMarker, AircraftHalo } from './AircraftMarker';
import { RoutePolyline, BreadcrumbTrail } from './RouteOverlay';
import { WaypointMarkers, AirportMarkers, MarkerInfoCard } from './WaypointMarkers';
import { ScenarioOverlays, OverlayInfoCard } from './ScenarioOverlay';
import { MapControls } from './MapControls';
import { MapInfoPanel } from './MapInfoPanel';
import { AVIONICS_MAP_STYLE } from './mapTheme';
import {
  MOCK_AIRCRAFT,
  MOCK_WAYPOINTS,
  MOCK_SCENARIO_OVERLAYS,
  KTEB_KPBI_MAP_CENTER,
  KTEB_KPBI_MAP_ZOOM,
} from '@/data/map-mock-data';
import { getRoute } from '@/data/flight-plans/route-registry';
import type {
  AircraftState,
  MapAirport,
  MapLayerVisibility,
  MapWaypoint,
  ScenarioOverlay as ScenarioOverlayType,
  SelectedMapFeature,
} from '@/types/map';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// ── MapDisplay (exported) ──────────────────────────────────────────────────

export function MapDisplay() {
  const [authError, setAuthError] = useState(false);

  if (!API_KEY) {
    return <MapApiKeyPlaceholder />;
  }

  if (authError) {
    return <MapAuthErrorPanel />;
  }

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={['marker']}
      onError={() => setAuthError(true)}
    >
      <MapCanvas />
    </APIProvider>
  );
}

// ── MapCanvas — inner component that has access to map context ─────────────

function MapCanvas() {
  // ── State ────────────────────────────────────────────────────────────────

  const [layers, setLayers] = useState<MapLayerVisibility>({
    route: true,
    airports: true,
    waypoints: true,
    weather: true,
    breadcrumbs: true,
    annotations: true,
  });

  const [selectedFeature, setSelectedFeature] = useState<SelectedMapFeature | null>(null);

  // ── Cockpit store ─────────────────────────────────────────────────────────
  const heading = useCockpitStore((s) => s.heading);
  const altitude = useCockpitStore((s) => s.altitude);
  const speed = useCockpitStore((s) => s.speed);
  const activeRouteId = useCockpitStore((s) => s.activeRouteId);

  // Route config — airports, aircraft start position, map viewport
  const routeConfig = getRoute(activeRouteId);

  const aircraft: AircraftState = {
    ...MOCK_AIRCRAFT,
    heading,
    altitudeFt: altitude,
    speedKts: speed,
    callsign: routeConfig.package.meta.callsign,
    position: routeConfig.aircraftPosition,
  };

  // ── Scenario store — activate overlays based on active drill ──────────────
  const activeDrill = useScenarioStore((s) => s.activeDrill);

  const overlays: ScenarioOverlayType[] = MOCK_SCENARIO_OVERLAYS.map((o) => ({
    ...o,
    // TODO: connect to drill event state when scenario runner fires overlay events
    active:
      o.active ||
      (activeDrill?.id === 'weather-diversion' && o.kind === 'weather') ||
      (activeDrill?.id === 'descent-conflict' && o.kind === 'vnav_conflict') ||
      (activeDrill?.id === 'comms-handoff' && o.kind === 'comms_handoff') ||
      (activeDrill?.id === 'holding-pattern' && o.kind === 'holding'),
  }));

  const hasActiveScenario = overlays.some((o) => o.active);
  const activeOverlay = overlays.find((o) => o.active) ?? null;

  // ── Waypoints from cockpit store flight plan ──────────────────────────────
  const flightPlan = useCockpitStore((s) => s.flightPlan);
  const waypoints: MapWaypoint[] =
    flightPlan.length > 0
      ? flightPlan
          .filter((wp) => !['KTEB', 'KPBI', 'KJFK', 'KBOS'].includes(wp.id))
          .map((wp, i) => ({
            id: wp.id,
            name: wp.name,
            position: { lat: wp.lat, lon: wp.lon },
            altitudeConstraintFt: wp.altitude,
            type: 'fix' as const,
            isActive: wp.isActive,
            sequenceIndex: i + 1,
          }))
      : MOCK_WAYPOINTS;

  const airports: MapAirport[] = routeConfig.airports;

  const activeWpIndex = Math.max(
    0,
    waypoints.findIndex((w) => w.isActive),
  );
  const nextWaypoint = waypoints[activeWpIndex];
  const destination = airports.find((a) => a.role === 'destination');

  // ── Selected feature info ─────────────────────────────────────────────────
  const selectedOverlay = selectedFeature?.type === 'overlay'
    ? overlays.find((o) => o.id === selectedFeature.id) ?? null
    : null;

  // Show marker card for waypoint or airport; overlay card for overlays
  const showMarkerCard =
    selectedFeature?.type === 'waypoint' || selectedFeature?.type === 'airport';
  const showOverlayCard = selectedFeature?.type === 'overlay';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleLayer = useCallback((layer: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleSelect = useCallback((feature: SelectedMapFeature | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleClose = useCallback(() => setSelectedFeature(null), []);

  // ── Recenter ──────────────────────────────────────────────────────────────
  const recenterRef = useRef<(() => void) | null>(null);
  const handleRecenter = useCallback(() => {
    recenterRef.current?.();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Map
        defaultCenter={KTEB_KPBI_MAP_CENTER}
        defaultZoom={KTEB_KPBI_MAP_ZOOM}
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID ?? 'DEMO_MAP_ID'}
        colorScheme={'DARK' as google.maps.ColorScheme}
        mapTypeId="roadmap"
        disableDefaultUI={true}
        gestureHandling="greedy"
        clickableIcons={false}
        minZoom={4}
        maxZoom={14}
        styles={AVIONICS_MAP_STYLE}
        backgroundColor="#0a0e17"
        className="w-full h-full"
      >
        <RecenterController
          position={aircraft.position}
          registerRecenter={(fn) => { recenterRef.current = fn; }}
        />

        {/* Route polyline */}
        {layers.route && waypoints.length > 0 && (
          <RoutePolyline
            waypoints={waypoints}
            activeIndex={activeWpIndex}
          />
        )}

        {/* Re-center map when route changes */}
        <RouteChangeController
          routeId={activeRouteId}
          center={routeConfig.mapCenter}
          zoom={routeConfig.mapZoom}
        />

        {/* Breadcrumb trail */}
        {layers.breadcrumbs && (
          <BreadcrumbTrail crumbs={routeConfig.breadcrumbs} />
        )}

        {/* Aircraft */}
        <AircraftHalo position={aircraft.position} />
        <AircraftMarker aircraft={aircraft} />

        {/* Airport markers */}
        {layers.airports && (
          <AirportMarkers airports={airports} onSelect={handleSelect} />
        )}

        {/* Waypoint markers */}
        {layers.waypoints && (
          <WaypointMarkers waypoints={waypoints} onSelect={handleSelect} />
        )}

        {/* Scenario overlays */}
        {layers.weather && (
          <ScenarioOverlays overlays={overlays} onSelect={handleSelect} />
        )}
      </Map>

      {/* Floating info cards (outside Map but inside relative container) */}
      {showMarkerCard && (
        <MarkerInfoCard
          selected={selectedFeature}
          waypoints={waypoints}
          airports={airports}
          onClose={handleClose}
        />
      )}
      {showOverlayCard && (
        <OverlayInfoCard
          overlay={selectedOverlay}
          onClose={handleClose}
        />
      )}

      {/* Controls */}
      <MapControls
        layers={layers}
        onToggleLayer={toggleLayer}
        onRecenter={handleRecenter}
        hasActiveScenario={hasActiveScenario}
      />

      {/* Info strip */}
      <MapInfoPanel
        aircraft={aircraft}
        destination={destination}
        nextWaypoint={nextWaypoint}
        activeOverlay={activeOverlay}
      />

      {/* Scenario active badge — top center */}
      {hasActiveScenario && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded"
          style={{
            background: 'rgba(10,14,23,0.92)',
            border: '1px solid rgba(239,68,68,0.5)',
            boxShadow: '0 0 10px rgba(239,68,68,0.2)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="font-mono text-[9px] tracking-widest text-red-400">
            SCENARIO ACTIVE
          </span>
        </div>
      )}
    </div>
  );
}

// ── RouteChangeController — pans + zooms map when active route changes ────────

interface RouteChangeControllerProps {
  routeId: string;
  center: { lat: number; lng: number };
  zoom: number;
}

function RouteChangeController({ routeId, center, zoom }: RouteChangeControllerProps) {
  const map = useMap();
  const prevRouteId = useRef(routeId);

  useEffect(() => {
    if (!map || routeId === prevRouteId.current) return;
    prevRouteId.current = routeId;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, routeId, center, zoom]);

  return null;
}

// ── RecenterController — registers a recenter fn back to parent ────────────

interface RecenterControllerProps {
  position: { lat: number; lon: number };
  registerRecenter: (fn: () => void) => void;
}

function RecenterController({ position, registerRecenter }: RecenterControllerProps) {
  const map = useMap();

  useEffect(() => {
    registerRecenter(() => {
      if (map) {
        map.panTo({ lat: position.lat, lng: position.lon });
        map.setZoom(8);
      }
    });
  }, [map, position, registerRecenter]);

  return null;
}

// ── API auth error panel (invalid key / Maps JS API not enabled) ──────────

function MapAuthErrorPanel() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 select-none overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0e17 0%, #0f1923 100%)' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ border: '2px solid rgba(239,68,68,0.4)', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}
      >
        <span className="text-red-400 text-2xl">⚠</span>
      </div>
      <div className="text-center space-y-1">
        <div className="font-mono text-xs font-bold tracking-wider text-red-400">
          MAP API ERROR
        </div>
        <div className="font-mono text-[10px] tracking-wide text-slate-500">
          MAPS JAVASCRIPT API NOT ENABLED
        </div>
      </div>
      <div
        className="max-w-[260px] rounded p-3 space-y-2"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <div className="font-mono text-[9px] text-red-400/70 tracking-widest">FIX</div>
        <div className="font-mono text-[9px] text-slate-400 leading-relaxed space-y-1">
          <div>1. Go to <span className="text-cyan-400/80">console.cloud.google.com</span></div>
          <div>2. APIs &amp; Services → Library</div>
          <div>3. Search <span className="text-cyan-400/80">"Maps JavaScript API"</span></div>
          <div>4. Click <span className="text-green-400/80">Enable</span></div>
          <div>5. Also enable <span className="text-cyan-400/80">billing</span> on the project</div>
          <div>6. Restart the dev server</div>
        </div>
      </div>
    </div>
  );
}

// ── No API key placeholder ─────────────────────────────────────────────────

function MapApiKeyPlaceholder() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 select-none overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0e17 0%, #0f1923 100%)',
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 39px,
            rgba(0,212,255,0.04) 39px,
            rgba(0,212,255,0.04) 40px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 39px,
            rgba(0,212,255,0.04) 39px,
            rgba(0,212,255,0.04) 40px
          )
        `,
      }}
    >
      {/* Compass rose placeholder */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          border: '2px solid rgba(0,212,255,0.2)',
          boxShadow: '0 0 24px rgba(0,212,255,0.08), inset 0 0 24px rgba(0,212,255,0.04)',
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ border: '1px solid rgba(0,212,255,0.15)' }}
        >
          <span className="text-cyan-400/50 text-xl">🧭</span>
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <div className="font-mono text-xs font-bold tracking-wider text-cyan-300/70">
          MAP DISPLAY
        </div>
        <div className="font-mono text-[10px] tracking-wider text-slate-500">
          GOOGLE MAPS API KEY REQUIRED
        </div>
      </div>

      {/* Setup instructions */}
      <div
        className="max-w-[280px] rounded p-3 space-y-2"
        style={{
          background: 'rgba(0,212,255,0.05)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <div className="font-mono text-[9px] tracking-widest text-cyan-400/60">
          SETUP
        </div>
        <div className="font-mono text-[9px] text-slate-400 leading-relaxed space-y-1">
          <div>1. Enable <span className="text-cyan-400/80">Maps JavaScript API</span> in Google Cloud Console</div>
          <div>2. Create an API key with referrer restriction</div>
          <div>
            3. Add to <span className="text-cyan-400/80">app/.env</span>:
          </div>
          <div
            className="px-2 py-1 rounded text-[9px] font-mono"
            style={{ background: 'rgba(0,0,0,0.4)', color: '#22c55e' }}
          >
            VITE_GOOGLE_MAPS_API_KEY=AIza...
          </div>
        </div>
      </div>

      {/* Route ghost lines for visual richness */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          points="20%,15% 35%,30% 45%,42% 55%,55% 65%,67% 78%,82%"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
        {[
          [35, 30], [45, 42], [55, 55], [65, 67],
        ].map(([cx, cy], i) => (
          <rect
            key={i}
            x={`${cx}%`}
            y={`${cy}%`}
            width="6"
            height="6"
            transform={`rotate(45, ${cx}, ${cy})`}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
