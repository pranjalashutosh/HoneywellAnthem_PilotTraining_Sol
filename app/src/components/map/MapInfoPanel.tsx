// MapInfoPanel — compact status strip at the bottom of the map canvas.
// Shows aircraft state, route summary, active scenario, and ETE/distance.

import type { AircraftState, MapAirport, MapWaypoint, ScenarioOverlay } from '@/types/map';

interface MapInfoPanelProps {
  aircraft: AircraftState;
  destination: MapAirport | undefined;
  nextWaypoint: MapWaypoint | undefined;
  activeOverlay: ScenarioOverlay | null;
}

/** Haversine distance in nautical miles between two lat/lon points. */
function distanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3440.065; // NM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True bearing in degrees from point 1 → point 2. */
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function MapInfoPanel({
  aircraft,
  destination,
  nextWaypoint,
  activeOverlay,
}: MapInfoPanelProps) {
  const destNm = destination
    ? distanceNm(
        aircraft.position.lat,
        aircraft.position.lon,
        destination.position.lat,
        destination.position.lon,
      )
    : null;

  const nextNm = nextWaypoint
    ? distanceNm(
        aircraft.position.lat,
        aircraft.position.lon,
        nextWaypoint.position.lat,
        nextWaypoint.position.lon,
      )
    : null;

  const nextBrg = nextWaypoint
    ? bearing(
        aircraft.position.lat,
        aircraft.position.lon,
        nextWaypoint.position.lat,
        nextWaypoint.position.lon,
      )
    : null;

  const eteMin =
    destNm && aircraft.speedKts > 0
      ? Math.round((destNm / aircraft.speedKts) * 60)
      : null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
      style={{
        background: 'rgba(10,14,23,0.93)',
        borderTop: '1px solid rgba(0,212,255,0.15)',
        height: '42px',
      }}
    >
      {/* Aircraft callsign + heading */}
      <InfoCell label="A/C" value={aircraft.callsign} accent />
      <Divider />
      <InfoCell label="HDG" value={`${Math.round(aircraft.heading).toString().padStart(3, '0')}°`} />
      <Divider />
      <InfoCell label="ALT" value={`FL${Math.round(aircraft.altitudeFt / 100)}`} />
      <Divider />
      <InfoCell label="GS" value={`${aircraft.speedKts}KT`} />
      <Divider />

      {/* Next waypoint */}
      {nextWaypoint && nextNm !== null && nextBrg !== null ? (
        <>
          <InfoCell
            label="NEXT"
            value={nextWaypoint.name}
            sub={`${Math.round(nextNm)}NM / ${Math.round(nextBrg).toString().padStart(3, '0')}°`}
          />
          <Divider />
        </>
      ) : null}

      {/* Destination ETE */}
      {destination && eteMin !== null ? (
        <>
          <InfoCell
            label={destination.icao}
            value={`${eteMin}MIN`}
            sub={`${Math.round(destNm ?? 0)}NM`}
          />
          <Divider />
        </>
      ) : null}

      {/* Active scenario badge */}
      {activeOverlay ? (
        <div
          className="flex items-center px-2 gap-1.5 ml-auto"
          style={{ borderLeft: '1px solid rgba(30,41,59,0.6)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background:
                activeOverlay.severity === 'warning'
                  ? '#ef4444'
                  : activeOverlay.severity === 'caution'
                    ? '#f59e0b'
                    : '#00d4ff',
            }}
          />
          <span
            className="font-mono text-[9px] tracking-widest"
            style={{
              color:
                activeOverlay.severity === 'warning'
                  ? '#ef4444'
                  : activeOverlay.severity === 'caution'
                    ? '#f59e0b'
                    : '#00d4ff',
            }}
          >
            {activeOverlay.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function InfoCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center px-2.5 min-w-[46px]">
      <span className="font-mono text-[8px] tracking-widest text-slate-600 leading-none">
        {label}
      </span>
      <span
        className={`font-mono text-[11px] font-bold leading-snug ${
          accent ? 'text-cyan-300' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[8px] text-slate-500 leading-none">{sub}</span>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-px self-stretch bg-slate-800/70 my-2" />;
}
