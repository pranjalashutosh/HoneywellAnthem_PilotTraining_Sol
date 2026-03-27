// Altitude tape — right-side vertical SVG instrument using exact Figma shapes:
//   37-47: tape body (152×603, rounded-right rect)
//   37-93: V/S area (61×383, rounded-right rect)
//   38-181: tick marks (21px, 3px stroke)
//   41-405: altitude pointer (152×122, stepped shape with inset shadow)
//   39-352: scale value highlight box (76×24, left-pointing arrow)

import { useMemo } from 'react';
import { PFD } from './pfd-constants';

interface AltitudeTapeProps {
  currentAltitude: number;
  desiredAltitude: number;
  vnavConstraint: number;
  onAdjustDesiredAltitude: (dir: 'up' | 'down') => void;
}

// Layout constants derived from Figma
const BODY_W = PFD.ALT_TAPE_BODY_W;   // 152
const BODY_H = PFD.ALT_TAPE_BODY_H;   // 603
const VS_W = PFD.ALT_VS_W;            // 61
const VS_H = PFD.ALT_VS_H;            // 383
const POINTER_H = PFD.ALT_POINTER_H;  // 122

// SVG viewBox: tape body + gap + V/S area
const VB_W = BODY_W + 2 + VS_W;       // 215
const VB_H = BODY_H;                   // 603

// Cap heights for target altitude (top) and baro (bottom)
const CAP_TOP = 45;
const CAP_BOT = 45;

// Scrollable area within the tape
const SCROLL_TOP = CAP_TOP;
const SCROLL_BOT = BODY_H - CAP_BOT;
const SCROLL_H = SCROLL_BOT - SCROLL_TOP;
const CENTER_Y = SCROLL_TOP + SCROLL_H / 2;

// V/S area offset (centered vertically in tape)
const VS_X = BODY_W + 2;
const VS_Y = (BODY_H - VS_H) / 2;

// Pixels per foot in scrollable area
const PX_PER_FOOT = SCROLL_H / PFD.ALT_VISIBLE_RANGE;

// Rendered size (scale to fit PFD)
const RENDER_W = 155;
const RENDER_H = Math.round(RENDER_W * VB_H / VB_W);

const BARO_PRESSURE = '29.96IN';
const VS_LABELS = [4, 2, 0, 2, 4];

