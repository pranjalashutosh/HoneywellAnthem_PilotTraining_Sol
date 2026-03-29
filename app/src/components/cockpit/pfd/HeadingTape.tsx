// Integrated heading system: horizontal tape + mini circular compass.
// Tape provides precise readout; compass provides spatial orientation.

interface HeadingTapeProps {
  heading: number;
}

const TAPE_W = 380;
const TAPE_H = 26;
const PX_PER_DEG = 5;
const HALF_RANGE = TAPE_W / PX_PER_DEG / 2; // 38°

const FONT_MONO = "'JetBrains Mono', 'Consolas', monospace";
const FONT_UI   = "'Inter', system-ui, sans-serif";

function normalDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

// ── Mini Compass ───────────────────────────────────────────────────────────────

const CX = 50;
const CY = 50;
const R  = 44;

const CARDINALS = [
  { angle: 0,   label: 'N', isN: true },
  { angle: 90,  label: 'E', isN: false },
  { angle: 180, label: 'S', isN: false },
  { angle: 270, label: 'W', isN: false },
];

function MiniCompass({ heading }: { heading: number }) {
  const TICK_OUTER = R;
  const TICK_INNER = R - 12; // cardinal tick length: 12px
  const TICK_INTER = R - 8;  // intercardinal tick length: 8px
  const LABEL_R   = R - 22; // label position radius

  return (
    <svg width={90} height={90} viewBox="0 0 100 100" style={{ display: 'block' }}>
      {/* Background fill */}
      <circle cx={CX} cy={CY} r={R} fill="rgba(0,0,0,0.55)" />
      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />

      {/* Rotating card — cardinal ticks + labels + intercardinal ticks */}
      <g transform={`rotate(${-heading}, ${CX}, ${CY})`}>
        {/* 4 intercardinal ticks only (no minor/10° ticks) */}
        {[45, 135, 225, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = CX + TICK_OUTER * Math.sin(rad);
          const y1 = CY - TICK_OUTER * Math.cos(rad);
          const x2 = CX + TICK_INTER * Math.sin(rad);
          const y2 = CY - TICK_INTER * Math.cos(rad);
          return (
            <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          );
        })}

        {/* 4 cardinal ticks + labels */}
        {CARDINALS.map(({ angle, label, isN }) => {
          const rad = (angle * Math.PI) / 180;
          const sinA = Math.sin(rad);
          const cosA = Math.cos(rad);
          const x1 = CX + TICK_OUTER * sinA;
          const y1 = CY - TICK_OUTER * cosA;
          const x2 = CX + TICK_INNER * sinA;
          const y2 = CY - TICK_INNER * cosA;
          const lx = CX + LABEL_R * sinA;
          const ly = CY - LABEL_R * cosA;
          return (
            <g key={angle}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isN ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.6)'}
                strokeWidth={isN ? 2.5 : 2} />
              <text x={lx} y={ly}
                textAnchor="middle" dominantBaseline="central"
                fontFamily={FONT_UI}
                fontSize={isN ? 13 : 11}
                fontWeight={isN ? 700 : 600}
                fill={isN ? '#22d3ee' : 'rgba(255,255,255,0.65)'}>
                {label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Aircraft symbol (fixed) */}
      <g stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} fill="none" strokeLinecap="round">
        <line x1={CX} y1={CY - 14} x2={CX} y2={CY + 12} />
        <line x1={CX - 14} y1={CY - 1} x2={CX + 14} y2={CY - 1} />
        <line x1={CX - 6} y1={CY + 12} x2={CX + 6} y2={CY + 12} />
      </g>

      {/* Lubber line — fixed cyan triangle at 12 o'clock */}
      <polygon
        points={`${CX},${CY - R + 2} ${CX - 4},${CY - R + 10} ${CX + 4},${CY - R + 10}`}
        fill="#22d3ee"
      />
    </svg>
  );
}

// ── Heading Tape ───────────────────────────────────────────────────────────────

export function HeadingTape({ heading }: HeadingTapeProps) {
  const hdg = heading;

  const minDeg = Math.floor(hdg - HALF_RANGE - 1);
  const maxDeg = Math.ceil(hdg + HALF_RANGE + 1);

  const ticks: {
    x: number;
    normalD: number;
    angDist: number;
    isMajor10: boolean;
    isMajor5: boolean;
    label: string | null;
    isCardinal: boolean;
  }[] = [];

  for (let d = minDeg; d <= maxDeg; d++) {
    const nd = normalDeg(d);
    const angDist = Math.abs(d - hdg);
    const isMajor5  = nd % 5 === 0;
    const isMajor10 = nd % 10 === 0;

    if (!isMajor5) continue;

    const x = TAPE_W / 2 + (d - hdg) * PX_PER_DEG;
    if (x < -20 || x > TAPE_W + 20) continue;

    const isCardinal = nd === 0 || nd === 90 || nd === 180 || nd === 270;

    let label: string | null = null;
    if (isCardinal) {
      label = nd === 0 ? 'N' : nd === 90 ? 'E' : nd === 180 ? 'S' : 'W';
    } else if (isMajor10) {
      label = String(nd / 10).padStart(2, '0');
    }

    ticks.push({ x, normalD: nd, angDist, isMajor10, isMajor5, label, isCardinal });
  }

  const displayHdg = String(Math.round(normalDeg(heading))).padStart(3, '0');

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
      style={{ bottom: 16 }}
    >
      {/* Callout box */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            padding: '2px 14px',
            background: 'rgba(6,16,26,0.9)',
            border: '1.5px solid rgba(13,115,119,0.5)',
            borderBottom: 'none',
            borderRadius: '3px 3px 0 0',
            fontFamily: FONT_MONO,
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.05em',
            lineHeight: '1.4',
            minWidth: 64,
            textAlign: 'center',
          }}
        >
          {displayHdg}
        </div>
        {/* Teal pointer triangle */}
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid #0d7377',
            zIndex: 1,
          }}
        />
      </div>

      {/* Tape strip */}
      <svg
        width={TAPE_W}
        height={TAPE_H}
        viewBox={`0 0 ${TAPE_W} ${TAPE_H}`}
        style={{ display: 'block' }}
      >
        {/* Background */}
        <rect x={0} y={0} width={TAPE_W} height={TAPE_H} fill="rgba(0,0,0,0.4)" />

        {/* Baseline */}
        <line x1={0} y1={0} x2={TAPE_W} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {/* Ticks and labels */}
        {ticks.map(({ x, normalD, angDist, isMajor10, label, isCardinal }) => {
          if (isCardinal) {
            const isNorthCardinal = normalD === 0;
            return (
              <g key={normalD}>
                <line
                  x1={x} y1={0} x2={x} y2={isNorthCardinal ? 16 : 12}
                  stroke={isNorthCardinal ? '#22d3ee' : 'rgba(255,255,255,0.4)'}
                  strokeWidth={isNorthCardinal ? 2 : 1.5}
                />
                {label && (
                  <text
                    x={x} y={TAPE_H - 2}
                    textAnchor="middle"
                    fontFamily={FONT_UI}
                    fontSize={isNorthCardinal ? 14 : 13}
                    fontWeight={isNorthCardinal ? 700 : 600}
                    fill={isNorthCardinal ? '#22d3ee' : 'rgba(255,255,255,0.55)'}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          }

          // Distance-based opacity for non-cardinal ticks
          const tickH    = angDist <= 10 ? 10 : angDist <= 20 ? 9 : 7;
          const tickStroke = angDist <= 10
            ? 'rgba(255,255,255,0.4)'
            : angDist <= 20
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(255,255,255,0.2)';
          const tickW = isMajor10 ? 1.5 : 0.75;

          const labelFill = angDist <= 10
            ? 'rgba(255,255,255,0.65)'
            : angDist <= 25
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(255,255,255,0.4)';

          return (
            <g key={normalD}>
              <line
                x1={x} y1={0} x2={x} y2={tickH}
                stroke={tickStroke}
                strokeWidth={tickW}
              />
              {label && isMajor10 && (
                <text
                  x={x} y={TAPE_H - 2}
                  textAnchor="middle"
                  fontFamily={FONT_MONO}
                  fontSize={13}
                  fontWeight={500}
                  fill={labelFill}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Mini compass */}
      <div style={{ marginTop: 6 }}>
        <MiniCompass heading={heading} />
      </div>
    </div>
  );
}
