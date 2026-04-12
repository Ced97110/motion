// Tests for src/lib/court/diagram-positions.ts
// Run: npx tsx --test src/lib/court/__tests__/diagram-positions.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractDiagramPositionsRaw,
  parseDiagramPositions,
  validateDiagramPositions,
  isProseDerived,
} from "../diagram-positions";

const SAMPLE_WIKI_PAGE = `---
type: play
category: offense
---

# 23 Flare

## Overview
A quick-hitter vs zone defense.

\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":24},{"role":"2","x":18,"y":22},{"role":"3","x":-18,"y":22},{"role":"4","x":-22,"y":42},{"role":"5","x":-8,"y":29}],"actions":[{"from":"1","to":"2","type":"pass"}],"notes":"Figure 7.49"}
\`\`\`

## Phases
...
`;

const WIKI_PAGE_NO_DIAGRAM = `---
type: play
---

# No Diagram Play

## Overview
Just prose.
`;

const WIKI_PAGE_PROSE_DERIVED = `---
type: play
---

# Prose Only

\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":24}],"actions":[],"notes":"The attached PDF page contains only coaching text — no basketball court diagram is present. Positions have been inferred entirely from the wiki prose."}
\`\`\`
`;

describe("extractDiagramPositionsRaw", () => {
  it("returns the raw JSON when a valid fence is present", () => {
    const raw = extractDiagramPositionsRaw(SAMPLE_WIKI_PAGE);
    assert.ok(raw !== null, "expected raw JSON to be returned");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.players.length, 5);
    assert.equal(parsed.players[0].role, "1");
    assert.equal(parsed.notes, "Figure 7.49");
  });

  it("returns null when no diagram-positions fence is present", () => {
    assert.equal(extractDiagramPositionsRaw(WIKI_PAGE_NO_DIAGRAM), null);
  });

  it("returns null when the fence contains malformed JSON", () => {
    const bad = "```json name=diagram-positions\n{not valid}\n```";
    assert.equal(extractDiagramPositionsRaw(bad), null);
  });

  it("ignores fenced JSON that is not the diagram-positions block", () => {
    const other = "```json name=other-thing\n{\"foo\":1}\n```";
    assert.equal(extractDiagramPositionsRaw(other), null);
  });

  it("picks only the first occurrence if multiple fences exist", () => {
    const multi = `\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":0}],"actions":[]}
\`\`\`

\`\`\`json name=diagram-positions
{"players":[{"role":"2","x":1,"y":1}],"actions":[]}
\`\`\`
`;
    const raw = extractDiagramPositionsRaw(multi);
    assert.ok(raw !== null);
    assert.ok(raw.includes('"role":"1"'));
    assert.ok(!raw.includes('"role":"2"'));
  });
});

describe("parseDiagramPositions", () => {
  it("parses a valid block into typed players + actions", () => {
    const d = parseDiagramPositions(SAMPLE_WIKI_PAGE);
    assert.ok(d !== null);
    assert.equal(d.players.length, 5);
    assert.deepEqual(d.players[0], { role: "1", x: 0, y: 24 });
    assert.equal(d.actions.length, 1);
    assert.equal(d.actions[0].type, "pass");
    assert.equal(d.notes, "Figure 7.49");
  });

  it("returns null when no block is present", () => {
    assert.equal(parseDiagramPositions(WIKI_PAGE_NO_DIAGRAM), null);
  });

  it("filters out malformed player entries", () => {
    const body = `\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":0},{"role":"bad"},{"x":1,"y":1},{"role":"2","x":5,"y":5}],"actions":[]}
\`\`\``;
    const d = parseDiagramPositions(body);
    assert.ok(d !== null);
    assert.equal(d.players.length, 2);
    assert.deepEqual(d.players.map((p) => p.role).sort(), ["1", "2"]);
  });

  it("tolerates a missing actions array", () => {
    const body = `\`\`\`json name=diagram-positions
{"players":[{"role":"1","x":0,"y":0}]}
\`\`\``;
    const d = parseDiagramPositions(body);
    assert.ok(d !== null);
    assert.equal(d.actions.length, 0);
  });
});

describe("validateDiagramPositions", () => {
  it("returns no issues for a clean diagram", () => {
    const d = parseDiagramPositions(SAMPLE_WIKI_PAGE);
    assert.ok(d !== null);
    assert.deepEqual(validateDiagramPositions(d), []);
  });

  it("flags out-of-viewBox coordinates", () => {
    const d = {
      players: [
        { role: "1", x: 100, y: 0 },
        { role: "2", x: 0, y: -50 },
      ],
      actions: [],
    };
    const issues = validateDiagramPositions(d);
    assert.equal(issues.length, 2);
    assert.ok(issues.every((i) => i.kind === "out-of-viewbox"));
  });

  it("flags duplicate roles", () => {
    const d = {
      players: [
        { role: "1", x: 0, y: 0 },
        { role: "1", x: 5, y: 5 },
      ],
      actions: [],
    };
    const issues = validateDiagramPositions(d);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "duplicate-role");
  });

  it("flags non-finite coordinates", () => {
    const d = {
      players: [{ role: "1", x: NaN, y: 0 }],
      actions: [],
    };
    const issues = validateDiagramPositions(d);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "invalid-coord");
  });

  it("flags an empty players array", () => {
    const issues = validateDiagramPositions({ players: [], actions: [] });
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "no-players");
  });
});

describe("isProseDerived", () => {
  it("detects prose-fallback notes from the resolver", () => {
    const d = parseDiagramPositions(WIKI_PAGE_PROSE_DERIVED);
    assert.ok(d !== null);
    assert.equal(isProseDerived(d), true);
  });

  it("returns false when notes cite an actual figure", () => {
    const d = parseDiagramPositions(SAMPLE_WIKI_PAGE);
    assert.ok(d !== null);
    assert.equal(isProseDerived(d), false);
  });

  it("returns false when notes are absent", () => {
    const d = { players: [{ role: "1", x: 0, y: 0 }], actions: [] };
    assert.equal(isProseDerived(d), false);
  });
});
