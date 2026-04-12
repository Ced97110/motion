// Copyright: Your Name. Apache 2.0
// Deterministic SemanticPlay → Play translator.
//
// The LLM emits a SemanticPlay — players sit at named positions, actions
// reference position names, not coordinates. This module does the
// coordinate resolution and path building, producing the `Play` shape the
// existing PlayViewer already knows how to animate.
//
// The translator simulates player positions as actions execute so later
// actions in a phase see the effects of earlier ones (e.g., a pass's
// endpoint tracks the receiver's current position, not their start).

import type { Play, Phase, Action } from "../types";
import {
  COURT_POSITIONS,
  type PositionName,
  resolvePosition,
} from "./positions";
import {
  curvedPath,
  inferCutBias,
  straightPath,
  type CurveBias,
  type Point,
} from "./path";

// ── Semantic-layer types (what the LLM outputs) ─────────────────────────

export interface SemanticRoster {
  [id: string]: { name: string; pos: "PG" | "SG" | "SF" | "PF" | "C" };
}

export interface SemanticPlay {
  name: string;
  tag: string;
  desc: string;
  /** Player id → starting named position. */
  players: Record<string, PositionName>;
  roster: SemanticRoster;
  ballStart: string;
  phases: SemanticPhase[];
}

export interface SemanticPhase {
  label: string;
  text: string;
  detail?: string;
  actions: SemanticAction[];
}

export type SemanticAction =
  | {
      type: "cut";
      player: string;
      to: PositionName;
      /** Optional curve hint; if omitted the translator picks one. */
      bias?: CurveBias;
    }
  | {
      type: "screen";
      screener: string;
      cutter: string;
      /** Where the screen is set. The screener moves here. */
      at: PositionName;
      /** Where the cutter ends up after using the screen. */
      cutter_to: PositionName;
      bias?: CurveBias;
    }
  | {
      type: "pass";
      from_player: string;
      to_player: string;
    }
  | {
      type: "dribble";
      player: string;
      to: PositionName;
      bias?: CurveBias;
    }
  | {
      type: "handoff";
      giver: string;
      receiver: string;
      at: PositionName;
    };

// ── Translator ──────────────────────────────────────────────────────────

class PositionTracker {
  private positions: Map<string, Point> = new Map();

  constructor(players: Record<string, PositionName>) {
    for (const [id, name] of Object.entries(players)) {
      this.positions.set(id, resolvePosition(name));
    }
  }

  get(id: string): Point {
    const p = this.positions.get(id);
    if (!p) throw new Error(`Player ${id} has no tracked position`);
    return p;
  }

  move(id: string, to: Point): void {
    this.positions.set(id, to);
  }

  snapshot(): Record<string, Point> {
    return Object.fromEntries(this.positions);
  }
}

