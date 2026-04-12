// Tests for src/lib/eval/scorers.ts
// Run: npx tsx --test src/lib/eval/__tests__/scorers.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { SemanticPlay } from "../../court/synthesize";
import {
  scoreDiagramResolution,
  scoreSemanticPlay,
  type ResolverExpectations,
  type SynthExpectations,
} from "../scorers";

// ── Fixtures ────────────────────────────────────────────────────────────

const GOLDEN_PLAY: SemanticPlay = {
  name: "Test Play",
  tag: "BLOB",
  desc: "A minimal valid play used as the happy-path fixture.",
  players: {
    "1": "baseline_center",
    "2": "left_wing",
    "3": "right_wing",
    "4": "left_elbow",
    "5": "right_elbow",
  },
  roster: {
    "1": { name: "G1", pos: "PG" },
    "2": { name: "G2", pos: "SG" },
    "3": { name: "W3", pos: "SF" },
    "4": { name: "P4", pos: "PF" },
    "5": { name: "P5", pos: "C" },
  },
  ballStart: "1",
  phases: [
    {
      label: "Phase 1",
      text: "Cuts.",
      actions: [
        { type: "cut", player: "2", to: "left_corner" },
        { type: "cut", player: "3", to: "right_corner" },
      ],
    },
    {
      label: "Phase 2",
      text: "Cross.",
      actions: [
        { type: "cut", player: "4", to: "right_block" },
        { type: "cut", player: "5", to: "left_block" },
      ],
    },
    {
      label: "Phase 3",
      text: "Pass.",
      actions: [{ type: "pass", from_player: "1", to_player: "4" }],
    },
  ],
};

const STD_SYNTH_EXPECT: SynthExpectations = {
  min_phases: 3,
  expected_players: ["1", "2", "3", "4", "5"],
  must_have_action_types: ["cut", "pass"],
  must_avoid_collisions: true,
};

// Helper: deep-clone a SemanticPlay immutably so tests never mutate the
// shared GOLDEN_PLAY fixture.
function clonePlay(p: SemanticPlay): SemanticPlay {
  return JSON.parse(JSON.stringify(p)) as SemanticPlay;
}

// ── scoreSemanticPlay ───────────────────────────────────────────────────

describe("scoreSemanticPlay", () => {
  it("scores 1.0 for a clean golden play", () => {
    const r = scoreSemanticPlay("c1", GOLDEN_PLAY, STD_SYNTH_EXPECT);
    assert.equal(r.score, 1);
    assert.equal(r.passed, true);
    assert.equal(r.failures.length, 0);
  });

  it("penalises missing phases", () => {
    const p = clonePlay(GOLDEN_PLAY);
    p.phases = p.phases.slice(0, 2);
    const r = scoreSemanticPlay("c2", p, STD_SYNTH_EXPECT);
    assert.ok(r.score < 1);
    assert.ok(r.failures.some((f) => f.kind === "min-phases"));
  });

  it("penalises missing required action types", () => {
    const p = clonePlay(GOLDEN_PLAY);
    // Remove all pass actions.
    for (const phase of p.phases) {
      phase.actions = phase.actions.filter((a) => a.type !== "pass");
    }
    // Ensure at least one phase survives with an action.
    p.phases = p.phases.filter((ph) => ph.actions.length > 0);
    const r = scoreSemanticPlay("c3", p, STD_SYNTH_EXPECT);
    assert.ok(r.failures.some((f) => f.kind === "missing-action-types"));
    assert.ok(r.score < 1);
  });

  it("penalises missing expected player ids", () => {
    const p = clonePlay(GOLDEN_PLAY);
    delete p.players["5"];
    delete p.roster["5"];
    // Also strip actions referencing 5 so schema doesn't dominate the
    // failure (we want to verify the missing-players check fires).
    for (const phase of p.phases) {
      phase.actions = phase.actions.filter((a) => {
        if (a.type === "cut" || a.type === "dribble") return a.player !== "5";
        return true;
      });
    }
    p.phases = p.phases.filter((ph) => ph.actions.length > 0);
    const r = scoreSemanticPlay("c4", p, STD_SYNTH_EXPECT);
    assert.ok(r.failures.some((f) => f.kind === "missing-players"));
    assert.ok(r.score < 1);
  });

  it("flags collisions when two players resolve to the same spot", () => {
    const p = clonePlay(GOLDEN_PLAY);
    // Force 4 and 5 to land on the same block at the end of phase 2.
    p.phases[1].actions = [
      { type: "cut", player: "4", to: "left_block" },
      { type: "cut", player: "5", to: "left_block" },
    ];
    const r = scoreSemanticPlay("c5", p, STD_SYNTH_EXPECT);
    assert.ok(r.failures.some((f) => f.kind === "collision"));
    assert.ok(r.score < 1);
  });

  it("flags schema errors when ballStart is invalid", () => {
    const p = clonePlay(GOLDEN_PLAY);
    p.ballStart = "99";
    const r = scoreSemanticPlay("c6", p, STD_SYNTH_EXPECT);
    assert.ok(r.failures.some((f) => f.kind === "schema-invalid"));
    assert.ok(r.score < 1);
  });
});

