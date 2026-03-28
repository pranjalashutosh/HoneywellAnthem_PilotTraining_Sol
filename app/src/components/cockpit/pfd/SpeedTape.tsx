// Speed tape — left-side vertical SVG instrument using exact Figma node 43-533 shapes:
//   Tape body: rect 54,37 119×297 (black 0.2)
//   Top cap: rounded-left path y=0–37 (black 0.4) with target speed + cyan icon
//   Bottom cap: rounded-left path y=334–371 (black 0.4)
//   Pointer: stepped shape with right-pointing arrow tip at x=173 + inset shadow
//   V/S area: rounded-left rect x=1–53, y=49–314 with center arrow notch
//   Ticks: major 21px, minor 13px, at x=146–167 (right side of tape body)

import { useMemo } from 'react';
import { PFD } from './pfd-constants';

interface SpeedTapeProps {
  speed: number;
}

// Layout from Figma node 43-533
const VB_W = PFD.SPD_VB_W;       // 181
const VB_H = PFD.SPD_VB_H;       // 371
const BODY_X = PFD.SPD_BODY_X;   // 54
const BODY_W = PFD.SPD_BODY_W;   // 119
const BODY_Y = PFD.SPD_BODY_Y;   // 37
const BODY_H = PFD.SPD_BODY_H;   // 297
const SCROLL_TOP = BODY_Y;
const SCROLL_BOT = BODY_Y + BODY_H;  // 334
const SCROLL_H = BODY_H;             // 297
const CENTER_Y = SCROLL_TOP + SCROLL_H / 2; // ~185.5

// Ticks positioned at right edge of tape body (x=146–167 in Figma)
const TICK_X = BODY_X + BODY_W;  // 173 (right edge)

// Pixels per knot (Figma shows 70px per 10 knots)
const PX_PER_KNOT = 7.0;

// Rendered size
const RENDER_W = 130;
const RENDER_H = Math.round(RENDER_W * VB_H / VB_W);

// V/S labels from Figma (top to bottom)
const VS_LABELS: { value: number; y: number }[] = [
  { value: 5, y: 70 },
  { value: 4, y: 100 },
  { value: 3, y: 130 },
  { value: 2, y: 160 },
  { value: 1, y: 182 },
  { value: 0, y: 220 },
  { value: -1, y: 250 },
  { value: -2, y: 280 },
  { value: -3, y: 307 },
];

export function SpeedTape({ speed }: SpeedTapeProps) {
  const ticks = useMemo(() => {
    const items: { y: number; value: number; isMajor: boolean }[] = [];
    const rangeHalf = PFD.SPD_VISIBLE_RANGE / 2;
    const minSpd = Math.floor((speed - rangeHalf) / 5) * 5;
    const maxSpd = Math.ceil((speed + rangeHalf) / 5) * 5;

    for (let v = minSpd; v <= maxSpd; v += 5) {
      const dy = (speed - v) * PX_PER_KNOT;
      const y = CENTER_Y + dy;
      if (y < SCROLL_TOP - 30 || y > SCROLL_BOT + 30) continue;
      const isMajor = v % 10 === 0;
      items.push({ y, value: v, isMajor });
    }
    return items;
  }, [speed]);

  const displaySpeed = Math.round(speed);

  return (
    <div
      className="absolute left-2 top-1/2 -translate-y-1/2 z-20"
      style={{ width: RENDER_W }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width={RENDER_W}
        height={RENDER_H}
        className="drop-shadow-lg"
      >
        <defs>
          {/* Clip for scrollable tape area */}
          <clipPath id="spd-tape-clip">
            <rect x={BODY_X} y={SCROLL_TOP} width={BODY_W} height={SCROLL_H} />
          </clipPath>

        </defs>

        {/* ── Tape body background — Figma rect (54,37 119×297) ── */}
        <rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} fill="black" fillOpacity="0.45" />

        {/* ── Top cap — Figma rounded-left path ── */}
        <path
          opacity="0.65"
          d={`M173 37H54V20C54 8.954 62.954 0 74 0H173V37Z`}
          fill="black"
        />

        {/* ── Bottom cap — Figma rounded-left path ── */}
        <path
          opacity="0.65"
          d={`M173 334H54V351C54 362.046 62.954 371 74 371H173V334Z`}
          fill="black"
        />

        {/* ── V/S area background — Figma exact path with center arrow notch ── */}
        <path
          d="M53 49V314H25C16.5992 314 12.3988 314 9.19014 312.365C6.36771 310.927 4.073 308.632 2.6349 305.81C1 302.601 1 298.401 1 290V198.264L36.4043 182.467L1 167.637V73C1 64.5992 1 60.3988 2.6349 57.1902C4.073 54.3677 6.36771 52.073 9.19014 50.6349C12.3988 49 16.5992 49 25 49H53Z"
          fill="black"
          fillOpacity="0.2"
          stroke="white"
          strokeWidth="2"
        />

        {/* ── V/S labels — positioned from Figma ── */}
        {VS_LABELS.map((item, i) => (
          <text
            key={`vs-${i}`}
            x={27}
            y={item.y + 5}
            fill={PFD.WHITE}
            fontSize="17"
            fontFamily={PFD.FONT_GRADUATE}
            textAnchor="middle"
            opacity="0.7"
          >
            {item.value}
          </text>
        ))}

        {/* ── Target speed text in top cap ── */}
        <text
          x={108}
          y={27}
          fill={PFD.CYAN_LIGHT}
          fontSize="24"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          {displaySpeed}
        </text>

        {/* ── Speed icon — Figma exact path (cyan notched rect) ── */}
        <path
          d="M167 35H152V5H167V14.9525L157.566 19.8289L167 25.076V35Z"
          fill={PFD.CYAN}
          stroke={PFD.GOLD}
          strokeWidth="2"
        />

        {/* ── Scrolling ticks and labels ── */}
        <g clipPath="url(#spd-tape-clip)">
          {ticks.map((tick) => (
            <g key={tick.value}>
              {/* Ticks on the RIGHT edge of tape body (matching Figma x=146→167/159) */}
              <line
                x1={TICK_X - (tick.isMajor ? PFD.SPD_TICK_MAJOR : PFD.SPD_TICK_MINOR)}
                y1={tick.y}
                x2={TICK_X}
                y2={tick.y}
                stroke="white"
                strokeWidth="3"
              />
              {tick.isMajor && (
                <text
                  x={BODY_X + 52}
                  y={tick.y + 8}
                  fill={PFD.WHITE}
                  fontSize="24"
                  fontFamily={PFD.FONT_GRADUATE}
                  textAnchor="middle"
                >
                  {tick.value}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* ── Speed pointer — clean pentagon, right-pointing arrow ── */}
        <path
          d={`M56,${CENTER_Y - 26} H155 L173,${CENTER_Y} L155,${CENTER_Y + 26} H56 Z`}
          fill="rgba(0,0,0,0.93)"
          stroke="white"
          strokeWidth="2"
        />

        {/* ── Current speed text — centered inside pointer box ── */}
        <text
          x={106}
          y={CENTER_Y + 12}
          fill={PFD.WHITE}
          fontSize="34"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          {displaySpeed}
        </text>
      </svg>
    </div>
  );
}
