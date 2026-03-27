// Synthetic vision background — photorealistic terrain image with sky gradient,
// pitch/roll attitude transform, descent path cues.

import { useMemo } from 'react';
import terrainImage from '@/assets/pfd/terrain-mountain.png';

interface SyntheticVisionBackgroundProps {
  pitchOffset: number;
  rollAngle: number;
  currentAltitude: number;
  isNearTarget: boolean;
  isDescending: boolean;
}

export function SyntheticVisionBackground({
  pitchOffset,
  rollAngle,
  currentAltitude,
  isNearTarget,
  isDescending,
}: SyntheticVisionBackgroundProps) {
  // Terrain opacity decreases at higher altitudes for depth perception
  const terrainOpacity = useMemo(() => {
    if (currentAltitude > 16000) return 0.5;
    if (currentAltitude > 12000) return 0.65;
    if (currentAltitude > 8000) return 0.8;
    return 0.95;
  }, [currentAltitude]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-[-20%]"
        style={{
          transform: `translateY(${pitchOffset}px) rotate(${rollAngle}deg) scale(1.1)`,
          transformOrigin: 'center center',
          transition: 'transform 400ms ease-out',
        }}
      >
        {/* Sky gradient (top half) + ground gradient (bottom half) */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              top: 0,
              bottom: '50%',
              background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(138,197,242,1) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              top: '50%',
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(171,181,121,1) 100%)',
            }}
          />
        </div>

        {/* Terrain image */}
        <img
          src={terrainImage}
          alt=""
          className="absolute w-full pointer-events-none select-none"
          style={{
            top: '25%',
            left: '-10%',
            width: '120%',
            height: '75%',
            objectFit: 'cover',
            opacity: terrainOpacity,
            transition: 'opacity 500ms ease-out',
          }}
        />

        {/* Descent path cue */}
        {isDescending && (
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
        )}

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
  );
}
