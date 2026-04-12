// Tests for the promotion pipeline: anonymization + PII check + merge/quarantine.
//
// Uses an in-memory PromoteIO adapter so tests don't touch the filesystem.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { promotePatch } from "../promote";
import type { PromoteIO } from "../promote";
import type {
  AnonymizeContext,
  AnnotationPatch,
  ExtensionPatch,
  NewPagePatch,
  WikiPatch,
} from "../types";

interface MemoryState {
  readonly pages: Map<string, string>;
  readonly quarantined: Map<string, { reason: string; patch: WikiPatch }>;
}

function makeIO(initial: Record<string, string> = {}): {
  io: PromoteIO;
  state: MemoryState;
} {
  const pages = new Map<string, string>(Object.entries(initial));
  const quarantined = new Map<
    string,
    { reason: string; patch: WikiPatch }
  >();
  const io: PromoteIO = {
    pageExists(slug) {
      return pages.has(slug);
    },
    readPage(slug) {
      const v = pages.get(slug);
      if (v == null) throw new Error(`missing ${slug}`);
      return v;
    },
    writePage(slug, body) {
      pages.set(slug, body);
      return `mem://${slug}`;
    },
    quarantine(patchId, reason, patch) {
      quarantined.set(patchId, { reason, patch });
      return `mem://_rejected/${patchId}`;
    },
  };
  return { io, state: { pages, quarantined } };
}

function baseCtx(overrides: Partial<AnonymizeContext> = {}): AnonymizeContext {
  return {
    teamNames: [],
    opponentNames: [],
    playerNames: [],
    coachNames: [],
    locations: [],
    dateWindowDays: 30,
    referenceDate: "2026-04-12T00:00:00.000Z",
    ...overrides,
  };
}

function baseSourceFields() {
  return {
    id: "patch-1",
    emittedAt: "2026-04-12T12:00:00.000Z",
    rationale: "test",
    source: {
      queryId: "q-1",
      coachId: "local",
      query: "test",
      answer: "test",
      citations: [],
      generatedAt: "2026-04-12T12:00:00.000Z",
    },
  } as const;
}

