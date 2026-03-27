// Flight director — exact Figma node 11-690 yellow arrow element
// with pitch reference bars. Positioned at frame center (~47% from top).

interface FlightDirectorProps {
  isDescending: boolean;
}

// Pitch bar positions: [offset from center in px, width in px]
const PITCH_BARS: [number, number][] = [
  [-100, 35],   // narrow bar above
  [-55, 65],    // medium bar above
  [0, 160],     // wide bar at horizon
  [65, 65],     // medium bar below
  [150, 160],   // wide bar below
];

// Flight director vertical center as percentage from top
const FD_CENTER = '47%';

export function FlightDirector({ isDescending }: FlightDirectorProps) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Pitch reference bars — positioned relative to frame center */}
      {PITCH_BARS.map(([offset, width], i) => (
        <div
          key={i}
          className="absolute left-1/2"
          style={{
            top: `calc(${FD_CENTER} + ${offset}px)`,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            style={{
              width: `${width}px`,
              height: '4px',
              backgroundColor: 'rgba(0,0,0,0.35)',
              boxShadow: 'inset 0 3px 3px rgba(0,0,0,0.2)',
              borderRadius: '1px',
            }}
          />
        </div>
      ))}

      {/* Flight director — exact SVG from Figma node 11-690, centered in frame */}
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
          {/* Horizontal yellow reference lines — Figma node 11-712, at arrow tip */}
          {/* Center line */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: 120,
              height: 4,
              top: 0,
              backgroundColor: '#F2E900',
              borderRadius: 2,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
          {/* Left flanking line */}
          <div
            className="absolute"
            style={{
              width: 80,
              height: 4,
              top: 0,
              right: 'calc(50% + 75px)',
              backgroundColor: '#F2E900',
              borderRadius: 2,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
          {/* Right flanking line */}
          <div
            className="absolute"
            style={{
              width: 80,
              height: 4,
              top: 0,
              left: 'calc(50% + 75px)',
              backgroundColor: '#F2E900',
              borderRadius: 2,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
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
