// T3.3 — Inline waypoint editor, opens TouchNumpad for altitude

import type { Waypoint } from '@/types';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useUIStore } from '@/stores/ui-store';

interface WaypointEditorProps {
  waypoint: Waypoint;
  index: number;
  onClose: () => void;
}

export function WaypointEditor({ waypoint, index, onClose }: WaypointEditorProps) {
  const updateWaypoint = useCockpitStore((s) => s.updateWaypoint);
  const openNumpad = useUIStore((s) => s.openNumpad);

  const handleAltitudeClick = () => {
    openNumpad(`waypoint-altitude-${index}`);
  };

  const handleToggleActive = () => {
    updateWaypoint(index, { isActive: !waypoint.isActive });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded bg-anthem-bg-tertiary border border-anthem-cyan min-h-[44px]">
      <span className="font-mono text-sm text-anthem-cyan w-20">{waypoint.id}</span>
      <span className="font-mono text-sm flex-1">{waypoint.name}</span>

      <button
        onClick={handleAltitudeClick}
        className="min-h-[36px] px-3 py-1 rounded border border-anthem-border bg-anthem-bg-input font-mono text-sm text-anthem-text-primary hover:border-anthem-cyan transition-colors"
      >
        {waypoint.altitude === 0 ? '---' : waypoint.altitude.toLocaleString()}
      </button>

      <button
        onClick={handleToggleActive}
        className={[
          'min-h-[36px] px-3 py-1 rounded border text-xs font-sans',
          waypoint.isActive
            ? 'border-anthem-cyan text-anthem-cyan bg-anthem-bg-secondary'
            : 'border-anthem-border text-anthem-text-muted hover:text-anthem-text-secondary',
        ].join(' ')}
      >
        {waypoint.isActive ? 'Active' : 'Set Active'}
      </button>

      <button
        onClick={onClose}
        className="min-h-[36px] px-3 py-1 rounded border border-anthem-border text-anthem-text-muted text-xs hover:text-anthem-text-secondary"
      >
        Done
      </button>
    </div>
  );
}
