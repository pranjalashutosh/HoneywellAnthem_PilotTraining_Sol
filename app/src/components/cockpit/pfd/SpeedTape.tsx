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

          {/* Inset shadow filter for pointer — from Figma filter3_i_43_533 */}
          <filter id="spd-pointer-inset" x="-10%" y="-10%" width="130%" height="130%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dx="12" dy="12" />
            <feGaussianBlur stdDeviation="7.5" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
          </filter>
        </defs>

        {/* ── Tape body background — Figma rect (54,37 119×297) ── */}
        <rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} fill="black" fillOpacity="0.2" />

        {/* ── Top cap — Figma rounded-left path ── */}
        <path
          opacity="0.4"
          d={`M173 37H54V20C54 8.954 62.954 0 74 0H173V37Z`}
          fill="black"
        />

        {/* ── Bottom cap — Figma rounded-left path ── */}
        <path
          opacity="0.4"
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

        {/* ── Speed pointer — exact Figma path (stepped shape, right-pointing arrow) ── */}
        <g filter="url(#spd-pointer-inset)">
          <path
            d="M173 179.932L152.452 185.387C150.699 185.852 149.478 187.439 149.478 189.253V205.394C149.478 207.604 147.687 209.394 145.478 209.394H84.4098C82.2006 209.394 80.4098 211.185 80.4098 213.394V219C80.4098 221.209 78.6189 223 76.4098 223H60C57.7909 223 56 221.209 56 219V143C56 140.791 57.7909 139 60 139H76.4098C78.6189 139 80.4098 140.791 80.4098 143V147.57C80.4098 149.78 82.2006 151.57 84.4097 151.57H145.478C147.687 151.57 149.478 153.361 149.478 155.57V170.151C149.478 171.934 150.658 173.502 152.372 173.995L173 179.932Z"
            fill="black"
            fillOpacity="0.2"
            stroke="white"
            strokeWidth="4"
          />
        </g>

        {/* ── Current speed text inside pointer ── */}
        <text
          x={108}
          y={188}
          fill={PFD.WHITE}
          fontSize="32"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          {displaySpeed}
        </text>
      </svg>
    </div>
  );
}
