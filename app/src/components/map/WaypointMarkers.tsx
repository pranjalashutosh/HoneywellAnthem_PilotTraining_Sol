// WaypointMarkers + AirportMarkers — themed aviation markers with info popups.

import { useEffect, useRef, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { MapWaypoint, MapAirport, SelectedMapFeature } from '@/types/map';
import { MAP_COLORS } from './mapTheme';

// ── Waypoint ───────────────────────────────────────────────────────────────

interface WaypointMarkersProps {
  waypoints: MapWaypoint[];
  onSelect: (feature: SelectedMapFeature | null) => void;
}

function buildWaypointElement(wp: MapWaypoint): HTMLDivElement {
  const isActive = wp.isActive;
  const color = isActive ? MAP_COLORS.waypointActive : MAP_COLORS.waypointInactive;

  const el = document.createElement('div');
  el.style.cssText = `
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  `;

  // Diamond icon
  const diamond = document.createElement('div');
  diamond.style.cssText = `
    width: 10px; height: 10px;
    background: ${color};
    transform: rotate(45deg);
    border: 1px solid ${isActive ? 'rgba(0,212,255,0.8)' : 'rgba(51,65,85,0.8)'};
    ${isActive ? `box-shadow: 0 0 6px ${color};` : ''}
    transition: box-shadow 0.2s;
  `;

  // Label
  const label = document.createElement('div');
  label.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: ${isActive ? '#e2e8f0' : '#475569'};
    white-space: nowrap;
    text-shadow: 0 0 4px rgba(0,0,0,0.8);
    pointer-events: none;
  `;
  label.textContent = wp.name;

  el.appendChild(diamond);
  el.appendChild(label);
  return el;
}

export function WaypointMarkers({ waypoints, onSelect }: WaypointMarkersProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    if (!map || !markerLib) return;
    const { AdvancedMarkerElement } = markerLib;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    waypoints.forEach((wp) => {
      const content = buildWaypointElement(wp);
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: wp.position.lat, lng: wp.position.lon },
        content,
        title: wp.name,
        zIndex: wp.isActive ? 50 : 30,
      });

      marker.addListener('gmp-click', () => {
        onSelect({ type: 'waypoint', id: wp.id });
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
  }, [map, markerLib, waypoints, onSelect]);

  return null;
}

// ── Airport ────────────────────────────────────────────────────────────────

interface AirportMarkersProps {
  airports: MapAirport[];
  onSelect: (feature: SelectedMapFeature | null) => void;
}

function buildAirportElement(airport: MapAirport): HTMLDivElement {
  const colorMap = {
    departure: MAP_COLORS.airportDep,
    destination: MAP_COLORS.airportDest,
    alternate: MAP_COLORS.airportAlt,
  } as const;
  const color = colorMap[airport.role];

  const el = document.createElement('div');
  el.style.cssText = `
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  `;

  // Ring icon
  const ring = document.createElement('div');
  ring.style.cssText = `
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid ${color};
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 8px ${color}80;
  `;

  // Inner dot
  const dot = document.createElement('div');
  dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background: ${color};`;
  ring.appendChild(dot);

  // ICAO label
  const label = document.createElement('div');
  label.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: ${color};
    text-shadow: 0 0 6px rgba(0,0,0,0.9), 0 0 3px ${color}60;
    white-space: nowrap;
    pointer-events: none;
  `;
  label.textContent = airport.icao;

  el.appendChild(ring);
  el.appendChild(label);
  return el;
}

export function AirportMarkers({ airports, onSelect }: AirportMarkersProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    if (!map || !markerLib) return;
    const { AdvancedMarkerElement } = markerLib;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    airports.forEach((airport) => {
      const content = buildAirportElement(airport);
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: airport.position.lat, lng: airport.position.lon },
        content,
        title: airport.name,
        zIndex: 60,
      });

      marker.addListener('gmp-click', () => {
        onSelect({ type: 'airport', id: airport.id });
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
  }, [map, markerLib, airports, onSelect]);

  return null;
}

// ── Popup card (rendered in React, positioned via state) ───────────────────

interface MarkerPopupProps {
  selected: SelectedMapFeature | null;
  waypoints: MapWaypoint[];
  airports: MapAirport[];
  onClose: () => void;
}

export function MarkerInfoCard({ selected, waypoints, airports, onClose }: MarkerPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!selected);
  }, [selected]);

  if (!selected || !visible) return null;

  const wp = selected.type === 'waypoint' ? waypoints.find((w) => w.id === selected.id) : null;
  const ap = selected.type === 'airport' ? airports.find((a) => a.id === selected.id) : null;

  const borderColor =
    ap?.role === 'departure'
      ? MAP_COLORS.airportDep
      : ap?.role === 'alternate'
        ? MAP_COLORS.airportAlt
        : MAP_COLORS.waypointActive;

  return (
    <div
      className="absolute top-3 left-3 z-20 min-w-[160px] max-w-[220px] rounded"
      style={{
        background: 'rgba(10,14,23,0.96)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 12px ${borderColor}40`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: `${borderColor}40` }}
      >
        <span
          className="font-mono text-xs font-bold tracking-wider"
          style={{ color: borderColor }}
        >
          {wp ? wp.name : ap?.icao}
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs leading-none ml-2"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {wp && (
          <>
            <Row label="TYPE" value="FIX" />
            <Row label="SEQ" value={`#${wp.sequenceIndex}`} />
            {wp.altitudeConstraintFt ? (
              <Row label="ALT CSTR" value={`FL${Math.round(wp.altitudeConstraintFt / 100)}`} />
            ) : null}
            <Row label="STATUS" value={wp.isActive ? 'ACTIVE LEG' : 'PENDING'} highlight={wp.isActive} />
          </>
        )}
        {ap && (
          <>
            <Row label="TYPE" value={ap.role.toUpperCase()} />
            <Row label="NAME" value={ap.name} small />
            <Row label="ELEV" value={`${ap.elevation} ft`} />
            {ap.activeRunway && <Row label="RWY" value={ap.activeRunway} />}
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="font-mono text-[9px] tracking-widest text-slate-500 shrink-0">{label}</span>
      <span
        className={`font-mono text-right leading-tight ${small ? 'text-[9px]' : 'text-[10px]'} ${
          highlight ? 'text-cyan-300' : 'text-slate-300'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
