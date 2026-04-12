// Tests for src/lib/fidelity/score.ts
// Run: npx tsx --test src/lib/fidelity/__tests__/score.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeFidelity } from "../score";

const GOOD_DIAGRAM_BODY = `---
type: play
source_count: 2
---

# Play

\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":18,"y":22},{"role":"3","x":-18,"y":22},{"role":"4","x":-22,"y":42},{"role":"5","x":-8,"y":29}],"actions":[{"from":"1","to":"2","type":"pass"}],"notes":"Extracted from Figure 7.49, p.33."}
\`\`\`
`;

const PROSE_DERIVED_BODY = `---
type: play
---

# Play

\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":18,"y":22}],"actions":[],"notes":"Reconstructed from prose — no diagram present on the cited page."}
\`\`\`
`;

const INVALID_DIAGRAM_BODY = `---
type: play
---

# Play

\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":99,"y":99},{"role":"1","x":0,"y":0}],"actions":[],"notes":"From Figure 1."}
\`\`\`
`;

const NO_DIAGRAM_BODY = `---
type: play
---

# Play

Just prose, no diagram block.
`;

describe("computeFidelity", () => {
  it("awards a perfect 1.0 when every signal is present", () => {
    const r = computeFidelity({
      slug: "perfect",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: GOOD_DIAGRAM_BODY,
      sourceCount: 3,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    assert.equal(r.score, 1.0);
    assert.equal(r.breakdown.diagram_grounded, 0.3);
    assert.equal(r.breakdown.diagram_validates, 0.2);
    assert.equal(r.breakdown.revalidates, 0.2);
    assert.equal(r.breakdown.has_sources, 0.1);
    assert.equal(r.breakdown.has_semantic, 0.1);
    assert.equal(r.breakdown.not_quarantined, 0.1);
  });

  it("returns 0.1 (only not_quarantined) for a registered play with no wiki", () => {
    const r = computeFidelity({
      slug: "weakside-flare-slip",
      hasRegisteredPlay: true,
      hasWikiPage: false,
    });
    assert.equal(r.score, 0.1);
    assert.equal(r.breakdown.diagram_grounded, 0);
    assert.equal(r.breakdown.diagram_validates, 0);
    assert.ok(r.reasons.some((s) => s.includes("no wiki page")));
  });

  it("withholds diagram bonuses when the block is prose-derived", () => {
    const r = computeFidelity({
      slug: "prose",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: PROSE_DERIVED_BODY,
      sourceCount: 1,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    // 0 diagram + 0.20 revalidates + 0 sources + 0.10 semantic + 0.10 not-quarantined
    assert.equal(r.score, 0.4);
    assert.equal(r.breakdown.diagram_grounded, 0);
    assert.equal(r.breakdown.diagram_validates, 0);
  });

  it("awards diagram_grounded but withholds diagram_validates when block has issues", () => {
    const r = computeFidelity({
      slug: "bad-coords",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: INVALID_DIAGRAM_BODY,
      sourceCount: 2,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    assert.equal(r.breakdown.diagram_grounded, 0.3);
    assert.equal(r.breakdown.diagram_validates, 0);
    // 0.30 + 0 + 0.20 + 0.10 + 0.10 + 0.10 = 0.80
    assert.equal(r.score, 0.8);
  });

  it("drops the not_quarantined bonus when the play is quarantined", () => {
    const r = computeFidelity({
      slug: "quarantined",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: GOOD_DIAGRAM_BODY,
      sourceCount: 2,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: true,
    });
    assert.equal(r.breakdown.not_quarantined, 0);
    assert.equal(r.score, 0.9);
  });

  it("drops has_semantic bonus when no *Semantic export is present", () => {
    const r = computeFidelity({
      slug: "hand-authored",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: GOOD_DIAGRAM_BODY,
      sourceCount: 2,
      revalidates: true,
      hasSemanticExport: false,
      isQuarantined: false,
    });
    assert.equal(r.breakdown.has_semantic, 0);
    assert.equal(r.score, 0.9);
  });

  it("drops has_sources bonus when source_count < 2", () => {
    const r = computeFidelity({
      slug: "single-source",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: GOOD_DIAGRAM_BODY,
      sourceCount: 1,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    assert.equal(r.breakdown.has_sources, 0);
    assert.equal(r.score, 0.9);
  });

  it("drops revalidates bonus when revalidator fails", () => {
    const r = computeFidelity({
      slug: "stale",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: GOOD_DIAGRAM_BODY,
      sourceCount: 2,
      revalidates: false,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    assert.equal(r.breakdown.revalidates, 0);
    assert.equal(r.score, 0.8);
    assert.ok(r.reasons.some((s) => s.includes("revalidator fails")));
  });

  it("withholds diagram bonuses when wiki body has no diagram block", () => {
    const r = computeFidelity({
      slug: "no-block",
      hasRegisteredPlay: true,
      hasWikiPage: true,
      wikiBody: NO_DIAGRAM_BODY,
      sourceCount: 2,
      revalidates: true,
      hasSemanticExport: true,
      isQuarantined: false,
    });
    assert.equal(r.breakdown.diagram_grounded, 0);
    assert.equal(r.breakdown.diagram_validates, 0);
    // 0 + 0 + 0.20 + 0.10 + 0.10 + 0.10 = 0.50
    assert.equal(r.score, 0.5);
  });

  it("clamps to [0, 1] and returns a reasons array", () => {
    const r = computeFidelity({
      slug: "minimal",
      hasRegisteredPlay: false,
      hasWikiPage: false,
    });
    assert.ok(r.score >= 0 && r.score <= 1);
    assert.ok(Array.isArray(r.reasons));
    assert.ok(r.reasons.length > 0);
  });
});
