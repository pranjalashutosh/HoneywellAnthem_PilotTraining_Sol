// Primary Flight Display — synthetic vision, altitude/speed/heading tapes, mode annunciations.
// Rendering math adapted from prototype's PrimaryFlightDisplay.tsx; state from cockpit-store.

import { useMemo } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import type { CockpitMode } from '@/types';

interface InteractivePFDProps {
  onModeChange?: (mode: CockpitMode) => void;
}

const MODE_DISPLAY: Record<string, string> = {
  VNAV: 'VNAV PATH',
  FLCH: 'FLCH',
  VS: 'V/S',
  ALT: 'ALT HOLD',
  NAV: 'NAV',
  HDG: 'HDG',
  APR: 'APR',
};

export function InteractivePFD({ onModeChange }: InteractivePFDProps) {
  const currentAltitude = useCockpitStore((s) => s.altitude);
  const desiredAltitude = useCockpitStore((s) => s.desiredAltitude);
  const speed = useCockpitStore((s) => s.speed);
  const heading = useCockpitStore((s) => s.heading);
  const selectedMode = useCockpitStore((s) => s.selectedMode);
  const vnavConstraint = useCockpitStore((s) => s.vnavConstraint);
  const setMode = useCockpitStore((s) => s.setMode);
  const adjustDesiredAltitude = useCockpitStore((s) => s.adjustDesiredAltitude);
  const adjustHeading = (dir: 'left' | 'right') => {
    const change = dir === 'left' ? -10 : 10;
    useCockpitStore.getState().setHeading((heading + change + 360) % 360);
  };

  const altitudeDelta = currentAltitude - desiredAltitude;
  const normalizedDelta = Math.max(-1, Math.min(1, altitudeDelta / 4000));
  const pitchOffset = normalizedDelta * 40;
  const rollAngle = ((heading % 36) - 18) * 0.6;

  const isDescending = currentAltitude > desiredAltitude;
  const isClimbing = currentAltitude < desiredAltitude;
  const status = isDescending ? 'DESCENDING' : isClimbing ? 'CLIMBING' : 'LEVEL';
  const modeDisplay = MODE_DISPLAY[selectedMode] ?? selectedMode;
  const isNearTarget = Math.abs(currentAltitude - desiredAltitude) < 1200;

  // Sky gradient shifts with altitude
  const skyTop = useMemo(() => {
    if (currentAltitude > 18000) return '#153a66';
    if (currentAltitude > 12000) return '#23507f';
    return '#3b6b94';
  }, [currentAltitude]);

  const skyBottom = useMemo(() => {
    if (currentAltitude > 18000) return '#5f88b8';
    if (currentAltitude > 12000) return '#7ea3c9';
    return '#9bb7d1';
  }, [currentAltitude]);

  const terrainColor = useMemo(() => {
    if (currentAltitude > 15000) return '#53493a';
    if (currentAltitude > 10000) return '#5f553d';
    return '#6b6245';
  }, [currentAltitude]);

  const terrainScale = useMemo(() => {
    if (currentAltitude > 16000) return 0.82;
    if (currentAltitude > 12000) return 0.92;
    if (currentAltitude > 8000) return 1.02;
    return 1.15;
  }, [currentAltitude]);

  const terrainOpacity = useMemo(() => {
    if (currentAltitude > 16000) return 0.45;
    if (currentAltitude > 12000) return 0.58;
    if (currentAltitude > 8000) return 0.72;
    return 0.84;
  }, [currentAltitude]);

  // Heading ticks
  const headingTicks = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => (heading - 40 + i * 10 + 360) % 360),
    [heading],
  );

  // Altitude tape entries
  const altTapeEntries = useMemo(() => {
    const center = Math.round(currentAltitude / 500) * 500;
    const entries: number[] = [];
    for (let i = 7; i >= -7; i--) {
      entries.push(center + i * 500);
    }
    return entries;
  }, [currentAltitude]);

  const handleVSClick = () => {
    setMode('VS');
    onModeChange?.('VS');
  };

  return (
    <div className="flex-[3] bg-[#08131f] relative overflow-hidden border-r border-slate-700/50">
      {/* Synthetic vision scene */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-[-15%]"
          style={{
            transform: `translateY(${pitchOffset}px) rotate(${rollAngle}deg) scale(1.08)`,
            transformOrigin: 'center center',
            transition: 'transform 400ms ease-out',
          }}
        >
          {/* Sky + terrain gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${skyTop} 0%, ${skyBottom} 52%, ${terrainColor} 52%, #453e31 100%)`,
            }}
          />

          {/* Horizon haze */}
          <div className="absolute left-0 right-0 top-[49%] h-[8%] bg-white/10 blur-xl" />

          {/* Distance fog */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-black/10" />

          {/* Terrain layers (SVG) */}
          <svg
            viewBox="0 0 1000 700"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            style={{
              opacity: terrainOpacity,
              transform: `scale(${terrainScale})`,
              transition: 'transform 500ms ease-out, opacity 500ms ease-out',
            }}
          >
            <path
              d="M0,470 L90,430 L180,450 L270,380 L350,410 L440,330 L520,360 L650,300 L760,350 L860,310 L1000,360 L1000,700 L0,700 Z"
              fill="#76674a"
            />
            <path
              d="M0,520 L120,470 L250,500 L360,430 L480,470 L610,390 L760,450 L880,400 L1000,430 L1000,700 L0,700 Z"
              fill="#655940"
            />
            <path
              d="M0,580 L140,550 L260,570 L380,525 L500,560 L630,505 L760,555 L900,520 L1000,550 L1000,700 L0,700 Z"
              fill="#544936"
            />
          </svg>

          {/* Descent path cue */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 600 600" className="w-[65%] h-[65%] opacity-80">
              <polygon
                points="300,300 250,420 350,420"
                fill="none"
                stroke="rgba(0,255,255,0.45)"
                strokeWidth="2"
              />
              <polygon
                points="300,250 215,480 385,480"
                fill="none"
                stroke="rgba(0,255,255,0.25)"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Runway guidance when near target */}
          {isNearTarget && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 600 600" className="w-[52%] h-[52%] opacity-75">
                <polygon
                  points="300,420 255,560 345,560"
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth="2"
                />
                <line
                  x1="300" y1="430" x2="300" y2="550"
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Vignette / glass feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.22)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 via-transparent to-black/20 pointer-events-none" />

      {/* Mode annunciations (top center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        <div className="bg-green-500/90 text-black px-3 py-1 rounded text-xs font-bold shadow-lg">
          {modeDisplay}
        </div>
        <div className="bg-slate-900/85 text-cyan-300 px-3 py-1 rounded text-xs border border-cyan-600/40 shadow-lg">
          {status}
        </div>
      </div>

      {/* VNAV constraint warning */}
      {selectedMode === 'VNAV' && vnavConstraint > 0 && desiredAltitude < vnavConstraint && (
        <div className="absolute top-4 left-4 z-20">
          <div className="px-2 py-1 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold animate-pulse">
            VNAV CONSTRAINT {vnavConstraint.toLocaleString()} FT
          </div>
        </div>
      )}

      {/* Speed tape (left side) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 z-20">
        <div className="bg-slate-950/85 border border-cyan-600/40 rounded p-2 shadow-xl backdrop-blur-sm">
          {[speed + 20, speed + 10, speed, speed - 10, speed - 20].map((spd) => (
            <div
              key={spd}
              className={`text-center py-1 font-mono ${
                spd === speed
                  ? 'text-green-400 font-bold'
                  : 'text-cyan-300 text-sm'
              }`}
            >
              {spd === speed ? (
                <div className="bg-green-500/20 border border-green-400 rounded px-2">
                  {speed}
                </div>
              ) : (
                spd
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Altitude tape (right side) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 z-20">
        <div className="bg-slate-950/85 border border-cyan-600/40 rounded p-2 space-y-1 shadow-xl backdrop-blur-sm">
          <button
            onClick={() => adjustDesiredAltitude('up')}
            className="w-full py-1 bg-slate-700/50 hover:bg-slate-600/60 rounded text-cyan-400 flex justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {altTapeEntries.map((alt) => {
            const isCurrent = Math.abs(alt - currentAltitude) < 250;
            const isDesired = alt === desiredAltitude;
            const isConstraint = alt === vnavConstraint && vnavConstraint > 0;

            return (
              <div
                key={alt}
                className={`text-center py-0.5 text-xs font-mono transition-colors ${
                  isCurrent
                    ? 'text-green-400 font-bold text-base'
                    : isDesired
                      ? 'text-fuchsia-400 font-bold'
                      : isConstraint
                        ? 'text-amber-400 font-bold'
                        : 'text-cyan-300'
                }`}
              >
                {isCurrent ? (
                  <div className="bg-green-500/20 border border-green-400 rounded px-1">
                    {currentAltitude.toLocaleString()}
                  </div>
                ) : isDesired ? (
                  <div className="bg-fuchsia-500/20 border border-fuchsia-400 rounded px-1">
                    {alt.toLocaleString()}
                  </div>
                ) : isConstraint ? (
                  <div className="bg-amber-500/20 border border-amber-400 rounded px-1">
                    {alt.toLocaleString()}
                  </div>
                ) : (
                  alt.toLocaleString()
                )}
              </div>
            );
          })}

          <button
            onClick={() => adjustDesiredAltitude('down')}
            className="w-full py-1 bg-slate-700/50 hover:bg-slate-600/60 rounded text-cyan-400 flex justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Aircraft symbol (center) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="flex items-center gap-8">
          <div className="w-16 h-1 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.85)]" />
          <div className="w-6 h-6 border-2 border-yellow-400 rounded-full bg-yellow-400/15" />
          <div className="w-16 h-1 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.85)]" />
        </div>
      </div>

      {/* Flight path marker */}
      <div
        className="absolute left-1/2 z-20 transition-all duration-300"
        style={{
          top: isDescending ? '56%' : '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div className="w-8 h-8 rounded-full border border-green-400/80 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border border-green-400/80" />
        </div>
      </div>

      {/* Heading tape (bottom center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-slate-950/85 border border-cyan-600/40 rounded px-4 py-2 shadow-xl backdrop-blur-sm min-w-[320px]">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => adjustHeading('left')}
              className="text-cyan-400 hover:text-cyan-300 p-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="flex-1">
              <div className="text-center text-xs text-cyan-400 mb-1 font-mono">
                HDG
              </div>
              <div className="relative h-10 overflow-hidden">
                <div className="absolute inset-x-0 top-0 flex justify-center">
                  <div className="w-0.5 h-10 bg-yellow-400" />
                </div>
                <div className="flex justify-center gap-5 mt-2">
                  {headingTicks.map((tick, i) => (
                    <div
                      key={`${tick}-${i}`}
                      className="flex flex-col items-center min-w-[24px]"
                    >
                      <div
                        className={`w-px h-2 ${
                          i === 4 ? 'bg-yellow-400' : 'bg-cyan-400/70'
                        }`}
                      />
                      <div
                        className={`text-[10px] mt-1 font-mono ${
                          i === 4
                            ? 'text-green-400 font-bold'
                            : 'text-cyan-300'
                        }`}
                      >
                        {tick.toString().padStart(3, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => adjustHeading('right')}
              className="text-cyan-400 hover:text-cyan-300 p-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* V/S mode button (bottom left) */}
      <div className="absolute bottom-4 left-4 z-20">
        <button
          onClick={handleVSClick}
          className={`px-4 py-2 text-sm font-bold rounded border transition-all shadow-lg ${
            selectedMode === 'VS'
              ? 'bg-green-500/90 text-black border-green-400'
              : 'bg-slate-950/85 text-cyan-300 border-cyan-600/40 hover:border-cyan-500'
          }`}
        >
          V/S
        </button>
      </div>

      {/* Descent cue badge */}
      {isDescending && (
        <div className="absolute top-20 right-32 z-20">
          <div className="px-2 py-1 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            DESCENT PATH ACTIVE
          </div>
        </div>
      )}
    </div>
  );
}
