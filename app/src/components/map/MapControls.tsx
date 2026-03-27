// MapControls — floating avionics-styled control bar for zoom, recenter,
// and layer toggles. Designed to overlay the map canvas without intrusion.

import { useMap } from '@vis.gl/react-google-maps';
import type { MapLayerVisibility } from '@/types/map';

interface MapControlsProps {
  layers: MapLayerVisibility;
  onToggleLayer: (layer: keyof MapLayerVisibility) => void;
  onRecenter: () => void;
  /** Whether any scenario overlay is active */
  hasActiveScenario: boolean;
}

export function MapControls({
  layers,
  onToggleLayer,
  onRecenter,
  hasActiveScenario,
}: MapControlsProps) {
  const map = useMap();

  function zoomIn() {
    if (!map) return;
    map.setZoom((map.getZoom() ?? 6) + 1);
  }

  function zoomOut() {
    if (!map) return;
    map.setZoom(Math.max(4, (map.getZoom() ?? 6) - 1));
  }

  return (
    <>
      {/* Zoom controls — top right */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <CtrlButton onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
          +
        </CtrlButton>
        <CtrlButton onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
          −
        </CtrlButton>
      </div>

      {/* Recenter + layer toggles — bottom right */}
      <div className="absolute bottom-12 right-3 z-20 flex flex-col gap-1 items-end">
        {/* Recenter */}
        <CtrlButton onClick={onRecenter} title="Recenter on aircraft" aria-label="Recenter">
          ◎
        </CtrlButton>

        {/* Divider */}
        <div className="w-full h-px bg-slate-700/60 my-0.5" />

        {/* Layer toggles */}
        <LayerToggle
          label="RTE"
          active={layers.route}
          onClick={() => onToggleLayer('route')}
          title="Toggle route"
        />
        <LayerToggle
          label="APT"
          active={layers.airports}
          onClick={() => onToggleLayer('airports')}
          title="Toggle airports"
        />
        <LayerToggle
          label="WPT"
          active={layers.waypoints}
          onClick={() => onToggleLayer('waypoints')}
          title="Toggle waypoints"
        />
        <LayerToggle
          label="TRK"
          active={layers.breadcrumbs}
          onClick={() => onToggleLayer('breadcrumbs')}
          title="Toggle breadcrumb trail"
        />
        <LayerToggle
          label="WX"
          active={layers.weather}
          onClick={() => onToggleLayer('weather')}
          title="Toggle weather/scenario overlays"
          pulse={hasActiveScenario && layers.weather}
        />
      </div>
    </>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function CtrlButton({
  children,
  onClick,
  title,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="
        w-8 h-8 flex items-center justify-center
        font-mono text-sm font-bold
        text-cyan-300 hover:text-cyan-100
        rounded
        transition-colors
        select-none
      "
      style={{
        background: 'rgba(10,14,23,0.88)',
        border: '1px solid rgba(0,212,255,0.25)',
        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
      }}
    >
      {children}
    </button>
  );
}

function LayerToggle({
  label,
  active,
  onClick,
  title,
  pulse,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        h-6 px-2 flex items-center justify-center
        font-mono text-[9px] font-bold tracking-widest
        rounded transition-all select-none
        ${pulse ? 'animate-pulse' : ''}
      `}
      style={{
        background: active ? 'rgba(0,212,255,0.15)' : 'rgba(10,14,23,0.88)',
        border: `1px solid ${active ? 'rgba(0,212,255,0.55)' : 'rgba(30,41,59,0.8)'}`,
        color: active ? '#00d4ff' : '#475569',
        boxShadow: active ? '0 0 6px rgba(0,212,255,0.2)' : 'none',
      }}
    >
      {label}
    </button>
  );
}
