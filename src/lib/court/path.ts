// Copyright: Your Name. Apache 2.0
// Deterministic SVG path builder for court animations.
//
// Given two court positions (or one plus a direction), produce an SVG path
// "d" attribute. The shape of the curve matters: cuts toward the basket
// should curve inward, flare cuts should bow outward, passes are straight.
// All of this is computed — no LLM, no randomness — so the same semantic
// action always yields the same path.

import { HOOP } from "./positions";

/** An [x, y] point in the court coordinate system. */
export type Point = readonly [number, number];

/** Euclidean distance. */
function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Interpolate t ∈ [0,1] between a and b. */
function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Perpendicular offset of magnitude `d` to the vector from a → b. */
function perpOffset(a: Point, b: Point, d: number): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // Right-hand perpendicular (positive d bends to the "right" of travel).
  return [(-dy * d) / len, (dx * d) / len];
}

function fmt(n: number): string {
  // Three decimals is more than the viewBox needs; two reads better in tests.
  return (Math.round(n * 100) / 100).toString();
}

/** Straight line M→L, for passes and direct handoffs. */
export function straightPath(from: Point, to: Point): string {
  return `M ${fmt(from[0])} ${fmt(from[1])} L ${fmt(to[0])} ${fmt(to[1])}`;
}

export type CurveBias =
  | "toward_basket" // cut curves inward toward the hoop (finishers)
  | "away_from_basket" // flare / fade away
  | "right" // bend to geometric right of the travel vector
  | "left" // bend to left
  | "straight"; // no curvature (passes, short moves)

/**
 * Build a cubic Bézier between two points with a bias-driven curve.
 * The two control points sit at 1/3 and 2/3 along the line, offset
 * perpendicular by an amount proportional to the segment length.
 */
export function curvedPath(
  from: Point,
  to: Point,
  bias: CurveBias = "straight",
): string {
  const length = dist(from, to);
  // Curvature scales with travel distance — short hops bend less.
  const amount = Math.min(4, Math.max(0.6, length * 0.18));

  let offset: Point = [0, 0];
  switch (bias) {
    case "straight":
      return straightPath(from, to);
    case "right":
      offset = perpOffset(from, to, amount);
      break;
    case "left":
      offset = perpOffset(from, to, -amount);
      break;
    case "toward_basket": {
      // Bend the midpoint toward the hoop.
      const mid = lerp(from, to, 0.5);
      const dx = HOOP[0] - mid[0];
      const dy = HOOP[1] - mid[1];
      const n = Math.hypot(dx, dy) || 1;
      const pull = Math.min(3, length * 0.25);
      offset = [(dx / n) * pull, (dy / n) * pull];
      break;
    }
    case "away_from_basket": {
      const mid = lerp(from, to, 0.5);
      const dx = mid[0] - HOOP[0];
      const dy = mid[1] - HOOP[1];
      const n = Math.hypot(dx, dy) || 1;
      const push = Math.min(3, length * 0.25);
      offset = [(dx / n) * push, (dy / n) * push];
      break;
    }
  }

  const c1 = lerp(from, to, 1 / 3);
  const c2 = lerp(from, to, 2 / 3);
  const cp1: Point = [c1[0] + offset[0], c1[1] + offset[1]];
  const cp2: Point = [c2[0] + offset[0], c2[1] + offset[1]];

  return (
    `M ${fmt(from[0])} ${fmt(from[1])} ` +
    `C ${fmt(cp1[0])} ${fmt(cp1[1])}, ${fmt(cp2[0])} ${fmt(cp2[1])}, ` +
    `${fmt(to[0])} ${fmt(to[1])}`
  );
}

/**
 * Infer a sensible curve bias from the geometry of a cut. Heuristics:
 * - Ending very close to the hoop → toward_basket (slip / finish)
 * - Starting and ending at the same depth but across the court → straight
 * - Otherwise fall back to a gentle right-bend so the line doesn't overlap
 *   the straight tangent of a symmetric pass.
 */
export function inferCutBias(from: Point, to: Point): CurveBias {
  const endsNearHoop = dist(to, HOOP) < 8;
  if (endsNearHoop) return "toward_basket";
  const dy = Math.abs(to[1] - from[1]);
  const dx = Math.abs(to[0] - from[0]);
  if (dy < 2 && dx > 6) return "straight"; // purely lateral
  return "right";
}
