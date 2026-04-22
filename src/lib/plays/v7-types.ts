// Copyright: Your Name. Apache 2.0
// Types for the v7 viewer's RENDER-SHAPE play data.
//
// v7 consumes pre-computed SVG path strings + resolved move/ball metadata.
// This is what the normalizer (toV7Shape) produces from the authored
// source-shape Play (with steps[] and movements[]). Kept in a dedicated file
// so authored-shape and render-shape can evolve independently.

export type V7Point = readonly [number, number];

export interface V7RosterEntry {
  name: string;
  pos: string;
}

export interface V7Move {
  id: string;
  to: V7Point;
}

export interface V7Ball {
  from: string;
  to: string;
}

export interface V7Action {
  /**
   * Visual symbol applied to the action's SVG path:
   * - `arrow`   — standard cut/pass (filled arrowhead terminator).
   * - `screen`  — off-ball screen (T-bar perpendicular to path end).
   * - `shot`    — shot attempt (crosshair disc at endpoint).
   * - `dribble` — live dribble to basket (wavy/zigzag line along path).
   * - `handoff` — dribble handoff (solid line with two perpendicular ticks near end).
   */
  marker: "arrow" | "screen" | "shot" | "dribble" | "handoff";
  path: string;
  dashed?: boolean;
  move?: V7Move;
  ball?: V7Ball;
  /**
   * Explicit animation duration for this action in milliseconds. When set,
   * overrides the viewer's default (2400ms solid / 1800ms dashed). Use to
   * slow down an emphasis beat or speed a transitional move.
   */
  durationMs?: number;
  /**
   * Explicit delay BEFORE the next action starts, in milliseconds. Overrides
   * the viewer's default inter-action gap (350ms). Use to pause after a
   * critical read.
   */
  gapAfterMs?: number;
}

export interface V7DefenseAction {
  id: string;
  to: V7Point;
  desc?: string;
}

export interface V7Phase {
  label: string;
  text: string;
  spotlightText?: Record<string, string>;
  actions: V7Action[];
  defenseActions?: V7DefenseAction[];
  /**
   * Override the inter-phase pause that fires after all of this phase's
   * actions complete. Defaults to 800ms in the viewer when omitted. Set a
   * larger value on a phase you want the reader to dwell on; set a smaller
   * value to chain phases tightly.
   */
  pauseAfterMs?: number;
}

export interface V7BranchOption {
  label: string;
  desc: string;
  icon: string;
  phase: V7Phase;
}

export interface V7BranchPoint {
  prompt: string;
  subprompt?: string;
  options: V7BranchOption[];
}

export interface V7Concepts {
  counters: string[];
  bestFor: string;
  related: string[];
}

export interface V7Play {
  name: string;
  tag: string;
  desc: string;
  coachNote: string;
  concepts: V7Concepts;
  players: Record<string, V7Point>;
  roster: Record<string, V7RosterEntry>;
  defense: Record<string, V7Point>;
  ballStart: string;
  phases: V7Phase[];
  branchPoint?: V7BranchPoint;
}
