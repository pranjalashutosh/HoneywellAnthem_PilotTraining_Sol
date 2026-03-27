// AircraftMarker — heading-aware aircraft SVG pinned to the map via AdvancedMarker.

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { AircraftState } from '@/types/map';
import { MAP_COLORS } from './mapTheme';

interface AircraftMarkerProps {
  aircraft: AircraftState;
}

/** SVG aircraft silhouette (top-down view, north-up at 0°). */
function buildAircraftSVG(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Aircraft body -->
  <g filter="url(#glow)" fill="${color}" stroke="${color}" stroke-width="0.4">
    <!-- Fuselage -->
    <polygon points="16,2 18,14 17,22 16,26 15,22 14,14" opacity="1"/>
    <!-- Main wings -->
    <polygon points="16,10 30,18 28,20 16,15 4,20 2,18" opacity="0.95"/>
    <!-- Tail fins -->
    <polygon points="16,20 22,26 21,27 16,23 11,27 10,26" opacity="0.9"/>
    <!-- Nose highlight -->
    <circle cx="16" cy="4" r="1.5" opacity="0.6"/>
  </g>
</svg>`;
}

export function AircraftMarker({ aircraft }: AircraftMarkerProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Build or update the marker
  useEffect(() => {
    if (!map || !markerLib) return;

    const { AdvancedMarkerElement } = markerLib;

    const container = document.createElement('div');
    container.style.transform = `rotate(${aircraft.heading}deg)`;
    container.style.transition = 'transform 0.8s ease-out';
    container.style.width = '32px';
    container.style.height = '32px';
    container.innerHTML = buildAircraftSVG(MAP_COLORS.aircraft);

    if (!markerRef.current) {
      markerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat: aircraft.position.lat, lng: aircraft.position.lon },
        content: container,
        title: aircraft.callsign,
        zIndex: 100,
      });
    } else {
      markerRef.current.position = {
        lat: aircraft.position.lat,
        lng: aircraft.position.lon,
      };
      const existing = markerRef.current.content as HTMLDivElement;
      if (existing) {
        existing.style.transform = `rotate(${aircraft.heading}deg)`;
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
    // Re-run only when map/lib are first available; position/heading handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerLib]);

  // Update position + heading when aircraft state changes
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.position = {
      lat: aircraft.position.lat,
      lng: aircraft.position.lon,
    };
    const content = markerRef.current.content as HTMLDivElement | null;
    if (content) {
      content.style.transform = `rotate(${aircraft.heading}deg)`;
    }
  }, [aircraft.position.lat, aircraft.position.lon, aircraft.heading]);

  return null;
}

/** Cyan pulsing halo drawn as a separate AdvancedMarker behind the aircraft. */
export function AircraftHalo({ position }: { position: AircraftState['position'] }) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map || !markerLib) return;
    const { AdvancedMarkerElement } = markerLib;

    const halo = document.createElement('div');
    halo.style.cssText = `
      width: 48px; height: 48px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,212,255,0.5);
      box-shadow: 0 0 12px rgba(0,212,255,0.3);
      animation: mapHaloPulse 2s ease-in-out infinite;
      transform: translate(-8px, -8px);
    `;

    // Inject keyframes once
    if (!document.getElementById('map-halo-style')) {
      const style = document.createElement('style');
      style.id = 'map-halo-style';
      style.textContent = `
        @keyframes mapHaloPulse {
          0%, 100% { opacity: 0.6; transform: translate(-8px,-8px) scale(1); }
          50% { opacity: 0.2; transform: translate(-8px,-8px) scale(1.15); }
        }
      `;
      document.head.appendChild(style);
    }

    markerRef.current = new AdvancedMarkerElement({
      map,
      position: { lat: position.lat, lng: position.lon },
      content: halo,
      zIndex: 99,
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerLib]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.position = { lat: position.lat, lng: position.lon };
  }, [position.lat, position.lon]);

  return null;
}
