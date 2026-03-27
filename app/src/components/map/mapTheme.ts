// Honeywell Anthem-style dark avionics map theme for Google Maps.
// Strips consumer clutter, emphasises terrain + coastlines, uses the Anthem palette.

export const AVIONICS_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // ── Canvas base ───────────────────────────────────────────────────────────
  { elementType: 'geometry', stylers: [{ color: '#0a0e17' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0e17' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },

  // ── Water ─────────────────────────────────────────────────────────────────
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d1b2e' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1e3a5f' }],
  },

  // ── Landscape / terrain ───────────────────────────────────────────────────
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0f1923' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#131d28' }],
  },

  // ── Roads — heavily muted ──────────────────────────────────────────────────
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a2235' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0a0e17' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2a3548' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0a0e17' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },

  // ── Points of interest — hidden ───────────────────────────────────────────
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0e1a24' }],
  },

  // ── Transit — hidden ──────────────────────────────────────────────────────
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // ── Administrative boundaries ─────────────────────────────────────────────
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e3a5f' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#172034' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0a0e17' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },
];

/** Default map options shared across all MapDisplay instances */
export const MAP_DEFAULT_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'roadmap',
  disableDefaultUI: true,      // hide all default chrome
  gestureHandling: 'greedy',   // single-finger pan on touch
  clickableIcons: false,
  minZoom: 4,
  maxZoom: 14,
  styles: AVIONICS_MAP_STYLE,
  backgroundColor: '#0a0e17',
};

/** Anthem colour tokens used for map overlays */
export const MAP_COLORS = {
  routeActive: '#00d4ff',       // anthem-cyan
  routeDim: '#0891b2',          // anthem-cyan-dim
  routeAlternate: '#475569',    // muted for diversion/alternate
  waypointActive: '#00d4ff',
  waypointInactive: '#334155',
  waypointText: '#e2e8f0',
  airportDep: '#22c55e',        // anthem-green
  airportDest: '#00d4ff',       // anthem-cyan
  airportAlt: '#f59e0b',        // anthem-amber
  aircraft: '#00d4ff',
  breadcrumb: 'rgba(0,212,255,0.35)',
  overlayWeather: 'rgba(239,68,68,0.18)',     // red tint
  overlayWeatherBorder: '#ef4444',
  overlayHolding: 'rgba(245,158,11,0.15)',    // amber tint
  overlayHoldingBorder: '#f59e0b',
  overlayComms: 'rgba(224,64,251,0.15)',      // magenta tint
  overlayCommsBorder: '#e040fb',
  overlayVnav: 'rgba(239,68,68,0.12)',
  overlayVnavBorder: '#ef4444',
  overlayAnnotation: 'rgba(0,212,255,0.10)',
  overlayAnnotationBorder: '#00d4ff',
} as const;
