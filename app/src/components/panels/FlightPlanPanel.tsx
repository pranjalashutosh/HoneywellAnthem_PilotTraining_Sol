// T3.1 — Scrollable waypoint list

import { useEffect } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { kjfkKbos } from '@/data/flight-plans/kjfk-kbos';
import { WaypointRow } from './WaypointRow';

export function FlightPlanPanel() {
  const flightPlan = useCockpitStore((s) => s.flightPlan);
  const loadFlightPlan = useCockpitStore((s) => s.loadFlightPlan);

  // Load default flight plan if empty
  useEffect(() => {
    if (flightPlan.length === 0) {
      loadFlightPlan(kjfkKbos);
    }
  }, [flightPlan.length, loadFlightPlan]);

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="grid grid-cols-[80px_1fr_100px_80px_80px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-anthem-text-muted font-sans">
        <span>Fix</span>
        <span>Name</span>
        <span className="text-right">Altitude</span>
        <span className="text-right">Lat</span>
        <span className="text-right">Lon</span>
      </div>

      {/* Waypoint rows */}
      <div className="flex flex-col gap-0.5 overflow-auto max-h-[calc(100vh-280px)]">
        {flightPlan.map((wp, index) => (
          <WaypointRow key={wp.id} waypoint={wp} index={index} />
        ))}
      </div>
    </div>
  );
}
