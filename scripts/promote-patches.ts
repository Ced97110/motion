// CLI: scan `knowledge-base/wiki/_pending/` for JSON patch files,
// run each through anonymization + promotion, and either merge into
// the wiki or quarantine into `_pending/_rejected/`.
//
// Usage:
//   npx tsx scripts/promote-patches.ts [--dry-run]
//
// Exits non-zero only on catastrophic I/O failure. Normal rejections
// are reported on stderr but do not fail the run.

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnonymizeContext,
  PromotionResult,
  WikiPatch,
} from "../src/lib/wiki/types";
import { promotePatch, type PromoteIO, type LintFn } from "../src/lib/wiki/promote";

const PENDING_DIR = path.join(
  process.cwd(),
  "knowledge-base",
  "wiki",
  "_pending",
);
const REJECTED_DIR = path.join(PENDING_DIR, "_rejected");
const WIKI_DIR = path.join(process.cwd(), "knowledge-base", "wiki");
const LINT_SCRIPT = path.join(process.cwd(), "scripts", "lint-wiki.ts");

interface CliArgs {
  readonly dryRun: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  return { dryRun: argv.includes("--dry-run") };
}

/** Minimal shape-check for a WikiPatch loaded from JSON. */
function isWikiPatch(v: unknown): v is WikiPatch {
  if (typeof v !== "object" || v == null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.id !== "string") return false;
  if (typeof obj.emittedAt !== "string") return false;
  if (typeof obj.source !== "object" || obj.source == null) return false;
  const kind = obj.kind;
  if (kind === "new-page") {
    return typeof obj.slug === "string" && typeof obj.body === "string";
  }
  if (kind === "extension") {
    return (
      typeof obj.targetSlug === "string" &&
      typeof obj.sectionHeading === "string" &&
      typeof obj.sectionBody === "string"
    );
  }
  if (kind === "annotation") {
    return typeof obj.targetSlug === "string" && typeof obj.note === "string";
  }
  return false;
}

/** Load all *.json patches from PENDING_DIR (non-recursive). */
function loadPatches(): WikiPatch[] {
  if (!fs.existsSync(PENDING_DIR)) return [];
  const out: WikiPatch[] = [];
  for (const entry of fs.readdirSync(PENDING_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json")) continue;
    const full = path.join(PENDING_DIR, entry.name);
    try {
      const raw = fs.readFileSync(full, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (isWikiPatch(parsed)) {
        out.push(parsed);
      } else {
        console.warn(`[warn] skipping malformed patch ${entry.name}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[warn] failed to read ${entry.name}: ${msg}`);
    }
  }
  return out;
}

/** Default anonymization context — per-coach inputs stubbed for scaffold. */
function defaultAnonCtx(): AnonymizeContext {
  return {
    teamNames: [],
    opponentNames: [],
    playerNames: [],
    coachNames: [],
    locations: [],
    dateWindowDays: 30,
    referenceDate: new Date().toISOString(),
  };
}

/** Real filesystem IO adapter. */
function makeIO(dryRun: boolean): PromoteIO {
  return {
    pageExists(slug) {
      return fs.existsSync(path.join(WIKI_DIR, `${slug}.md`));
    },
    readPage(slug) {
      return fs.readFileSync(path.join(WIKI_DIR, `${slug}.md`), "utf-8");
    },
    writePage(slug, body) {
      const full = path.join(WIKI_DIR, `${slug}.md`);
      if (!dryRun) fs.writeFileSync(full, body, "utf-8");
      return full;
    },
    quarantine(patchId, reason, patch) {
      if (!dryRun && !fs.existsSync(REJECTED_DIR)) {
        fs.mkdirSync(REJECTED_DIR, { recursive: true });
      }
      const reasonPath = path.join(REJECTED_DIR, `${patchId}.reason.md`);
      const patchPath = path.join(REJECTED_DIR, `${patchId}.patch.json`);
      const body = [
        `# Patch ${patchId} rejected`,
        "",
        `**Reason:** ${reason}`,
        "",
        `**Kind:** ${patch.kind}`,
        `**Query ID:** ${patch.source.queryId}`,
        `**Emitted:** ${patch.emittedAt}`,
        "",
      ].join("\n");
      if (!dryRun) {
        fs.writeFileSync(reasonPath, body, "utf-8");
        fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2), "utf-8");
      }
      return reasonPath;
    },
  };
}

/** Wrap `lint-wiki.ts` if it exists; otherwise no-op. */
function maybeLint(): LintFn | undefined {
  if (!fs.existsSync(LINT_SCRIPT)) return undefined;
  // The scaffold does not invoke the lint subprocess directly — another
  // workstream owns `lint-wiki.ts`. Skip here; production can wire this
  // to spawn the lint CLI once it exists.
  return undefined;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(PENDING_DIR)) {
    console.log(`[ok] nothing to do: ${PENDING_DIR} does not exist.`);
    process.exit(0);
  }

  const patches = loadPatches();
  if (patches.length === 0) {
    console.log("[ok] no pending patches found.");
    process.exit(0);
  }

  const io = makeIO(args.dryRun);
  const lint = maybeLint();
  const anonCtx = defaultAnonCtx();

  const results: PromotionResult[] = [];
  for (const patch of patches) {
    const result = promotePatch(patch, { io, anonCtx, lint });
    results.push(result);
    const tag = result.status === "merged" ? "✓" : "✗";
    const label = args.dryRun ? `[dry-run] ${tag}` : tag;
    console.log(
      `${label} ${patch.id} → ${result.status}${result.reason != null ? ` (${result.reason})` : ""}`,
    );

    // On successful merge, remove the pending file unless dry-run.
    if (result.status === "merged" && !args.dryRun) {
      const pendingPath = path.join(PENDING_DIR, `${patch.id}.json`);
      if (fs.existsSync(pendingPath)) {
        fs.unlinkSync(pendingPath);
      }
    }
  }

  const merged = results.filter((r) => r.status === "merged").length;
  const rejected = results.length - merged;
  console.log(
    `[summary] ${merged} merged, ${rejected} rejected (of ${results.length} total).`,
  );
  process.exit(0);
}

main();
