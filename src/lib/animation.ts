export const START_TRIM = 1.5;
export const END_TRIM = 3.0;
export const DRAW_END = 0.35;
export const FADE_END = 0.65;

export const BALL_ORANGE = "#f97316";
export const BALL_DARK = "#c2610f";
export const PASS_COLOR = "#f97316";
export const ACTION_COLOR = "rgba(51,51,51,1)";
export const GHOST_OPACITY = 0.1;

export const ease = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