// ── scoreDiagramResolution ──────────────────────────────────────────────

const STD_RESOLVER_EXPECT: ResolverExpectations = {
  must_not_be_prose_derived: true,
  min_players: 5,
  max_validation_issues: 0,
};

const GOLDEN_DIAGRAM_BODY = [
  "# Example Play",
  "",
  "```json name=diagram-positions",
  '{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":-15,"y":22},{"role":"3","x":15,"y":22},{"role":"4","x":-8,"y":19},{"role":"5","x":8,"y":19}],"actions":[{"from":"1","to":"2","type":"pass"}],"notes":"Figure 7.49 — top diagram on p.33."}',
  "```",
  "",
].join("\n");

const PROSE_DERIVED_BODY = [
  "# Prose Only Play",
  "",
  "```json name=diagram-positions",
  '{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":-15,"y":22},{"role":"3","x":15,"y":22},{"role":"4","x":-8,"y":19},{"role":"5","x":8,"y":19}],"actions":[],"notes":"The attached PDF page contains only coaching text — no basketball court diagram is present. Positions have been inferred entirely from the wiki prose."}',
  "```",
].join("\n");

const OUT_OF_BOUNDS_BODY = [
  "```json name=diagram-positions",
  '{"players":[{"role":"1","x":999,"y":24},{"role":"2","x":-15,"y":22},{"role":"3","x":15,"y":22},{"role":"4","x":-8,"y":19},{"role":"5","x":8,"y":19}],"actions":[],"notes":"Figure — standard layout."}',
  "```",
].join("\n");

describe("scoreDiagramResolution", () => {
  it("scores 1.0 on a clean golden diagram body", () => {
    const r = scoreDiagramResolution(
      "r1",
      GOLDEN_DIAGRAM_BODY,
      STD_RESOLVER_EXPECT,
    );
    assert.equal(r.score, 1);
    assert.equal(r.passed, true);
    assert.equal(r.failures.length, 0);
  });

  it("scores 0 when no diagram block is present", () => {
    const r = scoreDiagramResolution(
      "r2",
      "# play without diagram\n\nprose only.",
      STD_RESOLVER_EXPECT,
    );
    assert.equal(r.score, 0);
    assert.ok(r.failures.some((f) => f.kind === "parse-failed"));
  });

  it("flags prose-derived notes when must_not_be_prose_derived is true", () => {
    const r = scoreDiagramResolution(
      "r3",
      PROSE_DERIVED_BODY,
      STD_RESOLVER_EXPECT,
    );
    assert.ok(r.failures.some((f) => f.kind === "prose-derived"));
    assert.ok(r.score < 1);
  });

  it("flags validation issues when players fall outside the viewBox", () => {
    const r = scoreDiagramResolution(
      "r4",
      OUT_OF_BOUNDS_BODY,
      STD_RESOLVER_EXPECT,
    );
    assert.ok(r.failures.some((f) => f.kind.startsWith("validator:")));
    assert.ok(r.score < 1);
  });

  it("accepts bare JSON as input", () => {
    const raw =
      '{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":-15,"y":22},{"role":"3","x":15,"y":22},{"role":"4","x":-8,"y":19},{"role":"5","x":8,"y":19}],"actions":[],"notes":"clean"}';
    const r = scoreDiagramResolution("r5", raw, STD_RESOLVER_EXPECT);
    assert.equal(r.score, 1);
  });

  it("penalises fewer players than min_players", () => {
    const body = [
      "```json name=diagram-positions",
      '{"players":[{"role":"1","x":0,"y":24}],"actions":[],"notes":"clean"}',
      "```",
    ].join("\n");
    const r = scoreDiagramResolution("r6", body, STD_RESOLVER_EXPECT);
    assert.ok(r.failures.some((f) => f.kind === "min-players"));
    assert.ok(r.score < 1);
  });
});
