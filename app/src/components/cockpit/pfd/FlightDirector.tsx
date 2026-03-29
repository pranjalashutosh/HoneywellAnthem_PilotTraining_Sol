// Flight director — yellow FD chevron with proper labeled pitch ladder.
// Pitch bars at ±5°, ±10°, ±20° with degree labels on 10° bars.

interface FlightDirectorProps {
  isDescending: boolean;
}

const FONT_MONO = "'JetBrains Mono', 'Consolas', monospace";

// Flight director vertical center as percentage from top
const FD_CENTER = '47%';

// Pixels per degree of pitch (7px = standard glass cockpit scale)
const PX_PER_DEG = 7;

// [degrees, width, showLabel]
const PITCH_REFS: [number, number, boolean][] = [
  [-20, 65, true],
  [-10, 65, true],
  [-5,  35, false],
  [0,   160, false],   // horizon
  [5,   35, false],
  [10,  65, true],
  [20,  65, true],
];

export function FlightDirector({ isDescending }: FlightDirectorProps) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Pitch ladder */}
      {PITCH_REFS.map(([deg, width, showLabel]) => {
        const offset = -deg * PX_PER_DEG; // positive pitch = upward on screen
        const isHorizon = deg === 0;
        const isMajor = Math.abs(deg) >= 10;
        const opacity = isHorizon ? 0.55 : isMajor ? 0.5 : 0.35;
        const barH = isMajor ? 2 : 1;

        return (
          <div
            key={deg}
            className="absolute left-1/2"
            style={{
              top: `calc(${FD_CENTER} + ${offset}px)`,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {/* Left label */}
            {showLabel && (
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(34,211,238,0.6)',
                width: 22,
                textAlign: 'right',
                userSelect: 'none',
              }}>
                {Math.abs(deg)}
              </span>
            )}
            {!showLabel && <span style={{ width: 28 }} />}

            {/* Bar */}
            <div style={{
              width,
              height: barH,
              backgroundColor: `rgba(34,211,238,${opacity})`,
              borderRadius: 1,
            }} />

            {/* Right label */}
            {showLabel && (
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(34,211,238,0.6)',
                width: 22,
                userSelect: 'none',
              }}>
                {Math.abs(deg)}
              </span>
            )}
          </div>
        );
      })}

      {/* Flight director chevron — Figma node 11-690, centered */}
      <div
        className="absolute left-1/2 transition-all duration-300"
        style={{
          top: isDescending
            ? `calc(${FD_CENTER} + 10px)`
            : `calc(${FD_CENTER} - 5px)`,
          transform: 'translateX(-50%) translateY(-50%)',
        }}
      >
        <div className="relative">
          {/* Horizontal yellow reference lines */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ width: 120, height: 4, top: 0, backgroundColor: '#F2E900', borderRadius: 2 }}
          />
          <div
            className="absolute"
            style={{ width: 80, height: 4, top: 0, right: 'calc(50% + 75px)', backgroundColor: '#F2E900', borderRadius: 2 }}
          />
          <div
            className="absolute"
            style={{ width: 80, height: 4, top: 0, left: 'calc(50% + 75px)', backgroundColor: '#F2E900', borderRadius: 2 }}
          />
          <svg width="220" height="56" viewBox="0 0 436 111" fill="none">
            <path
              d="M435.355 99.7137L229.243 1.66027L0.638925 109.21L229.243 28.1747L435.355 99.7137Z"
              fill="#F2E900"
            />
            <path
              d="M312.288 99.7137H435.355L229.243 28.1747L0.638925 109.21L121.685 99.7137V78.7022H312.288V99.7137Z"
              fill="#FFCC66"
            />
            <path
              d="M0.638925 109.21L229.243 1.66027L435.355 99.7137M0.638925 109.21L121.685 99.7137V78.7022H312.288V99.7137H435.355M0.638925 109.21L229.243 28.1747L435.355 99.7137"
              stroke="#FFCC66"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
