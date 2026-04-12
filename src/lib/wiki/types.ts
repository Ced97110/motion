// Types for the compounding-query-capture pipeline.
//
// A "patch" is a proposed modification to the wiki derived from a coach's
// query and the AI's answer. Patches are immutable proposals; they must
// pass anonymization + lint gates before being merged into the wiki.
//
// Contract: every field is explicitly typed. No `any`. Patches are pure
// data — no methods, no I/O. The emitter, anonymizer, and promotion
// pipeline all operate on these shapes.

/** Citation back into the canonical wiki that an AI answer leaned on. */
export interface WikiCitation {
  /** Slug of the cited wiki page (no `.md`, e.g. `"zone-offense-principles"`). */
  readonly slug: string;
  /** Optional range/quote excerpt from the page used in the answer. */
  readonly excerpt?: string;
}

/** The raw Q+A event that produced a patch proposal. */
export interface PatchSource {
  /** Opaque query id (ULID/UUID). Stable for dedupe. */
  readonly queryId: string;
  /** Coach identifier. For the scaffold this is always `"local"`. */
  readonly coachId: string;
  /** The coach's original natural-language question. */
  readonly query: string;
  /** The AI-generated answer (post-generation, pre-anonymization). */
  readonly answer: string;
  /** Wiki pages the answer cited. Empty array allowed but discouraged. */
  readonly citations: readonly WikiCitation[];
  /** ISO-8601 timestamp when the answer was generated. */
  readonly generatedAt: string;
}

/**
 * Kinds of patch an emitter can propose:
 *   - `new-page`       → create a brand-new wiki page (novel concept)
 *   - `extension`      → append a section to an existing page
 *   - `annotation`     → inline note on an existing page (coach-specific POV)
 */
export type PatchKind = "new-page" | "extension" | "annotation";

/** Base fields shared by every patch variant. */
interface WikiPatchBase {
  /** Unique patch id; used as filename stem in `_pending/`. */
  readonly id: string;
  /** Originating query/answer payload. */
  readonly source: PatchSource;
  /** ISO-8601 when the patch was emitted. */
  readonly emittedAt: string;
  /** Human-readable rationale from the emitter. */
  readonly rationale: string;
}

/** Proposal to create a brand-new wiki page. */
export interface NewPagePatch extends WikiPatchBase {
  readonly kind: "new-page";
  /** Kebab-case slug (no `.md`). */
  readonly slug: string;
  /** Full page body including YAML frontmatter. */
  readonly body: string;
}

/** Proposal to append a new section to an existing wiki page. */
export interface ExtensionPatch extends WikiPatchBase {
  readonly kind: "extension";
  /** Target page slug. */
  readonly targetSlug: string;
  /** Markdown heading for the new section (e.g. `"## Coach Note"`). */
  readonly sectionHeading: string;
  /** Markdown body appended under the heading. */
  readonly sectionBody: string;
}

/** Proposal to attach a short annotation to an existing wiki page. */
export interface AnnotationPatch extends WikiPatchBase {
  readonly kind: "annotation";
  readonly targetSlug: string;
  /** Short (< 280 char) commentary. */
  readonly note: string;
}

/** Discriminated union of all patch variants. */
export type WikiPatch = NewPagePatch | ExtensionPatch | AnnotationPatch;

/** Context the anonymizer needs to scrub user-entered sensitive names. */
export interface AnonymizeContext {
  /** User-entered team names to strip (e.g. `["Lincoln HS"]`). */
  readonly teamNames: readonly string[];
  /** User-entered opponent names (e.g. `["Washington Prep"]`). */
  readonly opponentNames: readonly string[];
  /** Player names (first+last, first, or last) to strip. */
  readonly playerNames: readonly string[];
  /** Coach names (first+last). */
  readonly coachNames: readonly string[];
  /** Locations/venues (cities, gyms). */
  readonly locations: readonly string[];
  /** Optional window (days). Dates within +/- this many days of `referenceDate` are stripped. Default 30. */
  readonly dateWindowDays?: number;
  /** Reference date (ISO-8601) for relative date scrubbing. Defaults to `new Date()`. */
  readonly referenceDate?: string;
}

/** Outcome of feeding one patch through the promotion pipeline. */
export type PromotionStatus =
  | "merged"
  | "rejected-lint"
  | "rejected-pii"
  | "rejected-invalid";

/** Result record for a single patch promotion attempt. */
export interface PromotionResult {
  readonly patchId: string;
  readonly status: PromotionStatus;
  /** Path written (merged patches) or reason-file path (rejected patches). */
  readonly outputPath?: string;
  /** Human-readable reason for non-merged statuses. */
  readonly reason?: string;
}
