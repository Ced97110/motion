// Copyright: Your Name. Apache 2.0
// Canonical court position vocabulary for SVG half-court (viewBox "-28 -3 56 50").
//
// Origin (0, 0) is center-top of the half court. X: -28 left, +28 right.
// Y: 0 is the baseline (behind hoop), y increases away from the hoop toward
// half-court (y=47).
//
// Reference anchors calibrated against the Weakside Flare Slip production
// coordinates so new synthesized plays visually match the existing hero
// animation.

export type PositionName =
  // Perimeter — outside the 3-point arc
  | "top_of_key" // PG spot, well above arc
  | "top_arc" // top of the 3pt arc
  | "left_wing"
  | "right_wing"
  | "left_slot"
  | "right_slot"
  | "left_corner"
  | "right_corner"
  | "left_45"
  | "right_45"
  // Inside the arc
  | "high_post"
  | "low_post"
  | "left_elbow"
  | "right_elbow"
  | "left_block"
  | "right_block"
  | "left_short_corner"
  | "right_short_corner"
  // Screen / pindown anchors
  | "ball_screen_top"
  | "left_pindown"
  | "right_pindown"
  | "left_wide_pindown"
  | "right_wide_pindown"
  // Half-court + backcourt
  | "half_court_center"
  | "half_court_left"
  | "half_court_right"
  // Out of bounds — baseline
  | "baseline_center"
  | "baseline_left"
  | "baseline_right"
  | "baseline_deep_left"
  | "baseline_deep_right"
  // Out of bounds — sideline
  | "sideline_left_high"
  | "sideline_right_high";

/**
 * Canonical half-court coordinates. All downstream code — path builders,
 * the synthesizer, tests — pulls positions from here. Fix a bad position
 * once, every play improves.
 */
export const COURT_POSITIONS: Record<PositionName, readonly [number, number]> =
  {
    // ── Perimeter (outside the 3-point arc) ─────────────────────────────
    top_of_key: [0, 32], // PG high above the arc — matches team reference
    top_arc: [0, 24], // top of 3pt arc
    left_wing: [-15, 22], // wing 3pt spot
    right_wing: [15, 22],
    left_slot: [-13, 28], // 45° between wing and top of key — differentiated from wing
    right_slot: [13, 28],
    left_corner: [-24, 4],
    right_corner: [24, 4],
    left_45: [-18, 14], // 45° angle, elbow-extended height
    right_45: [18, 14],

    // ── Inside the arc ──────────────────────────────────────────────────
    // Paint is 16 ft wide → elbow/block width is ±8. Player icons are
    // 9.45 SVG units wide, so anything tighter than ±6 will visibly clip.
    high_post: [0, 15],
    low_post: [0, 6],
    left_elbow: [-8, 19],
    right_elbow: [8, 19],
    left_block: [-8, 5],
    right_block: [8, 5],
    left_short_corner: [-16, 4],
    right_short_corner: [16, 4],

    // ── Screen anchors (common PnR / pindown spots) ─────────────────────
    ball_screen_top: [0, 22],
    left_pindown: [-12, 10],
    right_pindown: [12, 10],
    left_wide_pindown: [-18, 10],
    right_wide_pindown: [18, 10],

    // ── Half-court & backcourt ──────────────────────────────────────────
    half_court_center: [0, 45],
    half_court_left: [-20, 45],
    half_court_right: [20, 45],

    // ── Out of bounds — baseline ────────────────────────────────────────
    baseline_center: [0, 1],
    baseline_left: [-10, 1],
    baseline_right: [10, 1],
    baseline_deep_left: [-18, 1],
    baseline_deep_right: [18, 1],

    // ── Out of bounds — sideline (SLOB spots) ───────────────────────────
    sideline_left_high: [-26, 25],
    sideline_right_high: [26, 25],
  } as const;

/** Human-readable list of every valid position name — used in prompts. */
export const POSITION_NAMES: readonly PositionName[] = Object.keys(
  COURT_POSITIONS,
) as PositionName[];

/** Resolve a named position to [x, y]. Throws on unknown name (fail loud). */
export function resolvePosition(name: PositionName): readonly [number, number] {
  const p = COURT_POSITIONS[name];
  if (!p) throw new Error(`Unknown court position: ${name}`);
  return p;
}

/** Hoop location — used as the "basket" target for slip/finish cuts. */
export const HOOP: readonly [number, number] = [0, 5.25];
