// Roll scale — bank angle reference arc with geometrically computed tick marks
// at standard aviation angles: 0°, ±10°, ±20°, ±30°, ±45°, ±60°.
// Arc curves above a fixed white triangle index marker.

import { PFD } from './pfd-constants';



const ARC_W = PFD.TOP_ARC_WIDTH;   // 525
const ARC_H = PFD.TOP_ARC_HEIGHT;  // 218

// Arc geometry — center below viewbox, radius sized so ±60° fits within width
// and all tick inner ends sit just above the triangle.
const CX = ARC_W / 2;    // 262.5
const ARC_R = 260;        // Arc radius
const CY = ARC_R;         // Center at y=260 (below viewbox bottom at 218)

// Standard bank angle tick marks: [angle°, tick length px]
const ROLL_TICKS: [number, number][] = [
  [0, 65],       // center reference (longest)
  [10, 35],
  [-10, 35],
  [20, 35],
  [-20, 35],
  [30, 50],      // 30° standard-rate-turn reference
  [-30, 50],
  [45, 40],      // 45° bank
  [-45, 40],
  [60, 50],      // 60° steep bank
  [-60, 50],
];

// Compute SVG line endpoints for a radial tick at given angle and length
function tickCoords(angleDeg: number, length: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);
  return {
    x1: CX + ARC_R * sinA,
    y1: CY - ARC_R * cosA,
    x2: CX + (ARC_R - length) * sinA,
    y2: CY - (ARC_R - length) * cosA,
  };
}

export function TopHeadingArc() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20"
      style={{
        width: ARC_W,
        height: ARC_H,
        top: 30,
      }}
    >
      <svg
        viewBox={`0 0 ${ARC_W} ${ARC_H}`}
        width={ARC_W}
        height={ARC_H}
        className="absolute inset-0"
      >
        {/* Fixed roll scale — bank angle reference marks */}
        {ROLL_TICKS.map(([angle, length], i) => {
          const { x1, y1, x2, y2 } = tickCoords(angle, length);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="white"
              strokeWidth="3"
            />
          );
        })}

        {/* Fixed white triangle index marker — wings-level reference */}
        <polygon
          points={`${CX - 14},200 ${CX},162 ${CX + 14},200`}
          fill="white"
        />
      </svg>
    </div>
  );
}
