// Promotion pipeline: run a patch through anonymization + PII check,
// then apply it to the wiki (new page / extension / annotation) or
// quarantine it with a reason file.
//
// I/O is isolated in a thin `PromoteIO` interface so the pure logic
// can be tested without touching the filesystem.

import type {
  PromotionResult,
  WikiPatch,
  AnnotationPatch,
  ExtensionPatch,
  NewPagePatch,
  AnonymizeContext,
} from "./types";
import { anonymize, findResidualPII } from "./anonymize";

export interface PromoteIO {
  /** Return true if the wiki page exists. */
  pageExists(slug: string): boolean;
  /** Read page body (with frontmatter). Throws if missing. */
  readPage(slug: string): string;
  /** Write page body (overwrite). */
  writePage(slug: string, body: string): string;
  /** Quarantine a rejected patch with a reason. Returns reason-file path. */
  quarantine(patchId: string, reason: string, patch: WikiPatch): string;
}

/** Optional extra lint callback (e.g. invoke the lint-wiki CLI). */
export type LintFn = (slug: string, body: string) => string | null;

export interface PromoteOptions {
  readonly anonCtx: AnonymizeContext;
  readonly io: PromoteIO;
  /** Optional lint; return null if OK, or a reason string to reject. */
  readonly lint?: LintFn;
}

/** Apply anonymization in-place on a patch, returning a new patch. */
export function anonymizePatch(
  patch: WikiPatch,
  ctx: AnonymizeContext,
): { patch: WikiPatch; removed: string[] } {
  const allRemoved: string[] = [];
  const scrub = (s: string): string => {
    const r = anonymize(s, ctx);
    allRemoved.push(...r.removed);
    return r.text;
  };

  switch (patch.kind) {
    case "new-page": {
      const next: NewPagePatch = { ...patch, body: scrub(patch.body) };
      return { patch: next, removed: allRemoved };
    }
    case "extension": {
      const next: ExtensionPatch = {
        ...patch,
        sectionBody: scrub(patch.sectionBody),
      };
      return { patch: next, removed: allRemoved };
    }
    case "annotation": {
      const next: AnnotationPatch = { ...patch, note: scrub(patch.note) };
      return { patch: next, removed: allRemoved };
    }
  }
}

/** Return combined text content of a patch (for residual-PII scan). */
function patchText(patch: WikiPatch): string {
  switch (patch.kind) {
    case "new-page":
      return patch.body;
    case "extension":
      return `${patch.sectionHeading}\n${patch.sectionBody}`;
    case "annotation":
      return patch.note;
  }
}

function mergeExtension(existing: string, patch: ExtensionPatch): string {
  const sep = existing.endsWith("\n") ? "" : "\n";
  return `${existing}${sep}\n${patch.sectionHeading}\n\n${patch.sectionBody}\n`;
}

function mergeAnnotation(existing: string, patch: AnnotationPatch): string {
  const sep = existing.endsWith("\n") ? "" : "\n";
  const stamp = patch.emittedAt.slice(0, 10);
  return `${existing}${sep}\n> **Coach note** (${stamp}): ${patch.note}\n`;
}

/** Promote a single patch. Never throws; returns a structured result. */
export function promotePatch(
  patch: WikiPatch,
  opts: PromoteOptions,
): PromotionResult {
  try {
    const { patch: scrubbed } = anonymizePatch(patch, opts.anonCtx);
    const residual = findResidualPII(patchText(scrubbed));
    if (residual.length > 0) {
      const reason = `PII residual after scrub: ${residual.join(", ")}`;
      const outputPath = opts.io.quarantine(patch.id, reason, patch);
      return {
        patchId: patch.id,
        status: "rejected-pii",
        reason,
        outputPath,
      };
    }

    if (opts.lint != null) {
      const targetSlug =
        scrubbed.kind === "new-page" ? scrubbed.slug : scrubbed.targetSlug;
      const body =
        scrubbed.kind === "new-page"
          ? scrubbed.body
          : opts.io.pageExists(targetSlug)
            ? opts.io.readPage(targetSlug)
            : "";
      const lintErr = opts.lint(targetSlug, body);
      if (lintErr != null) {
        const reason = `Lint failed: ${lintErr}`;
        const outputPath = opts.io.quarantine(patch.id, reason, patch);
        return {
          patchId: patch.id,
          status: "rejected-lint",
          reason,
          outputPath,
        };
      }
    }

    switch (scrubbed.kind) {
      case "new-page": {
        if (opts.io.pageExists(scrubbed.slug)) {
          const reason = `New-page patch targets existing slug "${scrubbed.slug}"`;
          const outputPath = opts.io.quarantine(patch.id, reason, patch);
          return {
            patchId: patch.id,
            status: "rejected-invalid",
            reason,
            outputPath,
          };
        }
        const path = opts.io.writePage(scrubbed.slug, scrubbed.body);
        return { patchId: patch.id, status: "merged", outputPath: path };
      }
      case "extension": {
        if (!opts.io.pageExists(scrubbed.targetSlug)) {
          const reason = `Extension patch targets missing page "${scrubbed.targetSlug}"`;
          const outputPath = opts.io.quarantine(patch.id, reason, patch);
          return {
            patchId: patch.id,
            status: "rejected-invalid",
            reason,
            outputPath,
          };
        }
        const existing = opts.io.readPage(scrubbed.targetSlug);
        const merged = mergeExtension(existing, scrubbed);
        const path = opts.io.writePage(scrubbed.targetSlug, merged);
        return { patchId: patch.id, status: "merged", outputPath: path };
      }
      case "annotation": {
        if (!opts.io.pageExists(scrubbed.targetSlug)) {
          const reason = `Annotation patch targets missing page "${scrubbed.targetSlug}"`;
          const outputPath = opts.io.quarantine(patch.id, reason, patch);
          return {
            patchId: patch.id,
            status: "rejected-invalid",
            reason,
            outputPath,
          };
        }
        const existing = opts.io.readPage(scrubbed.targetSlug);
        const merged = mergeAnnotation(existing, scrubbed);
        const path = opts.io.writePage(scrubbed.targetSlug, merged);
        return { patchId: patch.id, status: "merged", outputPath: path };
      }
    }
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "unknown promotion error";
    const outputPath = opts.io.quarantine(patch.id, msg, patch);
    return {
      patchId: patch.id,
      status: "rejected-invalid",
      reason: msg,
      outputPath,
    };
  }
}
