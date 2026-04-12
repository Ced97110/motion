#!/usr/bin/env tsx
/**
 * Resynth Manifest — READ-ONLY planner for the next synthesize-plays.ts run.
 *
 * Scans knowledge-base/wiki/ for play-type pages, cross-references
 * src/data/plays/ (registered) and src/data/plays/_review/ (quarantined),
 * scores each candidate for synthesis readiness, and emits:
 *   - stdout: grouped summary + top-N ranking
 *   - scripts/.resynth-manifest.json: full machine-readable manifest
 *
 * NO Claude API calls. NO writes to the wiki or plays directories.
 *
 * Usage:
 *   npx tsx scripts/resynth-manifest.ts
 *   npx tsx scripts/resynth-manifest.ts --top 40
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// --- Paths ---------------------------------------------------------------

const ROOT = process.cwd();
const WIKI_DIR = path.join(ROOT, "knowledge-base", "wiki");
const PLAYS_DIR = path.join(ROOT, "src", "data", "plays");
const REVIEW_DIR = path.join(PLAYS_DIR, "_review");
const OUT_JSON = path.join(ROOT, "scripts", ".resynth-manifest.json");

// --- Types ---------------------------------------------------------------

export type Category =
  | "offense-set"
  | "BLOB"
  | "SLOB"
  | "press-break"
  | "zone-offense"
  | "transition"
  | "defense"
  | "drill"
  | "other";

export interface ScoreBreakdown {
  readonly hasPlayFrontmatter: number;
  readonly hasPhases: number;
  readonly hasFormation: number;
  readonly hasCounters: number;
  readonly hasCitations: number;
  readonly hasBacklinks: number;
  readonly diagramMarkerPenalty: number;
  readonly duplicatePenalty: number;
  readonly quarantinedPenalty: number;
}

export interface Candidate {
  readonly slug: string;
  readonly title: string;
  readonly file: string;
  readonly category: Category;
  readonly rawCategory: string | null;
  readonly formation: string | null;
  readonly tags: readonly string[];
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
  readonly status: "candidate" | "duplicate" | "quarantined";
  readonly blockers: readonly string[];
  readonly phaseCount: number;
  readonly citationCount: number;
  readonly backlinkCount: number;
  readonly diagramMarkerCount: number;
}

export interface Manifest {
  readonly generatedAt: string;
  readonly wikiPlayPages: number;
  readonly registeredSlugs: readonly string[];
  readonly quarantinedSlugs: readonly string[];
  readonly categoryCounts: Readonly<Record<Category, number>>;
  readonly candidates: readonly Candidate[];
}

// --- Helpers -------------------------------------------------------------

function listRegisteredSlugs(dir: string): readonly string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

function countMatches(haystack: string, re: RegExp): number {
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function countSubsections(phasesBlock: string): number {
  // Count `### ` headings inside the Phases block.
  return countMatches(phasesBlock, /^###\s+/gm);
}

function extractSection(body: string, heading: string): string | null {
  // Extract the text between `## <heading>` and the next `## ` or EOF.
  const re = new RegExp(
    `^##\\s+${heading}\\b[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`,
    "mi",
  );
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

const VAGUE_FORMATIONS = new Set([
  "",
  "n/a",
  "na",
  "none",
  "any",
  "various",
  "varies",
  "unknown",
  "tbd",
]);

function isFormationSpecific(
  frontmatterFormation: unknown,
  formationSection: string | null,
): boolean {
  const fmFm =
    typeof frontmatterFormation === "string"
      ? frontmatterFormation.trim().toLowerCase()
      : "";
  if (fmFm && !VAGUE_FORMATIONS.has(fmFm)) return true;
  if (formationSection && formationSection.length >= 20) return true;
  return false;
}

function categoryFor(
  slug: string,
  rawCategory: string | null,
  tags: readonly string[],
): Category {
  const t = new Set(tags.map((s) => s.toLowerCase()));
  const cat = (rawCategory ?? "").toLowerCase();

  if (slug.startsWith("blob-") || t.has("blob")) return "BLOB";
  if (slug.startsWith("slob-") || t.has("slob")) return "SLOB";
  if (slug.includes("press") || t.has("press") || t.has("press-break"))
    return "press-break";
  if (
    t.has("zone-offense") ||
    t.has("vs-zone") ||
    (cat === "offense" && t.has("2-3-zone"))
  )
    return "zone-offense";
  if (t.has("transition") || t.has("fast-break") || slug.startsWith("transition-"))
    return "transition";
  if (cat === "defense" || t.has("defense")) return "defense";
  if (t.has("drill") || slug.includes("-drill")) return "drill";
  if (cat === "out-of-bounds") {
    // Out-of-bounds without explicit blob/slob tag — bucket to BLOB by default.
    return "BLOB";
  }
  if (cat === "offense" || slug.startsWith("play-") || slug.startsWith("set-"))
    return "offense-set";
  return "other";
}

function scoreCandidate(
  registered: ReadonlySet<string>,
  quarantined: ReadonlySet<string>,
  slug: string,
  body: string,
  frontmatter: Record<string, unknown>,
): {
  score: number;
  breakdown: ScoreBreakdown;
  status: Candidate["status"];
  blockers: string[];
  phaseCount: number;
  citationCount: number;
  backlinkCount: number;
  diagramMarkerCount: number;
} {
  const blockers: string[] = [];

  const hasPlayFrontmatter = frontmatter.type === "play" ? 20 : 0;
  if (!hasPlayFrontmatter) blockers.push("frontmatter type is not 'play'");

  const phasesBlock = extractSection(body, "Phases");
  const phaseCount = phasesBlock ? countSubsections(phasesBlock) : 0;
  const hasPhases = phasesBlock && phaseCount >= 3 ? 20 : 0;
  if (!phasesBlock) blockers.push("missing ## Phases section");
  else if (phaseCount < 3)
    blockers.push(`only ${phaseCount} phase subsection(s) (need 3+)`);

  const formationSection = extractSection(body, "Formation");
  const formationSpecific = isFormationSpecific(
    frontmatter.formation,
    formationSection,
  );
  const hasFormation = formationSpecific ? 15 : 0;
  if (!formationSpecific) blockers.push("formation missing or vague");

  const countersSection = extractSection(body, "Counters");
  const hasCounters =
    countersSection && countersSection.replace(/\s+/g, "").length > 0 ? 15 : 0;
  if (!hasCounters) blockers.push("no ## Counters section");

  const citationCount = countMatches(body, /\[S\d+,\s*p{1,2}\.?\s*[\dA-Za-z\-–,\s]+\]/g);
  const hasCitations = citationCount >= 1 ? 10 : 0;
  if (!hasCitations) blockers.push("no [Sn, p.XX] citations");

  const backlinkCount = countMatches(body, /\[\[[^\]]+\]\]/g);
  const hasBacklinks = backlinkCount >= 2 ? 10 : 0;
  if (!hasBacklinks)
    blockers.push(`only ${backlinkCount} [[backlink]](s) (need 2+)`);

  const diagramMarkerCount = countMatches(
    body,
    /<!--\s*DIAGRAM:[^]*?-->/g,
  );
  const diagramMarkerPenalty = diagramMarkerCount > 0 ? -30 : 0;
  if (diagramMarkerCount > 0)
    blockers.push(
      `${diagramMarkerCount} unresolved DIAGRAM marker(s) — prose-only synthesis`,
    );

  let status: Candidate["status"] = "candidate";
  let duplicatePenalty = 0;
  let quarantinedPenalty = 0;
  if (registered.has(slug)) {
    status = "duplicate";
    duplicatePenalty = -20;
    blockers.push("duplicate — already registered in src/data/plays/");
  } else if (quarantined.has(slug)) {
    status = "quarantined";
    quarantinedPenalty = -10;
    blockers.push("quarantined in src/data/plays/_review/ — needs fix, not resynth");
  }

  const score =
    hasPlayFrontmatter +
    hasPhases +
    hasFormation +
    hasCounters +
    hasCitations +
    hasBacklinks +
    diagramMarkerPenalty +
    duplicatePenalty +
    quarantinedPenalty;

  return {
    score,
    breakdown: {
      hasPlayFrontmatter,
      hasPhases,
      hasFormation,
      hasCounters,
      hasCitations,
      hasBacklinks,
      diagramMarkerPenalty,
      duplicatePenalty,
      quarantinedPenalty,
    },
    status,
    blockers,
    phaseCount,
    citationCount,
    backlinkCount,
    diagramMarkerCount,
  };
}

// --- Main ---------------------------------------------------------------

export function buildManifest(): Manifest {
  if (!fs.existsSync(WIKI_DIR)) {
    throw new Error(`Wiki directory not found: ${WIKI_DIR}`);
  }

  const registeredList = listRegisteredSlugs(PLAYS_DIR);
  const quarantinedList = listRegisteredSlugs(REVIEW_DIR);
  const registered = new Set<string>(registeredList);
  const quarantined = new Set<string>(quarantinedList);

  const candidates: Candidate[] = [];
  const categoryCounts: Record<Category, number> = {
    "offense-set": 0,
    BLOB: 0,
    SLOB: 0,
    "press-break": 0,
    "zone-offense": 0,
    transition: 0,
    defense: 0,
    drill: 0,
    other: 0,
  };

  for (const file of fs.readdirSync(WIKI_DIR).sort()) {
    if (!file.endsWith(".md")) continue;
    if (file === "index.md" || file === "log.md") continue;
    const slug = file.replace(/\.md$/, "");
    const full = path.join(WIKI_DIR, file);
    const raw = fs.readFileSync(full, "utf-8");
    const { data, content } = matter(raw);
    if (data.type !== "play") continue;

    const title = (content.match(/^#\s+(.+)$/m)?.[1] ?? slug).trim();
    const tags = Array.isArray(data.tags)
      ? (data.tags as unknown[]).map(String)
      : [];
    const rawCategory =
      typeof data.category === "string" ? data.category : null;
    const formation =
      typeof data.formation === "string" ? data.formation : null;
    const cat = categoryFor(slug, rawCategory, tags);
    categoryCounts[cat] += 1;

    const scored = scoreCandidate(registered, quarantined, slug, content, data);
    candidates.push({
      slug,
      title,
      file: full,
      category: cat,
      rawCategory,
      formation,
      tags,
      score: scored.score,
      breakdown: scored.breakdown,
      status: scored.status,
      blockers: scored.blockers,
      phaseCount: scored.phaseCount,
      citationCount: scored.citationCount,
      backlinkCount: scored.backlinkCount,
      diagramMarkerCount: scored.diagramMarkerCount,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  return {
    generatedAt: new Date().toISOString(),
    wikiPlayPages: candidates.length,
    registeredSlugs: registeredList,
    quarantinedSlugs: quarantinedList,
    categoryCounts,
    candidates,
  };
}

function parseTop(argv: readonly string[]): number {
  const i = argv.indexOf("--top");
  if (i >= 0 && argv[i + 1]) {
    const n = Number.parseInt(argv[i + 1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 40;
}

function printSummary(m: Manifest, top: number): void {
  /* eslint-disable no-console */
  console.log("=".repeat(70));
  console.log("RESYNTH MANIFEST — Motion play registry");
  console.log("=".repeat(70));
  console.log(`Generated:           ${m.generatedAt}`);
  console.log(`Wiki play-type pages: ${m.wikiPlayPages}`);
  console.log(
    `Registered plays:    ${m.registeredSlugs.length} (${m.registeredSlugs.join(", ")})`,
  );
  console.log(
    `Quarantined plays:   ${m.quarantinedSlugs.length}${
      m.quarantinedSlugs.length ? ` (${m.quarantinedSlugs.join(", ")})` : ""
    }`,
  );
  console.log("");
  console.log("Category breakdown (all play-type pages):");
  for (const [cat, n] of Object.entries(m.categoryCounts)) {
    console.log(`  ${cat.padEnd(14)} ${n}`);
  }
  console.log("");

  const bucket = (c: Category): readonly Candidate[] =>
    m.candidates.filter(
      (x) => x.category === c && x.status === "candidate",
    );

  console.log("Top 5 per category (status = candidate only):");
  const order: Category[] = [
    "offense-set",
    "BLOB",
    "SLOB",
    "press-break",
    "zone-offense",
    "transition",
    "defense",
    "drill",
  ];
  for (const cat of order) {
    const rows = bucket(cat).slice(0, 5);
    console.log(`\n  [${cat}] (${bucket(cat).length} candidates)`);
    if (rows.length === 0) {
      console.log("    (none)");
      continue;
    }
    for (const r of rows) {
      console.log(`    ${String(r.score).padStart(4)}  ${r.slug}`);
    }
  }

  console.log("");
  console.log(`Top ${top} overall candidates:`);
  const overall = m.candidates
    .filter((c) => c.status === "candidate")
    .slice(0, top);
  for (const r of overall) {
    console.log(
      `  ${String(r.score).padStart(4)}  ${r.category.padEnd(13)} ${r.slug}`,
    );
  }

  const dupes = m.candidates.filter((c) => c.status === "duplicate");
  const quars = m.candidates.filter((c) => c.status === "quarantined");
  console.log("");
  console.log(`Duplicates (skip):   ${dupes.length}`);
  for (const d of dupes) console.log(`  - ${d.slug}`);
  console.log(`Quarantined (fix):   ${quars.length}`);
  for (const q of quars) console.log(`  - ${q.slug}`);
  console.log("");
  console.log(`JSON written to: ${path.relative(ROOT, OUT_JSON)}`);
  /* eslint-enable no-console */
}

function main(): void {
  const argv = process.argv.slice(2);
  const top = parseTop(argv);
  const manifest = buildManifest();
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  printSummary(manifest, top);
}

const isDirectRun =
  typeof require !== "undefined" && require.main === module;
if (isDirectRun) {
  try {
    main();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`resynth-manifest failed: ${msg}`);
    process.exit(1);
  }
}
