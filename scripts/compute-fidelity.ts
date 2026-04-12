// Compute a per-play fidelity score for every registered + quarantined play
// and write a ranked report to docs/fidelity-<date>.md. Read-only pass over
// the repo — never mutates plays or wiki pages.
//
// Invoke: `npx tsx scripts/compute-fidelity.ts`
// Exits 0 always (reporting, not a gate).

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

import { computeFidelity } from "../src/lib/fidelity/score";
import type { FidelityScore } from "../src/lib/fidelity/score";
import { revalidateAllPlays } from "./revalidate-plays";
import type { RevalidateResult } from "./revalidate-plays";

const ROOT = process.cwd();
const PLAYS_DIR = path.join(ROOT, "src", "data", "plays");
const REVIEW_DIR = path.join(PLAYS_DIR, "_review");
const WIKI_DIR = path.join(ROOT, "knowledge-base", "wiki");
const DOCS_DIR = path.join(ROOT, "docs");

interface PlayFile {
  slug: string;
  filePath: string;
  isQuarantined: boolean;
}

interface WikiMeta {
  body: string;
  sourceCount?: number;
}

function today(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function listPlayFiles(): PlayFile[] {
  const out: PlayFile[] = [];
  if (fs.existsSync(PLAYS_DIR)) {
    for (const f of fs.readdirSync(PLAYS_DIR)) {
      if (f.endsWith(".ts") && f !== "index.ts") {
        out.push({
          slug: f.replace(/\.ts$/, ""),
          filePath: path.join(PLAYS_DIR, f),
          isQuarantined: false,
        });
      }
    }
  }
  if (fs.existsSync(REVIEW_DIR)) {
    for (const f of fs.readdirSync(REVIEW_DIR)) {
      if (f.endsWith(".ts")) {
        out.push({
          slug: f.replace(/\.ts$/, ""),
          filePath: path.join(REVIEW_DIR, f),
          isQuarantined: true,
        });
      }
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Static check — does this file export a `*Semantic` symbol? We detect via
 * source inspection rather than dynamic import so we don't double-import
 * plays already loaded by revalidateAllPlays.
 */
function hasSemanticExport(filePath: string): boolean {
  const src = fs.readFileSync(filePath, "utf8");
  return /export\s+const\s+\w+Semantic\b/.test(src);
}

function readWikiPage(slug: string): WikiMeta | null {
  const file = path.join(WIKI_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const front = parsed.data as Record<string, unknown>;
  const sc = front.source_count;
  return {
    body: parsed.content,
    sourceCount: typeof sc === "number" ? sc : undefined,
  };
}

function histogram(scores: number[]): string {
  const buckets: { label: string; min: number; max: number; count: number }[] = [
    { label: "0.90-1.00", min: 0.9, max: 1.01, count: 0 },
    { label: "0.70-0.89", min: 0.7, max: 0.9, count: 0 },
    { label: "0.50-0.69", min: 0.5, max: 0.7, count: 0 },
    { label: "0.30-0.49", min: 0.3, max: 0.5, count: 0 },
    { label: "0.00-0.29", min: 0, max: 0.3, count: 0 },
  ];
  for (const s of scores) {
    for (const b of buckets) {
      if (s >= b.min && s < b.max) {
        b.count += 1;
        break;
      }
    }
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const lines = buckets.map((b) => {
    const bar = "#".repeat(Math.round((b.count / max) * 20));
    return `  ${b.label}  ${String(b.count).padStart(2, " ")}  ${bar}`;
  });
  return lines.join("\n");
}

function renderReport(scored: FidelityScore[], date: string): string {
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const total = ranked.length;
  const avg =
    total === 0
      ? 0
      : Math.round((ranked.reduce((s, r) => s + r.score, 0) / total) * 100) /
        100;
  const hist = histogram(ranked.map((r) => r.score));

  const rows = ranked.map((r) => {
    const b = r.breakdown;
    return `| ${r.slug} | **${r.score.toFixed(2)}** | ${b.diagram_grounded.toFixed(
      2
    )} | ${b.diagram_validates.toFixed(2)} | ${b.revalidates.toFixed(
      2
    )} | ${b.has_sources.toFixed(2)} | ${b.has_semantic.toFixed(
      2
    )} | ${b.not_quarantined.toFixed(2)} |`;
  });

  const details = ranked
    .map((r) => {
      const reasonLines = r.reasons.map((x) => `- ${x}`).join("\n");
      return `### ${r.slug} — ${r.score.toFixed(2)}\n\n${reasonLines}`;
    })
    .join("\n\n");

  return `# Fidelity Report — ${date}

Per-play 0.0-1.0 confidence that each registered (or quarantined) play
matches its source-book diagram. Higher score = stronger evidence.

**Total plays:** ${total}
**Average score:** ${avg.toFixed(2)}

## Score distribution

\`\`\`
${hist}
\`\`\`

## Ranked table

| Slug | Score | Diagram grounded (0.30) | Diagram validates (0.20) | Revalidates (0.20) | Sources (0.10) | Semantic (0.10) | Not quarantined (0.10) |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## Per-play breakdown

${details}

---

_Generated by \`scripts/compute-fidelity.ts\`. Read-only; safe to re-run._
`;
}

async function main(): Promise<void> {
  console.log(`Scanning plays in ${path.relative(ROOT, PLAYS_DIR)}`);
  const files = listPlayFiles();
  console.log(`Found ${files.length} play file(s).`);

  console.log("Running revalidator...");
  const revalResults: RevalidateResult[] = await revalidateAllPlays();
  const revalBySlug = new Map<string, RevalidateResult>();
  for (const r of revalResults) revalBySlug.set(r.slug, r);

  const scored: FidelityScore[] = [];
  for (const f of files) {
    const wiki = readWikiPage(f.slug);
    const reval = revalBySlug.get(f.slug);
    // `pass` = revalidated OK. `no-semantic` / undefined = skip (no signal).
    // Quarantined plays aren't in the registry pass, so reval is undefined.
    let revalidates: boolean | undefined;
    if (reval?.status === "pass") revalidates = true;
    else if (reval?.status === "fail") revalidates = false;
    else revalidates = undefined;

    const score = computeFidelity({
      slug: f.slug,
      hasRegisteredPlay: !f.isQuarantined,
      hasWikiPage: wiki !== null,
      wikiBody: wiki?.body,
      sourceCount: wiki?.sourceCount,
      revalidates,
      hasSemanticExport: hasSemanticExport(f.filePath),
      isQuarantined: f.isQuarantined,
    });
    scored.push(score);
  }

  const date = today();
  const outPath = path.join(DOCS_DIR, `fidelity-${date}.md`);
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  const md = renderReport(scored, date);
  fs.writeFileSync(outPath, md, "utf8");

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  console.log("");
  for (const r of ranked) {
    console.log(`  ${r.score.toFixed(2)}  ${r.slug}`);
  }
  console.log("");
  console.log(`Report: ${path.relative(ROOT, outPath)}`);
  process.exit(0);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`compute-fidelity failed: ${msg}`);
  // Reporting tool — exit 0 per spec.
  process.exit(0);
});
