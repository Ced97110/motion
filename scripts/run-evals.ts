#!/usr/bin/env tsx
/**
 * Motion eval harness runner.
 *
 * Loads golden cases from eval/*.jsonl, scores outputs, writes a baseline
 * markdown report. Two modes:
 *
 *   --offline (default)  Score the already-registered outputs:
 *                        - synth cases → `*Semantic` exports in src/data/plays
 *                        - resolver cases → the diagram-positions block in
 *                          knowledge-base/wiki/<slug>.md
 *                        Zero Claude API calls. Safe to run on CI.
 *
 *   --live               Would call Claude to produce outputs for each case
 *                        and then score them. NOT implemented beyond the
 *                        argument plumbing — see the `runLive` stub.
 *
 * Usage:
 *   npx tsx scripts/run-evals.ts --offline
 *   npx tsx scripts/run-evals.ts --offline --out docs/eval-baseline-2026-04-12.md
 */

import fs from "node:fs";
import path from "node:path";

import {
  scoreDiagramResolution,
  scoreSemanticPlay,
  type ResolverExpectations,
  type SynthExpectations,
} from "../src/lib/eval/scorers";
import type { EvalResult } from "../src/lib/eval/types";
import type { SemanticPlay } from "../src/lib/court/synthesize";

// ── Types for JSONL cases ───────────────────────────────────────────────

interface SynthCase {
  case_id: string;
  slug: string;
  wiki_body: string;
  expectations: SynthExpectations;
}

interface ResolverCase {
  case_id: string;
  slug: string;
  source_id: string;
  printed_pages: number[];
  expectations: ResolverExpectations;
}

interface RunOptions {
  mode: "offline" | "live";
  outPath: string;
  synthCasesPath: string;
  resolverCasesPath: string;
}

// ── Arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: readonly string[]): RunOptions {
  let mode: "offline" | "live" = "offline";
  let outPath = path.resolve("docs/eval-baseline-2026-04-12.md");
  const synthCasesPath = path.resolve("eval/synth-cases.jsonl");
  const resolverCasesPath = path.resolve("eval/resolver-cases.jsonl");

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--offline") mode = "offline";
    else if (a === "--live") mode = "live";
    else if (a === "--out") {
      const next = argv[i + 1];
      if (next === undefined) throw new Error("--out requires a path");
      outPath = path.resolve(next);
      i++;
    }
  }

  return { mode, outPath, synthCasesPath, resolverCasesPath };
}

// ── JSONL loader ────────────────────────────────────────────────────────

