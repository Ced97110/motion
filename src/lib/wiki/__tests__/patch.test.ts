// Tests for the patch emitter. Uses node:test (zero-dep).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emitPatch, slugifyQuery } from "../patch";
import type { PatchSource } from "../types";

function makeSource(overrides: Partial<PatchSource> = {}): PatchSource {
  return {
    queryId: "q-abc",
    coachId: "local",
    query: "how do I break a 2-3 zone",
    answer:
      "Flash the high post to the free-throw line and look opposite for weak-side flare action.",
    citations: [],
    generatedAt: "2026-04-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("slugifyQuery", () => {
  it("kebab-cases and strips punctuation", () => {
    assert.equal(
      slugifyQuery("How do I beat a 2-3 zone?!"),
      "how-do-i-beat-a-2-3-zone",
    );
  });

  it("caps slug at 8 words", () => {
    const slug = slugifyQuery(
      "one two three four five six seven eight nine ten",
    );
    assert.equal(slug.split("-").length, 8);
  });

  it("returns empty string for whitespace-only input", () => {
    assert.equal(slugifyQuery("   "), "");
  });
});

describe("emitPatch", () => {
  it("returns no patches for an empty answer", () => {
    const patches = emitPatch(makeSource({ answer: "" }));
    assert.equal(patches.length, 0);
  });

  it("returns no patches for a trivial uncited answer", () => {
    const patches = emitPatch(makeSource({ answer: "yes.", citations: [] }));
    assert.equal(patches.length, 0);
  });

  it("emits annotation when answer is short AND cites a page", () => {
    const patches = emitPatch(
      makeSource({
        answer: "Switch the on-ball screen and tag the roller.",
        citations: [{ slug: "ball-screen-defense" }],
      }),
    );
    assert.equal(patches.length, 1);
    const p = patches[0];
    assert.equal(p.kind, "annotation");
    if (p.kind !== "annotation") throw new Error("type narrow");
    assert.equal(p.targetSlug, "ball-screen-defense");
    assert.match(p.note, /switch/i);
  });

  it("emits extension when answer is long AND cites a page", () => {
    const longAnswer = "A".repeat(700);
    const patches = emitPatch(
      makeSource({
        answer: longAnswer,
        citations: [{ slug: "zone-offense" }],
      }),
    );
    assert.equal(patches.length, 1);
    const p = patches[0];
    assert.equal(p.kind, "extension");
    if (p.kind !== "extension") throw new Error("type narrow");
    assert.equal(p.targetSlug, "zone-offense");
    assert.equal(p.sectionHeading, "## Coach Note");
  });

  it("emits new-page when answer is substantive and has no citations", () => {
    const patches = emitPatch(
      makeSource({
        answer:
          "Run weak-side flare action when the nail defender overcommits; the 5 steps up to screen the 3, and the 2 relocates to the corner for the skip pass. This creates a catch-and-shoot look against zone.".repeat(
            2,
          ),
        citations: [],
      }),
    );
    assert.equal(patches.length, 1);
    const p = patches[0];
    assert.equal(p.kind, "new-page");
    if (p.kind !== "new-page") throw new Error("type narrow");
    assert.match(p.slug, /^[a-z0-9-]+$/);
    assert.match(p.body, /^---\ntype: concept/);
    assert.match(p.body, /## Summary/);
    assert.match(p.body, /## Sources/);
  });

  it("produces a stable patch id given stable input", () => {
    const a = emitPatch(makeSource())[0];
    const b = emitPatch(makeSource())[0];
    // Empty inputs; neither will emit — adjust to substantive no-cite.
    const src = makeSource({
      answer: "X".repeat(250),
    });
    const c = emitPatch(src)[0];
    const d = emitPatch(src)[0];
    assert.equal(a, undefined);
    assert.equal(b, undefined);
    assert.equal(c.id, d.id);
  });
});
