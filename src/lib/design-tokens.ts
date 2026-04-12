// Copyright: Your Name. Apache 2.0
// B+C merge design tokens. See docs/specs/design-system.md.

// Typography
export const FONT_UI = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
export const FONT_MONO = FONT_UI; // legacy alias — no more Courier
export const FONT_COURT = "Roboto, sans-serif"; // SVG text rendering

// Backgrounds — near-black chrome
export const BG_PAGE = "#0a0a0b";
export const BG_SURFACE = "#111113";
export const BG_ELEVATED = "#19191c";

// Text — warm-white ladder
export const TEXT_PRIMARY = "#fafafa";
export const TEXT_MUTED = "#a1a1aa";
export const TEXT_DIM = "#63636e";
export const TEXT_GHOST = "#3e3e45";

// Borders — rgba-on-white for chrome effect
export const BORDER_SUBTLE = "rgba(255,255,255,0.08)";
export const BORDER_MEDIUM = "rgba(255,255,255,0.14)";
export const BORDER_STRONG = "rgba(255,255,255,0.22)";
export const BORDER_LIGHT = BORDER_SUBTLE; // legacy alias

// Accent — basketball orange, court + interactive
export const ACCENT = "#f97316";
export const ACCENT_SOFT = "rgba(249,115,22,0.1)";
export const BG_INVERTED = ACCENT;
export const BG_CONTROL_ACTIVE = ACCENT;
export const BG_CONTROL = "transparent";
export const TEXT_INVERTED = "#ffffff";

// Semantic
export const COLOR_GREEN = "#22c55e";
export const COLOR_RED = "#ef4444";
export const COLOR_AMBER = "#eab308";
export const COLOR_PURPLE = "#a855f7";

// Court-specific (unified with accent — same orange for ball + UI)
export const BALL_ORANGE = "#f97316";
export const BALL_DARK = "#c2610f";
export const PASS_COLOR = "#f97316";
export const ACTION_COLOR = "rgba(51,51,51,1)";

// Spacing + layout
export const PADDING_CELL = "6px 10px";
export const PADDING_SECTION = "16px";
export const BORDER = `1px solid ${BORDER_STRONG}`;
export const BORDER_INTERNAL = `1px solid ${BORDER_SUBTLE}`;

export const RADIUS = 0;
export const SHADOW = "none";
