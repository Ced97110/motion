// Aggregate revalidation + Playwright visual audit results into a single
// markdown report at docs/visual-audit-<YYYY-MM-DD>.md. Assumes
// playwright-report/results.json exists — run `npm run test:visual` first.
//
// Invoke: `npm run visual-audit:report`

import * as fs from "node:fs";
import * as path from "node:path";
import { revalidateAllPlays, type RevalidateResult } from "./revalidate-plays";

const PROJECT_ROOT = process.cwd();
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");
const PW_RESULTS = path.join(PROJECT_ROOT, "playwright-report", "results.json");

interface PwTest {
  title: string;
  ok: boolean;
  results: Array<{ status: string; error?: { message?: string } }>;
}
interface PwSpec {
  title: string;
  tests: PwTest[];
}
interface PwSuite {
  title: string;
  suites?: PwSuite[];
  specs?: PwSpec[];
}
interface PwStats {
  /** Tests that matched their expected status (passed when expected "pass"). */
  expected: number;
  skipped: number;
  /** Tests that did NOT match expected status — treat as failed. */
  unexpected: number;
  flaky: number;
}
interface PwReport {
  stats: PwStats;
  suites: PwSuite[];
}

interface VisualResult {
  slug: string;
  status: "pass" | "fail" | "skip";
  failedTests: string[];
}

function flattenSpecs(suites: PwSuite[] | undefined, out: PwSpec[]): void {
  if (!suites) return;
  for (const s of suites) {
    if (s.specs) out.push(...s.specs);
    if (s.suites) flattenSpecs(s.suites, out);
  }
}

function parsePlaywrightReport(report: PwReport): Map<string, VisualResult> {
  const specs: PwSpec[] = [];
  flattenSpecs(report.suites, specs);

  const bySlug = new Map<string, VisualResult>();
  for (const suite of report.suites) {
    walkSuite(suite, bySlug);
  }
  return bySlug;
}

function walkSuite(suite: PwSuite, acc: Map<string, VisualResult>): void {
  // Describe titles look like: "visual audit: <slug>"
  const m = suite.title.match(/^visual audit:\s*(.+)$/);
  if (m) {
    const slug = m[1];
    const specs = suite.specs ?? [];
    const failedTests: string[] = [];
    let allSkipped = true;
    let anyFailed = false;
    for (const spec of specs) {
      for (const t of spec.tests) {
        const last = t.results[t.results.length - 1];
        if (!last) continue;
        if (last.status === "passed") allSkipped = false;
        if (last.status === "failed" || last.status === "timedOut") {
          anyFailed = true;
          failedTests.push(`${spec.title}: ${last.error?.message ?? last.status}`);
          allSkipped = false;
        }
        if (last.status === "skipped") {
          // still could be all skipped
        } else {
          allSkipped = false;
        }
      }
    }
    const status: VisualResult["status"] = anyFailed
      ? "fail"
      : allSkipped
        ? "skip"
        : "pass";
    acc.set(slug, { slug, status, failedTests });
    return;
  }
  for (const child of suite.suites ?? []) walkSuite(child, acc);
}

function statusIcon(s: "pass" | "fail" | "skip" | "no-semantic"): string {
  if (s === "pass") return "✅";
  if (s === "fail") return "❌";
  if (s === "skip") return "⚪";
  return "·";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMarkdown(
  revalidate: RevalidateResult[],
  visual: Map<string, VisualResult>,
  pwStats: PwStats | null,
): string {
  const date = todayIso();
  const allSlugs = new Set<string>();
  for (const r of revalidate) allSlugs.add(r.slug);
  for (const s of visual.keys()) allSlugs.add(s);
  const slugs = Array.from(allSlugs).sort();

  const revBy = new Map(revalidate.map((r) => [r.slug, r]));

  const lines: string[] = [];
  lines.push(`# Visual Audit — ${date}`);
  lines.push("");
  const revPass = revalidate.filter((r) => r.status === "pass").length;
  const revFail = revalidate.filter((r) => r.status === "fail").length;
  const revSkip = revalidate.filter((r) => r.status === "no-semantic").length;
  lines.push(`**Semantic revalidation** — ${revPass} pass, ${revFail} fail, ${revSkip} skipped (no *Semantic export).`);
  if (pwStats) {
    const total = pwStats.expected + pwStats.unexpected + pwStats.skipped;
    const flakyNote = pwStats.flaky > 0 ? `, ${pwStats.flaky} flaky` : "";
    lines.push(
      `**Visual audit** — ${pwStats.expected} passed, ${pwStats.unexpected} failed, ${pwStats.skipped} skipped${flakyNote} (${total} total).`,
    );
  } else {
    lines.push("**Visual audit** — no `playwright-report/results.json` found; run `npm run test:visual` first.");
  }
  lines.push("");

  lines.push("| Slug | Semantic | Visual | Notes |");
  lines.push("|------|----------|--------|-------|");
  for (const slug of slugs) {
    const rev = revBy.get(slug);
    const vis = visual.get(slug);
    const rs = rev?.status ?? "no-semantic";
    const vs = vis?.status ?? "skip";
    const note =
      rs === "fail"
        ? rev!.errors.join(" · ")
        : vs === "fail"
          ? vis!.failedTests.join(" · ")
          : rs === "no-semantic"
            ? "no *Semantic export (predates schema)"
            : vs === "skip"
              ? "route 404 — no wiki page"
              : "";
    lines.push(`| \`${slug}\` | ${statusIcon(rs)} | ${statusIcon(vs)} | ${note} |`);
  }
  lines.push("");

  const revFailures = revalidate.filter((r) => r.status === "fail");
  if (revFailures.length > 0) {
    lines.push("## Semantic failures");
    for (const f of revFailures) {
      lines.push(`### \`${f.slug}\``);
      for (const e of f.errors) lines.push(`- ${e}`);
    }
    lines.push("");
  }

  const visFailures = Array.from(visual.values()).filter((v) => v.status === "fail");
  if (visFailures.length > 0) {
    lines.push("## Visual failures");
    for (const f of visFailures) {
      lines.push(`### \`${f.slug}\``);
      for (const msg of f.failedTests) lines.push(`- ${msg}`);
    }
    lines.push("");
  }

  lines.push("## Artifacts");
  lines.push("- HTML report: `playwright-report/index.html`");
  lines.push("- Baselines: `tests/visual/__screenshots__/play.spec.ts-snapshots/`");
  lines.push("- Failure screenshots: `test-results/` (per-test subdirectories)");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("Running semantic revalidation…");
  const revalidate = await revalidateAllPlays();

  let visual = new Map<string, VisualResult>();
  let pwStats: PwStats | null = null;
  if (fs.existsSync(PW_RESULTS)) {
    const report = JSON.parse(fs.readFileSync(PW_RESULTS, "utf-8")) as PwReport;
    pwStats = report.stats;
    visual = parsePlaywrightReport(report);
  } else {
    console.warn(`No ${path.relative(PROJECT_ROOT, PW_RESULTS)} — skipping visual section.`);
  }

  const md = buildMarkdown(revalidate, visual, pwStats);
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const outPath = path.join(DOCS_DIR, `visual-audit-${todayIso()}.md`);
  fs.writeFileSync(outPath, md, "utf-8");
  console.log(`Wrote ${path.relative(PROJECT_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
