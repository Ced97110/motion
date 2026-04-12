// Pure-function emitter: turns a (query, answer, citations) tuple into
// zero-or-more patch proposals. No I/O, no side effects, deterministic
// given identical input (modulo the caller-supplied timestamp/id).
//
// Rules of thumb (intentionally conservative to keep lint noise low):
//   1. If the answer cites >= 1 existing page AND is short (<= 600 chars),
//      emit ONE annotation patch targeted at the first citation.
//   2. If the answer cites >= 1 existing page AND is long (> 600 chars),
//      emit ONE extension patch on the first citation (new "## Coach Note"
//      section) rather than creating a new page.
//   3. If the answer cites ZERO pages AND is substantive (>= 200 chars),
//      emit ONE new-page patch. This is the "compounding" case — novel
//      coaching insight becomes a new canonical page.
//   4. Otherwise, emit no patches (query was trivial or empty answer).

import type {
  AnnotationPatch,
  ExtensionPatch,
  NewPagePatch,
  PatchSource,
  WikiPatch,
} from "./types";

const ANNOTATION_MAX_CHARS = 600;
const NEW_PAGE_MIN_CHARS = 200;
const ANNOTATION_NOTE_MAX = 280;

/** Deterministic id for a patch given its source and emit timestamp. */
function makePatchId(source: PatchSource, emittedAt: string): string {
  // Short stable id — `queryId` is already unique per query; the suffix
  // lets a single query emit multiple patches without collision.
  return `${source.queryId}-${emittedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

/** Normalize a free-text query into a kebab-case slug proposal. */
export function slugifyQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join("-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Build YAML frontmatter + body for a new concept page. */
function buildNewPageBody(source: PatchSource, title: string): string {
  const date = source.generatedAt.slice(0, 10);
  const frontmatter = [
    "---",
    "type: concept",
    "level: intermediate",
    "tags: [coach-captured]",
    "source_count: 0",
    `last_updated: ${date}`,
    `origin: coach-query`,
    `origin_query_id: ${source.queryId}`,
    "---",
    "",
  ].join("\n");

  const body = [
    `# ${title}`,
    "",
    "## Summary",
    source.answer.trim(),
    "",
    "## Origin",
    `Captured from coach query on ${date}.`,
    "",
    "## Related Concepts",
    "<!-- lint: add at least 2 [[slug]] links before promotion -->",
    "",
    "## Sources",
    "<!-- lint: cite supporting source(s) before promotion -->",
    "",
  ].join("\n");

  return frontmatter + body;
}

/** Pretty-case the first few words of a query as a page title. */
function queryToTitle(query: string): string {
  const words = query
    .replace(/[?.!]+$/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8);
  return words
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Emit patch proposals for a Q+A event.
 * Pure function: no I/O, no mutation of input, deterministic.
 */
export function emitPatch(source: PatchSource): WikiPatch[] {
  const answer = source.answer.trim();
  if (answer.length === 0) return [];

  const baseFields = {
    id: makePatchId(source, source.generatedAt),
    source,
    emittedAt: source.generatedAt,
  };

  // Rule 1 + 2: answer leaned on existing canonical pages.
  if (source.citations.length > 0) {
    const targetSlug = source.citations[0].slug;

    if (answer.length <= ANNOTATION_MAX_CHARS) {
      const note = answer.slice(0, ANNOTATION_NOTE_MAX);
      const patch: AnnotationPatch = {
        ...baseFields,
        kind: "annotation",
        targetSlug,
        note,
        rationale: `Short answer citing [[${targetSlug}]]; attach as annotation.`,
      };
      return [patch];
    }

    const patch: ExtensionPatch = {
      ...baseFields,
      kind: "extension",
      targetSlug,
      sectionHeading: "## Coach Note",
      sectionBody: answer,
      rationale: `Long answer citing [[${targetSlug}]]; append as extension section.`,
    };
    return [patch];
  }

  // Rule 3: no citations + substantive answer → propose a new page.
  if (answer.length >= NEW_PAGE_MIN_CHARS) {
    const slug = slugifyQuery(source.query);
    if (slug.length === 0) return [];
    const title = queryToTitle(source.query);
    const patch: NewPagePatch = {
      ...baseFields,
      kind: "new-page",
      slug,
      body: buildNewPageBody(source, title),
      rationale: "Uncited substantive answer; propose new canonical page.",
    };
    return [patch];
  }

  // Rule 4: trivial answer, no citations — drop on the floor.
  return [];
}
