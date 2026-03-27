// Centralized PFD design tokens — dimensions, colors, font sizes from Figma.

export const PFD = {
  // Speed tape (left side) — from Figma node 43-533 (181×371)
  SPD_VB_W: 181,               // Full SVG viewBox width
  SPD_VB_H: 371,               // Full SVG viewBox height
  SPD_BODY_X: 54,              // Tape body left edge
  SPD_BODY_W: 119,             // Tape body width (54→173)
  SPD_BODY_Y: 37,              // Tape body top (scrollable start)
  SPD_BODY_H: 297,             // Tape body height (scrollable area)
  SPD_CAP_H: 37,               // Top/bottom cap height
  SPD_VS_X: 1,                 // V/S area left edge
  SPD_VS_Y: 49,                // V/S area top
  SPD_VS_W: 52,                // V/S area width (1→53)
  SPD_VS_H: 265,               // V/S area height (49→314)
  SPD_TICK_MAJOR: 21,          // Major tick length
  SPD_TICK_MINOR: 13,          // Minor tick length
  SPD_TICK_INTERVAL: 10,       // Knots per major tick
  SPD_VISIBLE_RANGE: 42,       // Knots visible (297px / 7px-per-knot)

  // Altitude tape (right side) — from Figma node 37-47 (152×603) + 37-93 (61×383)
  ALT_TAPE_BODY_W: 152,         // Figma tape body width
  ALT_TAPE_BODY_H: 603,         // Figma tape body height
  ALT_VS_W: 61,                 // Figma V/S area width
  ALT_VS_H: 383,                // Figma V/S area height
  ALT_POINTER_W: 152,           // Figma pointer width (node 41-405)
  ALT_POINTER_H: 122,           // Figma pointer height
  ALT_HIGHLIGHT_W: 76,          // Figma highlight box width (node 39-352)
  ALT_HIGHLIGHT_H: 24,          // Figma highlight box height
  ALT_TICK_LEN: 21,             // Figma tick length (node 38-181)
  ALT_TICK_INTERVAL: 100,
  ALT_VISIBLE_RANGE: 3000,

  // Compass (smaller circle, lower half of PFD)
  COMPASS_SIZE: 320,
  COMPASS_RADIUS: 160,
  COMPASS_OUTER_RING_RADIUS: 148,
  COMPASS_INNER_RING_RADIUS: 90,

  // Top heading arc
  TOP_ARC_WIDTH: 525,
  TOP_ARC_HEIGHT: 218,

  // Colors
  CYAN: '#4EFFFC',
  CYAN_LIGHT: '#A6FAF8',
  YELLOW: '#F2E900',
  GOLD: '#FFCC66',
  MAGENTA: '#C06AF5',
  COMPASS_CYAN: '#5EE0FF',
  TAPE_BG: 'rgba(0,0,0,0.2)',
  TAPE_CAP: 'rgba(0,0,0,0.4)',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  TICK_STROKE: '#FFFFFF',

  // Fonts
  FONT_GRADUATE: "'Graduate', cursive",
  FONT_GRAVITAS: "'Gravitas One', cursive",
  FONT_SCALE: 24,
  FONT_CALLOUT: 30,
  FONT_CURRENT_SPEED: 32,
  FONT_VS_SCALE: 20,
  FONT_COMPASS_CARDINAL: 32,
  FONT_COMPASS_DEGREE: 24,

  // Strokes
  TICK_WIDTH_SHORT: 21,
  TICK_WIDTH_MEDIUM: 30,
  TICK_WIDTH_LONG: 44,
  TICK_STROKE_WIDTH: 3,
  POINTER_STROKE_WIDTH: 4,
} as const;
