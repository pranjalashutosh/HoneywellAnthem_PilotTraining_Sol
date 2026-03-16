// T3.2 — Single waypoint display, active highlighted in cyan

import { useState } from 'react';
import type { Waypoint } from '@/types';
import { WaypointEditor } from './WaypointEditor';

interface WaypointRowProps {
  waypoint: Waypoint;
  index: number;
}

export function WaypointRow({ waypoint, index }: WaypointRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <WaypointEditor waypoint={waypoint} index={index} onClose={() => setEditing(false)} />;
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={[
        'grid grid-cols-[80px_1fr_100px_80px_80px] gap-2 px-3 py-2 rounded text-sm font-mono text-left',
        'min-h-[44px] transition-colors',
        waypoint.isActive
          ? 'bg-anthem-bg-tertiary border border-anthem-cyan text-anthem-cyan shadow-[0_0_8px_var(--anthem-cyan-glow)]'
          : 'bg-anthem-bg-secondary border border-transparent text-anthem-text-primary hover:border-anthem-border',
      ].join(' ')}
    >
      <span className={waypoint.isActive ? 'text-anthem-cyan font-bold' : 'text-anthem-text-secondary'}>
        {waypoint.id}
      </span>
      <span>{waypoint.name}</span>
      <span className="text-right">
        {waypoint.altitude === 0 ? '---' : waypoint.altitude.toLocaleString()}
      </span>
      <span className="text-right text-anthem-text-secondary text-xs">
        {waypoint.lat.toFixed(2)}
      </span>
      <span className="text-right text-anthem-text-secondary text-xs">
        {waypoint.lon.toFixed(2)}
      </span>
    </button>
  );
}
