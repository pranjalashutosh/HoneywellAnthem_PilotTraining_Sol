// Heading compass — smaller circular compass rose positioned in lower half of PFD.
// Clean design: no blue arrows, black labels, cyan N, airplane silhouette, purple course line.

import { useMemo } from 'react';
import { PFD } from './pfd-constants';

interface HeadingCompassProps {
  heading: number;
  onAdjustHeading: (dir: 'left' | 'right') => void;
}

const SIZE = PFD.COMPASS_SIZE; // 320
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = PFD.COMPASS_OUTER_RING_RADIUS; // 148
const INNER_R = PFD.COMPASS_INNER_RING_RADIUS; // 90
const TICK_R = OUTER_R - 2;
const LABEL_R = OUTER_R - 32;
const CARDINAL_R = OUTER_R - 58;

const CARDINALS: { deg: number; label: string; isCyan: boolean }[] = [
  { deg: 0, label: 'N', isCyan: true },
  { deg: 90, label: 'E', isCyan: false },
  { deg: 180, label: 'S', isCyan: false },
  { deg: 270, label: 'W', isCyan: false },
];

const DEGREE_LABELS: { deg: number; label: string }[] = [
  { deg: 30, label: '3' },
  { deg: 60, label: '6' },
  { deg: 120, label: '12' },
  { deg: 150, label: '15' },
  { deg: 210, label: '21' },
  { deg: 240, label: '24' },
  { deg: 300, label: '30' },
  { deg: 330, label: '33' },
];

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = degToRad(deg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function HeadingCompass({ heading }: HeadingCompassProps) {
  // Generate tick marks
  const ticks = useMemo(() => {
    const items: { x1: number; y1: number; x2: number; y2: number; weight: number }[] = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const is30 = deg % 30 === 0;
      const is10 = deg % 10 === 0;
      const tickLen = is30 ? 16 : is10 ? 10 : 6;
      const outer = polarToXY(CX, CY, TICK_R, deg);
      const inner = polarToXY(CX, CY, TICK_R - tickLen, deg);
      const weight = is30 ? 2 : 1;
      items.push({ x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, weight });
    }
    return items;
  }, []);

  // Cardinal label positions
  const cardinalPositions = useMemo(
    () => CARDINALS.map((c) => ({ ...c, ...polarToXY(CX, CY, CARDINAL_R, c.deg) })),
    [],
  );

  // Degree label positions
  const degreePositions = useMemo(
    () => DEGREE_LABELS.map((d) => ({ ...d, ...polarToXY(CX, CY, LABEL_R, d.deg) })),
    [],
  );

  return (
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        {/* Outer background circle */}
        <ellipse cx={CX} cy={CY} rx={OUTER_R} ry={OUTER_R} fill="rgba(0,0,0,0.38)" />
        <ellipse cx={CX} cy={CY} rx={OUTER_R} ry={OUTER_R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />

        {/* Inner circle */}
        <ellipse cx={CX} cy={CY} rx={INNER_R} ry={INNER_R} fill="rgba(0,0,0,0.22)" />

        {/* Rotating compass group */}
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${-heading}deg)`,
            transition: 'transform 400ms ease-out',
          }}
        >
          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.weight === 2 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)'}
              strokeWidth={t.weight}
            />
          ))}

          {/* Degree labels */}
          {degreePositions.map((d) => (
            <text
              key={d.deg}
              x={d.x}
              y={d.y + 6}
              fill="rgba(255,255,255,0.5)"
              fontSize="16"
              fontFamily={PFD.FONT_GRADUATE}
              textAnchor="middle"
            >
              {d.label}
            </text>
          ))}

          {/* Cardinal labels */}
          {cardinalPositions.map((c) => (
            <text
              key={c.label}
              x={c.x}
              y={c.y + 8}
              fill={c.isCyan ? PFD.COMPASS_CYAN : 'rgba(255,255,255,0.72)'}
              fontSize="24"
              fontFamily={PFD.FONT_GRAVITAS}
              textAnchor="middle"
              fontWeight="600"
            >
              {c.label}
            </text>
          ))}

          {/* Purple course line — vertical through center, rotating with compass */}
          <line
            x1={CX}
            y1={CY - INNER_R + 10}
            x2={CX}
            y2={CY + INNER_R - 10}
            stroke={PFD.MAGENTA}
            strokeWidth="2"
            opacity="0.8"
          />
          {/* Course line arrowhead at top */}
          <polygon
            points={`${CX},${CY - INNER_R + 5} ${CX - 6},${CY - INNER_R + 18} ${CX + 6},${CY - INNER_R + 18}`}
            fill="none"
            stroke={PFD.MAGENTA}
            strokeWidth="1.5"
          />
        </g>

        {/* Fixed: Aircraft silhouette at center — scaled down */}
        <g transform={`translate(${CX - 24}, ${CY - 20})`} opacity="0.9">
          <path
            d="M31.2 38.8776L6.5325 47.1967C4.9725 47.7458 3.4944 47.6228 2.0982 46.8277C0.702 46.0326 0.0026 44.92 0 43.4901V41.6781C0 41.0191 0.1794 40.3876 0.5382 39.7836C0.897 39.1796 1.4001 38.6854 2.0475 38.301L31.2 21.0861V6.58942C31.2 4.77733 31.9644 3.22662 33.4932 1.93729C35.022 0.647965 36.8576 0.00220206 39 5.58425e-06C41.1424 -0.00219089 42.9793 0.643572 44.5107 1.93729C46.0421 3.23102 46.8052 4.78172 46.8 6.58942V21.0861L75.9525 38.301C76.6025 38.6854 77.1069 39.1796 77.4657 39.7836C77.8245 40.3876 78.0026 41.0191 78 41.6781V43.4901C78 44.9179 77.3019 46.0304 75.9057 46.8277C74.5095 47.625 73.0301 47.748 71.4675 47.1967L46.8 38.8776V50.7385L56.8425 56.669C57.3625 56.9985 57.7694 57.3971 58.0632 57.865C58.357 58.3328 58.5026 58.8402 58.5 59.3871V61.3639C58.5 62.4622 57.9631 63.355 56.8893 64.0425C55.8155 64.73 54.6299 64.9079 53.3325 64.5763L39 60.9521L24.6675 64.5763C23.3675 64.9057 22.1806 64.7278 21.1068 64.0425C20.033 63.3572 19.4974 62.4644 19.5 61.3639V59.3871C19.5 58.838 19.6469 58.3306 19.9407 57.865C20.2345 57.3993 20.6401 57.0006 21.1575 56.669L31.2 50.7385V38.8776Z"
            fill="black"
            transform="scale(0.62)"
          />
        </g>

        {/* Fixed top index mark — small white triangle at top of compass */}
        <polygon
          points={`${CX},${CY - OUTER_R - 2} ${CX - 5},${CY - OUTER_R + 8} ${CX + 5},${CY - OUTER_R + 8}`}
          fill="white"
        />
      </svg>
    </div>
  );
}
