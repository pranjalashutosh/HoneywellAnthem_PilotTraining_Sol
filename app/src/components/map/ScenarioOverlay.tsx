// ScenarioOverlay — draws weather zones, holding regions, comms handoff areas,
// and instructor annotations as themed circles/polygons on the map.

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { ScenarioOverlay as ScenarioOverlayType, SelectedMapFeature } from '@/types/map';
import { MAP_COLORS } from './mapTheme';

interface ScenarioOverlaysProps {
  overlays: ScenarioOverlayType[];
  onSelect: (feature: SelectedMapFeature | null) => void;
}

function resolveColors(overlay: ScenarioOverlayType): {
  fill: string;
  stroke: string;
} {
  switch (overlay.kind) {
    case 'weather':
      return { fill: MAP_COLORS.overlayWeather, stroke: MAP_COLORS.overlayWeatherBorder };
    case 'holding':
      return { fill: MAP_COLORS.overlayHolding, stroke: MAP_COLORS.overlayHoldingBorder };
    case 'comms_handoff':
      return { fill: MAP_COLORS.overlayComms, stroke: MAP_COLORS.overlayCommsBorder };
    case 'vnav_conflict':
      return { fill: MAP_COLORS.overlayVnav, stroke: MAP_COLORS.overlayVnavBorder };
    case 'instructor_annotation':
    case 'deviation':
    case 'runway_change':
      return { fill: MAP_COLORS.overlayAnnotation, stroke: MAP_COLORS.overlayAnnotationBorder };
  }
}

export function ScenarioOverlays({ overlays, onSelect }: ScenarioOverlaysProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const shapesRef = useRef<(google.maps.Circle | google.maps.Polygon)[]>([]);
  const labelsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerLib = useMapsLibrary('marker');

  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clear old shapes
    shapesRef.current.forEach((s) => s.setMap(null));
    shapesRef.current = [];
    labelsRef.current.forEach((m) => (m.map = null));
    labelsRef.current = [];

    const active = overlays.filter((o) => o.active);

    active.forEach((overlay) => {
      const { fill, stroke } = resolveColors(overlay);
      const shapeOptions = {
        map,
        fillColor: fill,
        fillOpacity: 1,
        strokeColor: stroke,
        strokeWeight: 1.5,
        strokeOpacity: 0.8,
        clickable: true,
        zIndex: 20,
      };

      let shape: google.maps.Circle | google.maps.Polygon;

      if (overlay.polygon && overlay.polygon.length > 2) {
        shape = new mapsLib.Polygon({
          ...shapeOptions,
          paths: overlay.polygon.map((p) => ({ lat: p.lat, lng: p.lon })),
        });
      } else {
        shape = new mapsLib.Circle({
          ...shapeOptions,
          center: { lat: overlay.center.lat, lng: overlay.center.lon },
          radius: overlay.radiusMetres ?? 50_000,
        });
      }

      shape.addListener('click', () => {        // circles/polygons use standard click
        onSelect({ type: 'overlay', id: overlay.id });
      });

      shapesRef.current.push(shape);

      // Label marker — only if marker library is loaded
      if (markerLib) {
        const { AdvancedMarkerElement } = markerLib;
        const labelEl = document.createElement('div');
        labelEl.style.cssText = `
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: ${stroke};
          text-shadow: 0 0 4px rgba(0,0,0,0.9);
          white-space: nowrap;
          pointer-events: none;
          padding: 2px 6px;
          background: rgba(0,0,0,0.6);
          border: 1px solid ${stroke}60;
          border-radius: 2px;
        `;
        labelEl.textContent = overlay.label;

        const labelMarker = new AdvancedMarkerElement({
          map,
          position: { lat: overlay.center.lat, lng: overlay.center.lon },
          content: labelEl,
          zIndex: 21,
        });

        labelMarker.addListener('gmp-click', () => {
          onSelect({ type: 'overlay', id: overlay.id });
        });

        labelsRef.current.push(labelMarker);
      }
    });

    return () => {
      shapesRef.current.forEach((s) => s.setMap(null));
      shapesRef.current = [];
      labelsRef.current.forEach((m) => (m.map = null));
      labelsRef.current = [];
    };
  }, [map, mapsLib, markerLib, overlays, onSelect]);

  return null;
}

// ── Overlay info card (rendered in React) ──────────────────────────────────

interface OverlayInfoCardProps {
  overlay: ScenarioOverlayType | null;
  onClose: () => void;
}

const KIND_LABELS: Record<ScenarioOverlayType['kind'], string> = {
  weather: 'WEATHER',
  holding: 'HOLDING',
  runway_change: 'RWY CHANGE',
  comms_handoff: 'FREQ HANDOFF',
  vnav_conflict: 'VNAV CSTR',
  instructor_annotation: 'ANNOTATION',
  deviation: 'DEVIATION',
};

const SEVERITY_COLORS: Record<ScenarioOverlayType['severity'], string> = {
  advisory: MAP_COLORS.overlayAnnotationBorder,
  caution: MAP_COLORS.overlayHoldingBorder,
  warning: MAP_COLORS.overlayWeatherBorder,
};

export function OverlayInfoCard({ overlay, onClose }: OverlayInfoCardProps) {
  if (!overlay) return null;

  const color = SEVERITY_COLORS[overlay.severity];

  return (
    <div
      className="absolute top-3 left-3 z-20 max-w-[220px] rounded"
      style={{
        background: 'rgba(10,14,23,0.96)',
        border: `1px solid ${color}`,
        boxShadow: `0 0 12px ${color}40`,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: `${color}40` }}
      >
        <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color }}>
          {KIND_LABELS[overlay.kind]}
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs ml-2"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="font-mono text-[10px] font-bold tracking-wide" style={{ color }}>
          {overlay.label}
        </div>
        <div className="font-sans text-[10px] text-slate-400 leading-relaxed">
          {overlay.description}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          <span className="font-mono text-[9px] tracking-widest" style={{ color }}>
            {overlay.severity.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