describe("promotePatch — happy paths", () => {
  it("merges an annotation onto an existing page", () => {
    const patch: AnnotationPatch = {
      ...baseSourceFields(),
      kind: "annotation",
      targetSlug: "zone-offense",
      note: "Against a 2-3, flash the high post first.",
    };
    const { io, state } = makeIO({
      "zone-offense": "# Zone offense\n\nBody.\n",
    });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    const body = state.pages.get("zone-offense") ?? "";
    assert.match(body, /Coach note/);
    assert.match(body, /flash the high post/);
  });

  it("merges an extension onto an existing page", () => {
    const patch: ExtensionPatch = {
      ...baseSourceFields(),
      kind: "extension",
      targetSlug: "zone-offense",
      sectionHeading: "## Coach Note",
      sectionBody: "Long-form tactical guidance goes here.",
    };
    const { io, state } = makeIO({
      "zone-offense": "# Zone offense\n\nBody.\n",
    });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    const body = state.pages.get("zone-offense") ?? "";
    assert.match(body, /## Coach Note/);
    assert.match(body, /Long-form tactical guidance/);
  });

  it("creates a new page for a new-page patch", () => {
    const patch: NewPagePatch = {
      ...baseSourceFields(),
      kind: "new-page",
      slug: "new-concept",
      body: "---\ntype: concept\n---\n# New concept\n",
    };
    const { io, state } = makeIO();
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    assert.ok(state.pages.has("new-concept"));
  });
});

describe("promotePatch — rejections", () => {
  it("scrubs phone numbers inline and merges the resulting patch", () => {
    // Phone regex is applied unconditionally by the scrubber AND by the
    // residual-PII check. A patch containing a phone should be scrubbed
    // to `[PHONE]` and merged (residual check then passes).
    const patch: AnnotationPatch = {
      ...baseSourceFields(),
      kind: "annotation",
      targetSlug: "zone-offense",
      note: "Call (555) 123-4567 to discuss.",
    };
    const { io, state } = makeIO({
      "zone-offense": "# Zone offense\n",
    });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    const merged = state.pages.get("zone-offense") ?? "";
    assert.ok(!/\(555\) 123-4567/.test(merged), "phone should be redacted");
    assert.match(merged, /\[PHONE\]/);
  });

  it("rejects new-page patches that clobber an existing slug", () => {
    const patch: NewPagePatch = {
      ...baseSourceFields(),
      kind: "new-page",
      slug: "zone-offense",
      body: "---\ntype: concept\n---\n# Zone offense\n",
    };
    const { io, state } = makeIO({
      "zone-offense": "# existing\n",
    });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "rejected-invalid");
    assert.match(result.reason ?? "", /existing slug/);
    assert.ok(state.quarantined.has(patch.id));
  });

  it("rejects extension patches pointing at a missing page", () => {
    const patch: ExtensionPatch = {
      ...baseSourceFields(),
      kind: "extension",
      targetSlug: "does-not-exist",
      sectionHeading: "## Coach Note",
      sectionBody: "hello",
    };
    const { io, state } = makeIO();
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "rejected-invalid");
    assert.match(result.reason ?? "", /missing page/);
    assert.ok(state.quarantined.has(patch.id));
  });

  it("anonymizes user-entered names before merging", () => {
    const patch: AnnotationPatch = {
      ...baseSourceFields(),
      kind: "annotation",
      targetSlug: "zone-offense",
      note: "Coach Smith at Lincoln HS said the flare screen works.",
    };
    const { io, state } = makeIO({ "zone-offense": "# zone\n" });
    const result = promotePatch(patch, {
      io,
      anonCtx: baseCtx({
        coachNames: ["Coach Smith"],
        teamNames: ["Lincoln HS"],
      }),
    });
    assert.equal(result.status, "merged");
    const body = state.pages.get("zone-offense") ?? "";
    assert.ok(!body.includes("Coach Smith"));
    assert.ok(!body.includes("Lincoln HS"));
    assert.match(body, /flare screen works/);
  });

  it("rejects via lint when lint callback returns a reason", () => {
    const patch: NewPagePatch = {
      ...baseSourceFields(),
      kind: "new-page",
      slug: "brand-new",
      body: "---\ntype: concept\n---\n# Brand new\n",
    };
    const { io, state } = makeIO();
    const result = promotePatch(patch, {
      io,
      anonCtx: baseCtx(),
      lint: () => "missing-sources",
    });
    assert.equal(result.status, "rejected-lint");
    assert.match(result.reason ?? "", /missing-sources/);
    assert.ok(state.quarantined.has(patch.id));
    assert.ok(!state.pages.has("brand-new"));
  });

  it("replaces email with [EMAIL] placeholder and does not flag placeholder as residual", () => {
    // Confirms gate ordering: scrub first, then residual check. A raw
    // email is replaced with the placeholder, which residual does NOT
    // match — so the patch merges cleanly.
    const patch: AnnotationPatch = {
      ...baseSourceFields(),
      kind: "annotation",
      targetSlug: "zone-offense",
      note: "Email coach@example.com for the playbook.",
    };
    const { io, state } = makeIO({ "zone-offense": "# zone\n" });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    const merged = state.pages.get("zone-offense") ?? "";
    assert.match(merged, /\[EMAIL\]/);
    assert.ok(!/coach@example\.com/.test(merged));
  });

  it("does not flag clean coaching text as residual PII", () => {
    // Negative case for the residual-PII gate: pristine coaching
    // content merges cleanly with no placeholder insertion.
    const patch: AnnotationPatch = {
      ...baseSourceFields(),
      kind: "annotation",
      targetSlug: "zone-offense",
      note: "Weak-side flare screen vs 2-3 zone.",
    };
    const { io, state } = makeIO({ "zone-offense": "# zone\n" });
    const result = promotePatch(patch, { io, anonCtx: baseCtx() });
    assert.equal(result.status, "merged");
    const merged = state.pages.get("zone-offense") ?? "";
    assert.match(merged, /flare screen/);
    assert.doesNotMatch(merged, /\[PHONE\]|\[EMAIL\]/);
  });
});
