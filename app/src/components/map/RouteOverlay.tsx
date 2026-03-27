// RouteOverlay — draws the flight route polyline and optional breadcrumb trail
// using the imperative Google Maps API via useMapsLibrary.

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { MapWaypoint, BreadcrumbPoint } from '@/types/map';
import { MAP_COLORS } from './mapTheme';

interface RoutePolylineProps {
  waypoints: MapWaypoint[];
  /** Index of the "active" (current) leg — legs before it are dimmed */
  activeIndex: number;
  /** Whether to show an alternate dashed route (diversion scenario) */
  showAlternate?: boolean;
  alternatePoints?: Array<{ lat: number; lon: number }>;
}

/** Draws the main route polyline split into flown (dim) and ahead (bright) segments. */
export function RoutePolyline({
  waypoints,
  activeIndex,
  showAlternate,
  alternatePoints,
}: RoutePolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const flownRef = useRef<google.maps.Polyline | null>(null);
  const aheadRef = useRef<google.maps.Polyline | null>(null);
  const altRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const allPoints = waypoints.map((wp) => ({
      lat: wp.position.lat,
      lng: wp.position.lon,
    }));

    const flownPoints = allPoints.slice(0, activeIndex + 1);
    const aheadPoints = allPoints.slice(activeIndex);

    // Flown segment — dim
    flownRef.current = new mapsLib.Polyline({
      path: flownPoints,
      strokeColor: MAP_COLORS.routeDim,
      strokeWeight: 2,
      strokeOpacity: 0.4,
      map,
      zIndex: 10,
    });

    // Ahead segment — bright cyan
    aheadRef.current = new mapsLib.Polyline({
      path: aheadPoints,
      strokeColor: MAP_COLORS.routeActive,
      strokeWeight: 2.5,
      strokeOpacity: 0.9,
      map,
      zIndex: 11,
    });

    return () => {
      flownRef.current?.setMap(null);
      aheadRef.current?.setMap(null);
      flownRef.current = null;
      aheadRef.current = null;
    };
  }, [map, mapsLib, waypoints, activeIndex]);

  // Alternate / diversion dashed route
  useEffect(() => {
    if (!map || !mapsLib || !showAlternate || !alternatePoints?.length) {
      altRef.current?.setMap(null);
      altRef.current = null;
      return;
    }

    altRef.current = new mapsLib.Polyline({
      path: alternatePoints.map((p) => ({ lat: p.lat, lng: p.lon })),
      strokeColor: MAP_COLORS.routeAlternate,
      strokeWeight: 2,
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: MAP_COLORS.routeAlternate, scale: 3 },
          offset: '0',
          repeat: '16px',
        },
      ],
      map,
      zIndex: 9,
    });

    return () => {
      altRef.current?.setMap(null);
      altRef.current = null;
    };
  }, [map, mapsLib, showAlternate, alternatePoints]);

  return null;
}

interface BreadcrumbTrailProps {
  crumbs: BreadcrumbPoint[];
}

/** Draws the aircraft's historical track as a fading dotted trail. */
export function BreadcrumbTrail({ crumbs }: BreadcrumbTrailProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib || crumbs.length < 2) return;

    lineRef.current = new mapsLib.Polyline({
      path: crumbs.map((c) => ({ lat: c.position.lat, lng: c.position.lon })),
      strokeColor: MAP_COLORS.breadcrumb,
      strokeWeight: 2,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 2,
            fillColor: MAP_COLORS.breadcrumb,
            fillOpacity: 0.8,
            strokeWeight: 0,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
      map,
      zIndex: 8,
    });

    return () => {
      lineRef.current?.setMap(null);
      lineRef.current = null;
    };
  }, [map, mapsLib, crumbs]);

  return null;
}