/** Translate a single SemanticAction into zero-or-more Play Actions. */
function translateAction(
  action: SemanticAction,
  tracker: PositionTracker,
): Action[] {
  switch (action.type) {
    case "cut": {
      const from = tracker.get(action.player);
      const to = resolvePosition(action.to);
      const bias = action.bias ?? inferCutBias(from, to as Point);
      const path = curvedPath(from, to as Point, bias);
      tracker.move(action.player, to as Point);
      return [
        {
          marker: "arrow",
          path,
          move: { id: action.player, to: [to[0], to[1]] },
        },
      ];
    }
    case "dribble": {
      const from = tracker.get(action.player);
      const to = resolvePosition(action.to);
      const bias = action.bias ?? "straight";
      const path =
        bias === "straight"
          ? straightPath(from, to as Point)
          : curvedPath(from, to as Point, bias);
      tracker.move(action.player, to as Point);
      return [
        {
          marker: "arrow",
          path,
          move: { id: action.player, to: [to[0], to[1]] },
        },
      ];
    }
    case "screen": {
      // Screener moves to the screen spot; cutter moves through it to their
      // destination. Two discrete actions so the animation reads clearly.
      const screenerFrom = tracker.get(action.screener);
      const at = resolvePosition(action.at);
      const cutterFrom = tracker.get(action.cutter);
      const cutterTo = resolvePosition(action.cutter_to);

      const screenPath = curvedPath(
        screenerFrom,
        at as Point,
        "toward_basket",
      );
      tracker.move(action.screener, at as Point);

      const cutBias = action.bias ?? inferCutBias(cutterFrom, cutterTo as Point);
      const cutPath = curvedPath(cutterFrom, cutterTo as Point, cutBias);
      tracker.move(action.cutter, cutterTo as Point);

      return [
        {
          marker: "screen",
          path: screenPath,
          move: { id: action.screener, to: [at[0], at[1]] },
        },
        {
          marker: "arrow",
          path: cutPath,
          move: { id: action.cutter, to: [cutterTo[0], cutterTo[1]] },
        },
      ];
    }
    case "pass": {
      const from = tracker.get(action.from_player);
      const to = tracker.get(action.to_player);
      return [
        {
          marker: "arrow",
          path: straightPath(from, to),
          dashed: true,
          ball: { from: action.from_player, to: action.to_player },
        },
      ];
    }
    case "handoff": {
      // Giver travels to the handoff spot; ball transfers at the spot.
      // Render as: giver's cut to `at` + a short dashed handoff line from
      // `at` to the receiver's current position.
      const giverFrom = tracker.get(action.giver);
      const receiverFrom = tracker.get(action.receiver);
      const at = resolvePosition(action.at);
      const giverPath = curvedPath(giverFrom, at as Point, "straight");
      tracker.move(action.giver, at as Point);
      return [
        {
          marker: "arrow",
          path: giverPath,
          move: { id: action.giver, to: [at[0], at[1]] },
        },
        {
          marker: "arrow",
          path: straightPath(at as Point, receiverFrom),
          dashed: true,
          ball: { from: action.giver, to: action.receiver },
        },
      ];
    }
  }
}

function translatePhase(
  phase: SemanticPhase,
  tracker: PositionTracker,
): Phase {
  const actions: Action[] = [];
  for (const a of phase.actions) {
    actions.push(...translateAction(a, tracker));
  }
  return {
    label: phase.label,
    text: phase.text,
    detail: phase.detail,
    actions,
  };
}

/**
 * Main entry point. Turns a semantic play into the flat Play structure the
 * PlayViewer consumes. Throws on invalid position names — we want this
 * loud, not silent, so bad LLM output is caught at translate time.
 */
export function synthesizePlay(sp: SemanticPlay): Play {
  const startingPlayers: Record<string, [number, number]> = {};
  for (const [id, posName] of Object.entries(sp.players)) {
    const [x, y] = resolvePosition(posName);
    startingPlayers[id] = [x, y];
  }

  const tracker = new PositionTracker(sp.players);
  const phases = sp.phases.map((p) => translatePhase(p, tracker));

  return {
    name: sp.name,
    tag: sp.tag,
    desc: sp.desc,
    players: startingPlayers,
    roster: sp.roster,
    ballStart: sp.ballStart,
    phases,
  };
}

/**
 * Minimum clear distance (SVG units) between any two player label centers
 * at a phase boundary. Derived from PlayViewer's rendering: the label SVG
 * container is 9.45 units, but the actual visible glyph (text size 70 in
 * a 300×300 viewBox scaled to 9.45) is ~2.2 units wide. We require 4.0
 * units so glyphs never touch — this allows near-neighbor spots like
 * left_elbow (-8,19) and left_wing (-15,22) at ~7.6 apart while rejecting
 * exact overlap or sub-glyph-width stacking.
 */
export const MIN_PLAYER_CLEARANCE = 4.0;

/** Euclidean distance in the court coordinate system. */
function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Simulate the semantic actions phase-by-phase, returning the list of
 * (phaseIdx, playerId → Point) snapshots at each phase END. Same
 * simulation logic as translatePhase, but surfaced for validation.
 */
function simulatePhaseEndStates(
  sp: SemanticPlay,
): Array<Record<string, Point>> {
  const tracker = new PositionTracker(sp.players);
  const snapshots: Array<Record<string, Point>> = [];
  for (const phase of sp.phases) {
    for (const action of phase.actions) {
      // Mirror translateAction's state mutations (ignoring paths, which
      // are layout-only). Keep in sync with translateAction.
      switch (action.type) {
        case "cut":
        case "dribble":
          tracker.move(action.player, resolvePosition(action.to) as Point);
          break;
        case "screen":
          tracker.move(action.screener, resolvePosition(action.at) as Point);
          tracker.move(
            action.cutter,
            resolvePosition(action.cutter_to) as Point,
          );
          break;
        case "handoff":
          tracker.move(action.giver, resolvePosition(action.at) as Point);
          break;
        case "pass":
          // Pass doesn't move either player.
          break;
      }
    }
    snapshots.push(tracker.snapshot());
  }
  return snapshots;
}