export function AltitudeTape({
  currentAltitude,
  desiredAltitude,
  vnavConstraint,
  onAdjustDesiredAltitude,
}: AltitudeTapeProps) {
  // Generate altitude ticks
  const ticks = useMemo(() => {
    const items: { y: number; value: number; isMajor: boolean }[] = [];
    const rangeHalf = PFD.ALT_VISIBLE_RANGE / 2;
    const minAlt = Math.floor((currentAltitude - rangeHalf) / 100) * 100;
    const maxAlt = Math.ceil((currentAltitude + rangeHalf) / 100) * 100;

    for (let v = minAlt; v <= maxAlt; v += 100) {
      const dy = (currentAltitude - v) * PX_PER_FOOT;
      const y = CENTER_Y + dy;
      if (y < SCROLL_TOP - 30 || y > SCROLL_BOT + 30) continue;
      items.push({ y, value: v, isMajor: v % 500 === 0 });
    }
    return items;
  }, [currentAltitude]);

  // Nearest hundred above for highlight box
  const nearestHundredAbove = Math.ceil(currentAltitude / 100) * 100;

  // Desired altitude marker position
  const desiredY = useMemo(() => {
    const dy = (currentAltitude - desiredAltitude) * PX_PER_FOOT;
    return CENTER_Y + dy;
  }, [currentAltitude, desiredAltitude]);

  // VNAV constraint marker position
  const constraintY = useMemo(() => {
    if (vnavConstraint <= 0) return null;
    const dy = (currentAltitude - vnavConstraint) * PX_PER_FOOT;
    const y = CENTER_Y + dy;
    if (y < SCROLL_TOP || y > SCROLL_BOT) return null;
    return y;
  }, [currentAltitude, vnavConstraint]);

  const displayAlt = Math.round(currentAltitude);

  // Scale factor from viewBox to rendered pixels (for positioning HTML overlays)
  const scale = RENDER_W / VB_W;
  const capRenderH = Math.round(CAP_TOP * scale);

  return (
    <div
      className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
      style={{ width: RENDER_W }}
    >
      {/* Up / Down altitude adjust buttons — overlaid on the top cap */}
      <button
        onClick={() => onAdjustDesiredAltitude('up')}
        className="absolute z-30 flex items-center justify-center transition-colors hover:bg-white/10 active:bg-white/20 rounded"
        style={{
          right: 0,
          top: 0,
          width: Math.round(BODY_W * scale),
          height: capRenderH / 2,
        }}
        aria-label="Increase altitude"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={PFD.CYAN} strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        onClick={() => onAdjustDesiredAltitude('down')}
        className="absolute z-30 flex items-center justify-center transition-colors hover:bg-white/10 active:bg-white/20 rounded"
        style={{
          right: 0,
          top: capRenderH / 2,
          width: Math.round(BODY_W * scale),
          height: capRenderH / 2,
        }}
        aria-label="Decrease altitude"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={PFD.CYAN} strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width={RENDER_W}
        height={RENDER_H}
        className="drop-shadow-lg"
      >
        <defs>
          {/* Clip for scrollable tape area */}
          <clipPath id="alt-tape-clip">
            <rect x="0" y={SCROLL_TOP} width={BODY_W} height={SCROLL_H} />
          </clipPath>

          {/* Inset shadow filter for pointer — from Figma node 41-405 */}
          <filter id="alt-pointer-inset" x="-10%" y="-10%" width="130%" height="130%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
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

        {/* ── Tape body background — Figma node 37-47 (152×603) ── */}
        <g opacity="0.1">
          <path
            d={`M0 0H${BODY_W - 20}C${BODY_W - 8.954} 0 ${BODY_W} 8.954 ${BODY_W} 20V${BODY_H - 20}C${BODY_W} ${BODY_H - 8.954} ${BODY_W - 8.954} ${BODY_H} ${BODY_W - 20} ${BODY_H}H0V0Z`}
            fill="black"
          />
        </g>

        {/* ── V/S area background — Figma node 37-93 (61×383) ── */}
        <g opacity="0.1" transform={`translate(${VS_X}, ${VS_Y})`}>
          <path
            d={`M0 0H${VS_W - 20}C${VS_W - 8.954} 0 ${VS_W} 8.954 ${VS_W} 20V${VS_H - 20}C${VS_W} ${VS_H - 8.954} ${VS_W - 8.954} ${VS_H} ${VS_W - 20} ${VS_H}H0V0Z`}
            fill="black"
          />
        </g>

        {/* ── V/S scale labels + ticks ── */}
        {VS_LABELS.map((val, i) => {
          const y = VS_Y + 30 + i * ((VS_H - 60) / (VS_LABELS.length - 1));
          return (
            <g key={`vs-${i}`}>
              <line
                x1={VS_X}
                y1={y}
                x2={VS_X + 12}
                y2={y}
                stroke={PFD.WHITE}
                strokeWidth="2"
                opacity="0.5"
              />
              <text
                x={VS_X + 32}
                y={y + 7}
                fill={PFD.WHITE}
                fontSize="22"
                fontFamily={PFD.FONT_GRADUATE}
                textAnchor="middle"
                opacity="0.6"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* ── Tape scrollable area background (slightly darker) ── */}
        <rect x="0" y={SCROLL_TOP} width={BODY_W} height={SCROLL_H} fill="rgba(0,0,0,0.12)" />

        {/* ── Top cap — target/desired altitude ── */}
        <rect x="0" y="0" width={BODY_W} height={CAP_TOP} rx="0" fill={PFD.TAPE_CAP} />
        <text
          x={BODY_W / 2 - 6}
          y={30}
          fill={PFD.CYAN_LIGHT}
          fontSize="28"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          {desiredAltitude.toLocaleString()}
        </text>
        {/* Small colored icon (Figma green square) */}
        <rect x={BODY_W - 28} y={12} width="18" height="18" rx="3" fill="#4CAF50" opacity="0.7" />

        {/* ── Scrolling ticks and labels ── */}
        <g clipPath="url(#alt-tape-clip)">
          {ticks.map((tick) => (
            <g key={tick.value}>
              {/* Tick mark — Figma node 38-181 (21px, 3px stroke) */}
              <line
                x1={0}
                y1={tick.y}
                x2={tick.isMajor ? 30 : PFD.ALT_TICK_LEN}
                y2={tick.y}
                stroke="black"
                strokeWidth="3"
              />
              {tick.isMajor && (
                <>
                  {/* Highlight box for nearest hundred above — Figma node 39-352 (76×24) */}
                  {tick.value === nearestHundredAbove && (
                    <g transform={`translate(${BODY_W - PFD.ALT_HIGHLIGHT_W - 2}, ${tick.y - PFD.ALT_HIGHLIGHT_H / 2})`}>
                      <path
                        d={`M16.907 0.5L0.858 12L16.907 23.5H74.858V0.5H16.907Z`}
                        fill="black"
                        fillOpacity="0.4"
                        stroke="white"
                      />
                    </g>
                  )}
                  <text
                    x={BODY_W - 12}
                    y={tick.y + 8}
                    fill={PFD.WHITE}
                    fontSize="24"
                    fontFamily={PFD.FONT_GRADUATE}
                    textAnchor="end"
                  >
                    {tick.value.toLocaleString()}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Desired altitude dashed line */}
          {desiredY > SCROLL_TOP && desiredY < SCROLL_BOT && (
            <line
              x1={0}
              y1={desiredY}
              x2={BODY_W}
              y2={desiredY}
              stroke={PFD.CYAN}
              strokeWidth="2"
              strokeDasharray="8,4"
            />
          )}

          {/* VNAV constraint marker */}
          {constraintY !== null && (
            <line
              x1={0}
              y1={constraintY}
              x2={BODY_W}
              y2={constraintY}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </g>

        {/* ── Altitude pointer — exact Figma node 41-405 (152×122) ── */}
        <g
          transform={`translate(0, ${CENTER_Y - POINTER_H / 2})`}
          filter="url(#alt-pointer-inset)"
        >
          <path
            d="M6.60095 62.5L32.517 54.5931C34.1999 54.0797 35.3497 52.5268 35.3497 50.7672V25.1127C35.3497 22.9035 37.1406 21.1127 39.3497 21.1127H115.767C117.976 21.1127 119.767 19.3218 119.767 17.1127V6C119.767 3.79086 121.558 2 123.767 2H145.601C147.81 2 149.601 3.79086 149.601 6V116C149.601 118.209 147.81 120 145.601 120H123.767C121.558 120 119.767 118.209 119.767 116V106.342C119.767 104.132 117.976 102.342 115.767 102.342H39.3497C37.1406 102.342 35.3497 100.551 35.3497 98.3415V74.9005C35.3497 73.1754 34.2438 71.6447 32.606 71.1029L6.60095 62.5Z"
            fill="black"
            fillOpacity="0.2"
            stroke="white"
            strokeWidth="4"
          />
        </g>

        {/* Current altitude text inside pointer */}
        <text
          x={42}
          y={CENTER_Y + 10}
          fill={PFD.WHITE}
          fontSize="32"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="start"
        >
          {displayAlt.toLocaleString()}
        </text>

        {/* ── Bottom cap — baro pressure ── */}
        <rect x="0" y={BODY_H - CAP_BOT} width={BODY_W} height={CAP_BOT} fill={PFD.TAPE_CAP} />
        <text
          x={BODY_W / 2}
          y={BODY_H - CAP_BOT + 18}
          fill={PFD.CYAN_LIGHT}
          fontSize="14"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          FEET
        </text>
        <text
          x={BODY_W / 2}
          y={BODY_H - 8}
          fill={PFD.CYAN_LIGHT}
          fontSize="22"
          fontFamily={PFD.FONT_GRADUATE}
          textAnchor="middle"
        >
          {BARO_PRESSURE}
        </text>
      </svg>
    </div>
  );
}
