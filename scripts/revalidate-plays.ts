// Re-validate every registered play's embedded semantic form against the
// current synthesizer rules. Closes the drift gap where a play file written
// under an older validator can stay in the registry indefinitely even after
// the rules tighten. Invoke: `npm run synthesize:revalidate`.
//
// Exit code 0 on clean run, 1 if any play fails validation. Suitable as a CI
// gate. Also exported so the synthesis pipeline can call it post-write.

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { validateSemanticPlay } from "../src/lib/court/synthesize";
import type { SemanticPlay } from "../src/lib/court/synthesize";

const PLAYS_TS_DIR = path.join(process.cwd(), "src", "data", "plays");
const REVIEW_DIR = path.join(PLAYS_TS_DIR, "_review");

export interface RevalidateResult {
  slug: string;
  status: "pass" | "fail" | "no-semantic";
  errors: string[];
}

function isSemanticPlay(value: unknown): value is SemanticPlay {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.players === "object" &&
    Array.isArray(v.phases)
  );
}

async function loadSemantic(filePath: string): Promise<SemanticPlay | null> {
  const mod = (await import(pathToFileURL(filePath).href)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(mod)) {
    if (key.endsWith("Semantic") && isSemanticPlay(value)) {
      return value;
    }
  }
  return null;
}

export async function revalidateAllPlays(): Promise<RevalidateResult[]> {
  if (!fs.existsSync(PLAYS_TS_DIR)) return [];
  const files = fs
    .readdirSync(PLAYS_TS_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .sort();

  const results: RevalidateResult[] = [];
  for (const file of files) {
    const slug = file.replace(/\.ts$/, "");
    const filePath = path.join(PLAYS_TS_DIR, file);
    try {
      const semantic = await loadSemantic(filePath);
      if (!semantic) {
        results.push({ slug, status: "no-semantic", errors: [] });
        continue;
      }
      const errors = validateSemanticPlay(semantic);
      results.push({
        slug,
        status: errors.length === 0 ? "pass" : "fail",
        errors,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ slug, status: "fail", errors: [`load error: ${msg}`] });
    }
  }
  return results;
}

export function printRevalidateReport(results: RevalidateResult[]): number {
  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const r of results) {
    if (r.status === "pass") {
      console.log(`  ✓ ${r.slug}`);
      pass++;
    } else if (r.status === "no-semantic") {
      console.log(`  · ${r.slug} (no *Semantic export — skipped)`);
      skip++;
    } else {
      console.log(`  ✗ ${r.slug}`);
      for (const e of r.errors) console.log(`      ${e}`);
      fail++;
    }
  }
  console.log("");
  console.log(`${pass} passed, ${fail} failed, ${skip} skipped (${results.length} total)`);
  return fail === 0 ? 0 : 1;
}

async function main() {
  console.log(`Revalidating plays in ${path.relative(process.cwd(), PLAYS_TS_DIR)}\n`);
  const results = await revalidateAllPlays();
  const code = printRevalidateReport(results);
  if (code !== 0) {
    console.log(`\nTo quarantine a failing play, move it to ${path.relative(process.cwd(), REVIEW_DIR)}/ and remove its entry from index.ts.`);
  }
  process.exit(code);
}

// Run as CLI only when invoked directly, not when imported.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