/**
 * Find all player-pair collisions at the END of any phase.
 * Returns an empty array if the play is collision-free.
 */
export function findCollisions(sp: SemanticPlay): Array<{
  phaseIdx: number;
  phaseLabel: string;
  playerA: string;
  playerB: string;
  distance: number;
}> {
  const collisions: Array<{
    phaseIdx: number;
    phaseLabel: string;
    playerA: string;
    playerB: string;
    distance: number;
  }> = [];
  const snapshots = simulatePhaseEndStates(sp);
  const ids = Object.keys(sp.players);
  for (let p = 0; p < snapshots.length; p++) {
    const snap = snapshots[p];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = snap[ids[i]];
        const b = snap[ids[j]];
        if (!a || !b) continue;
        const d = distance(a, b);
        if (d < MIN_PLAYER_CLEARANCE) {
          collisions.push({
            phaseIdx: p,
            phaseLabel: sp.phases[p].label,
            playerA: ids[i],
            playerB: ids[j],
            distance: d,
          });
        }
      }
    }
  }
  return collisions;
}

/** Validate a SemanticPlay before translating — returns list of errors. */
export function validateSemanticPlay(sp: SemanticPlay): string[] {
  const errs: string[] = [];
  const ids = Object.keys(sp.players);
  if (ids.length === 0) errs.push("players map is empty");
  for (const [id, name] of Object.entries(sp.players)) {
    if (!(name in COURT_POSITIONS)) {
      errs.push(`player ${id} at unknown position "${name}"`);
    }
  }
  if (!sp.players[sp.ballStart]) {
    errs.push(`ballStart "${sp.ballStart}" not in players map`);
  }
  for (const [phaseIdx, phase] of sp.phases.entries()) {
    if (phase.actions.length === 0) {
      errs.push(`phase ${phaseIdx} has zero actions`);
      continue;
    }
    for (const [actIdx, a] of phase.actions.entries()) {
      const where = `phase ${phaseIdx} action ${actIdx}`;
      switch (a.type) {
        case "cut":
        case "dribble":
          if (!ids.includes(a.player)) errs.push(`${where}: unknown player ${a.player}`);
          if (!(a.to in COURT_POSITIONS)) errs.push(`${where}: unknown position ${a.to}`);
          break;
        case "screen":
          if (!ids.includes(a.screener)) errs.push(`${where}: unknown screener ${a.screener}`);
          if (!ids.includes(a.cutter)) errs.push(`${where}: unknown cutter ${a.cutter}`);
          if (!(a.at in COURT_POSITIONS)) errs.push(`${where}: unknown at ${a.at}`);
          if (!(a.cutter_to in COURT_POSITIONS)) errs.push(`${where}: unknown cutter_to ${a.cutter_to}`);
          break;
        case "pass":
          if (!ids.includes(a.from_player)) errs.push(`${where}: unknown from_player ${a.from_player}`);
          if (!ids.includes(a.to_player)) errs.push(`${where}: unknown to_player ${a.to_player}`);
          break;
        case "handoff":
          if (!ids.includes(a.giver)) errs.push(`${where}: unknown giver ${a.giver}`);
          if (!ids.includes(a.receiver)) errs.push(`${where}: unknown receiver ${a.receiver}`);
          if (!(a.at in COURT_POSITIONS)) errs.push(`${where}: unknown at ${a.at}`);
          break;
      }
    }
  }
  // End-of-phase collision check — no two players may occupy the same
  // resolved coordinate or get within icon-width of each other at a phase
  // boundary. Only checked when all action-level refs resolve; otherwise
  // simulation would crash on the missing-position errors above.
  if (errs.length === 0) {
    for (const c of findCollisions(sp)) {
      errs.push(
        `${c.phaseLabel}: players ${c.playerA} and ${c.playerB} within ${c.distance.toFixed(2)} units (< ${MIN_PLAYER_CLEARANCE}). Move one to a different named position.`,
      );
    }
  }
  return errs;
}