function loadJsonl<T>(p: string): T[] {
  const raw = fs.readFileSync(p, "utf-8");
  const out: T[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

// ── Offline output loaders ──────────────────────────────────────────────

/**
 * Load the semantic form for a registered play by slug. Returns null if
 * the play isn't registered or doesn't export a *Semantic. We intentionally
 * use a dynamic import so plays without semantic exports (like
 * weakside-flare-slip) don't break the runner.
 */
async function loadRegisteredSemantic(
  slug: string,
): Promise<SemanticPlay | null> {
  const modulePath = path.resolve(`src/data/plays/${slug}.ts`);
  if (!fs.existsSync(modulePath)) return null;
  const mod = (await import(modulePath)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(mod)) {
    if (key.endsWith("Semantic") && typeof value === "object" && value !== null) {
      return value as SemanticPlay;
    }
  }
  return null;
}

function loadWikiBody(slug: string): string | null {
  const p = path.resolve(`knowledge-base/wiki/${slug}.md`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

// ── Scoring loops ───────────────────────────────────────────────────────

async function runOfflineSynth(cases: SynthCase[]): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  for (const c of cases) {
    const play = await loadRegisteredSemantic(c.slug);
    if (play === null) {
      results.push({
        case_id: c.case_id,
        score: 0,
        passed: false,
        failures: [
          {
            kind: "missing-registered-output",
            detail: `no *Semantic export found at src/data/plays/${c.slug}.ts`,
          },
        ],
      });
      continue;
    }
    results.push(scoreSemanticPlay(c.case_id, play, c.expectations));
  }
  return results;
}

function runOfflineResolver(cases: ResolverCase[]): EvalResult[] {
  const results: EvalResult[] = [];
  for (const c of cases) {
    const body = loadWikiBody(c.slug);
    if (body === null) {
      results.push({
        case_id: c.case_id,
        score: 0,
        passed: false,
        failures: [
          {
            kind: "missing-wiki-page",
            detail: `no wiki page at knowledge-base/wiki/${c.slug}.md`,
          },
        ],
      });
      continue;
    }
    results.push(scoreDiagramResolution(c.case_id, body, c.expectations));
  }
  return results;
}

// ── --live stub ─────────────────────────────────────────────────────────

async function runLive(): Promise<never> {
  throw new Error(
    "--live mode is not yet implemented. It would: (1) call the synthesizer prompt with wiki_body to produce a SemanticPlay, (2) call the resolver prompt with the cited PDF pages to produce a diagram-positions block, (3) score each output. Use --offline until that is wired up.",
  );
}

// ── Report writer ───────────────────────────────────────────────────────

interface Section {
  title: string;
  results: EvalResult[];
  scorer: string;
}

function summarise(results: readonly EvalResult[]): {
  passed: number;
  total: number;
  avg: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const avg =
    total === 0 ? 0 : results.reduce((s, r) => s + r.score, 0) / total;
  return { passed, total, avg };
}

function formatResult(r: EvalResult): string {
  const lines: string[] = [];
  lines.push(
    `### ${r.case_id} — score ${r.score.toFixed(2)} ${r.passed ? "PASS" : "FAIL"}`,
  );
  if (r.notes && r.notes.length > 0) {
    lines.push(`- notes: \`${r.notes.join(" ")}\``);
  }
  if (r.failures.length > 0) {
    lines.push("- failures:");
    for (const f of r.failures) {
      lines.push(`  - **${f.kind}**: ${f.detail}`);
    }
  } else {
    lines.push("- failures: none");
  }
  return lines.join("\n");
}

function renderReport(sections: readonly Section[], mode: string): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Motion eval baseline`);
  lines.push("");
  lines.push(`- Generated: ${now}`);
  lines.push(`- Mode: \`${mode}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Section | Pass | Total | Avg score |");
  lines.push("|---------|------|-------|-----------|");
  for (const s of sections) {
    const sum = summarise(s.results);
    lines.push(
      `| ${s.title} | ${sum.passed} | ${sum.total} | ${sum.avg.toFixed(2)} |`,
    );
  }
  lines.push("");
  for (const s of sections) {
    lines.push(`## ${s.title}`);
    lines.push("");
    lines.push(`Scorer: \`${s.scorer}\``);
    lines.push("");
    for (const r of s.results) {
      lines.push(formatResult(r));
      lines.push("");
    }
  }
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.mode === "live") {
    await runLive();
    return;
  }

  const synthCases = loadJsonl<SynthCase>(opts.synthCasesPath);
  const resolverCases = loadJsonl<ResolverCase>(opts.resolverCasesPath);

  const synthResults = await runOfflineSynth(synthCases);
  const resolverResults = runOfflineResolver(resolverCases);

  const sections: Section[] = [
    {
      title: "Synthesizer (offline — registered *Semantic exports)",
      results: synthResults,
      scorer: "scoreSemanticPlay",
    },
    {
      title: "Diagram resolver (offline — registered wiki pages)",
      results: resolverResults,
      scorer: "scoreDiagramResolution",
    },
  ];

  const report = renderReport(sections, opts.mode);
  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  fs.writeFileSync(opts.outPath, report, "utf-8");

  const synthSum = summarise(synthResults);
  const resolverSum = summarise(resolverResults);

  // Minimal console summary — no deep detail; full report is the file.
  process.stdout.write(
    `eval: synth ${synthSum.passed}/${synthSum.total} (avg ${synthSum.avg.toFixed(2)}), resolver ${resolverSum.passed}/${resolverSum.total} (avg ${resolverSum.avg.toFixed(2)})\n`,
  );
  process.stdout.write(`report: ${opts.outPath}\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`run-evals failed: ${msg}\n`);
  process.exit(1);
});
