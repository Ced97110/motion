// Copyright: Your Name. Apache 2.0
// Phase-preview simulator for the play-editor lab.
//
// Given a full V7Play and a target phase index, walks the main-line phases
// up to (but not including) that phase — applying each action's `move.to`
// to a tracked-position map seeded from `play.players`. The result is the
// set of positions each player occupies at the START of the target phase.
//
// `derivePhasePreviewPlay` wraps this into a single-phase V7Play suitable
// for feeding into a standard PlayViewerV7 — so the authoritative viewer
// renders one phase in isolation without any changes to its code.
//
// Branch phases are intentionally IGNORED here: branches are alternate
// futures that fork off the main line, not steps in the main sequence.

import type { V7Play, V7Phase, V7Point } from "./v7-types";

export function computePhaseStartPositions(
  play: V7Play,
  phaseIndex: number,
): Record<string, V7Point> {
  const phases: V7Phase[] = Array.isArray(play.phases) ? play.phases : [];
  if (phaseIndex < 0 || phaseIndex >= phases.length) {
    console.warn(
      `[phase-simulator] phaseIndex ${phaseIndex} out of bounds (phases.length=${phases.length}); returning original players`,
    );
    return { ...play.players };
  }
  // Seed from the starting roster. Copy into a plain record so we can
  // overwrite without mutating the input play.
  const positions: Record<string, V7Point> = {};
  for (const [id, pt] of Object.entries(play.players ?? {})) {
    positions[id] = [pt[0], pt[1]] as V7Point;
  }
  // Walk phases [0, phaseIndex). For each action with a `move`, advance
  // the tracked position for that player. Actions without a `move`
  // (e.g. pass-only with `ball` field) do not move anyone — skip them.
  // This mirrors the backend's `_synthesize_action_paths` behavior.
  for (let i = 0; i < phaseIndex; i += 1) {
    const phase = phases[i];
    const actions = phase?.actions ?? [];
    for (const action of actions) {
      const move = action.move;
      if (!move || !move.id || !Array.isArray(move.to)) continue;
      positions[move.id] = [move.to[0], move.to[1]] as V7Point;
    }
  }
  return positions;
}

export function derivePhasePreviewPlay(
  play: V7Play,
  phaseIndex: number,
): V7Play {
  const phases: V7Phase[] = Array.isArray(play.phases) ? play.phases : [];
  if (phaseIndex < 0 || phaseIndex >= phases.length) {
    console.warn(
      `[phase-simulator] phaseIndex ${phaseIndex} out of bounds (phases.length=${phases.length}); returning original play`,
    );
    return play;
  }
  const startPositions = computePhaseStartPositions(play, phaseIndex);
  // Deep-clone the target phase so the preview doesn't share references
  // with the source play. Callers can safely tweak the preview without
  // corrupting the authoring state.
  const clonedPhase = structuredClone(phases[phaseIndex]);
  return {
    ...play,
    players: startPositions,
    phases: [clonedPhase],
    branchPoint: undefined,
  };
}
