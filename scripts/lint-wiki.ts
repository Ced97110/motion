// Wiki linter for the Motion basketball coaching knowledge base.
//
// Karpathy's LLM-wiki pattern (see docs/karpathy-llm-wiki.md) explicitly names
// a `lint` operation that flags: dead wikilinks, orphan pages, bidirectional
// failures, gap concepts, filename violations, duplicate index entries, stale
// DIAGRAM markers, missing citations, SCHEMA-section non-compliance, and
// duplicate slugs.
//
// This script is READ-ONLY. It never modifies wiki content.
//
// Invoke: `npm run lint:wiki`
// Exit 1 if any error-level finding; 0 otherwise.

import * as fs from "node:fs/promises";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "error" | "warning" | "info";

interface Finding {
  check: CheckId;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
}

type CheckId =
  | "dead-wikilink"
  | "orphan-page"
  | "bidirectional-failure"
  | "gap-concept"
  | "filename-violation"
  | "duplicate-index-entry"
  | "stale-diagram-marker"
  | "missing-citation"
  | "schema-section-missing"
  | "duplicate-slug";

interface PageRecord {
  filePath: string;
  fileName: string;
  slug: string;
  raw: string;
  lines: readonly string[];
  frontmatter: Record<string, string>;
  body: string;
  bodyStartLine: number;
  outLinks: readonly LinkRef[];
}

interface LinkRef {
  target: string;
  line: number;
}

interface CheckSpec {
  id: CheckId;
  title: string;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WIKI_DIR = path.join(process.cwd(), "knowledge-base", "wiki");
const INDEX_FILE = path.join(WIKI_DIR, "index.md");
const LOG_FILE = path.join(WIKI_DIR, "log.md");
const REPORT_FILE = path.join(
  process.cwd(),
  "docs",
  "wiki-lint-2026-04-12.md",
);

// Pages to exclude from content checks (meta pages).
const META_SLUGS: ReadonlySet<string> = new Set(["index", "log"]);

// Severity that triggers a non-zero exit code.
const CRITICAL_SEVERITIES: ReadonlySet<Severity> = new Set(["error"]);

// Gap concept heuristic: TitleCase multi-word phrase appearing in N+ distinct
// pages but lacking a dedicated page matching that slug.
const GAP_MIN_PAGES = 5;
const GAP_MIN_WORDS = 2;
const GAP_MAX_WORDS = 4;

// Required sections per page type, derived from knowledge-base/SCHEMA.md.
const REQUIRED_SECTIONS: Record<string, readonly string[]> = {
  concept: [
    "## Summary",
    "## When to Use",
    "## Key Principles",
    "## Related Concepts",
    "## Sources",
  ],
  drill: [
    "## Objective",
    "## Setup",
    "## Execution",
    "## Coaching Points",
    "## Concepts Taught",
    "## Sources",
  ],
  play: [
    "## Overview",
    "## Formation",
    "## Phases",
    "## Key Coaching Points",
    "## Sources",
  ],
  "source-summary": [
    "## Overview",
    "## Key Themes",
    "## Chapter Breakdown",
  ],
};

const CHECK_CATALOG: readonly CheckSpec[] = [
  {
    id: "dead-wikilink",
    title: "Dead wikilinks",
    recommendation:
      "Create the missing page, or update the link to point at the correct slug. Inspect `index.md` links first — mis-typed filenames (e.g. spaces) surface here.",
  },
  {
    id: "orphan-page",
    title: "Orphan pages",
    recommendation:
      "Add inbound [[links]] from at least one related page, or add the slug to `index.md`. Pages with zero inbound references are unreachable during query.",
  },
  {
    id: "bidirectional-failure",
    title: "Bidirectional link failures",
    recommendation:
      "Per SCHEMA.md §Cross-Linking, if A links to B, B should link back to A. Add a reciprocal [[A]] in B's Related section.",
  },
  {
    id: "gap-concept",
    title: "Gap concepts",
    recommendation:
      "Term is mentioned across many pages but has no dedicated page. Consider creating a concept page or consolidating references.",
  },
  {
    id: "filename-violation",
    title: "Filename violations",
    recommendation:
      "Rename to kebab-case per SCHEMA.md §File Naming. No spaces, no uppercase, `.md` extension required.",
  },
  {
    id: "duplicate-index-entry",
    title: "Duplicate index entries",
    recommendation:
      "Consolidate the two index entries. Decide whether they describe the same page (merge) or different pages (rename one).",
  },
  {
    id: "stale-diagram-marker",
    title: "Stale DIAGRAM markers",
    recommendation:
      "Replace `<!-- DIAGRAM: ... -->` placeholders with a written description of player positions/movements, or extract the diagram via the diagram pipeline.",
  },
  {
    id: "missing-citation",
    title: "Missing citations",
    recommendation:
      "Per SCHEMA.md §Citation Rules, every factual claim must cite a source. Add `[Sn, p.XX]` or `[Sn]` to the page.",
  },
  {
    id: "schema-section-missing",
    title: "Schema section non-compliance",
    recommendation:
      "Add the missing sections as defined in SCHEMA.md for this page type. Required sections are mandatory.",
  },
  {
    id: "duplicate-slug",
    title: "Duplicate slugs",
    recommendation:
      "Two files collapse to the same effective slug (case/space-normalized). Rename one so the wiki has a 1:1 slug→file mapping.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;
const DIAGRAM_RE = /<!--\s*DIAGRAM:[^>]*-->/g;
const CITATION_RE = /\[S\d+(?:[^\]]*?)\]/;
// Matches a factual-looking claim: contains a digit, percent, a ratio (N-of-N), or a pp. range.
const FACTUAL_LINE_RE = /\b(\d{1,3}(?:\.\d+)?%|\d+\s*[-–]\s*\d+|\d{2,}|\d+\s*of\s*\d+)\b/;
const TITLE_CASE_RE = /\b(?:[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3})\b/g;
const INDEX_LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const KEBAB_OK_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function slugFromFilename(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

function normalizedSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
  bodyStartLine: number;
} {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: raw, bodyStartLine: 1 };
  }
  const block = match[1];
  const fm: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (kv) {
      fm[kv[1]] = kv[2].trim();
    }
  }
  const consumed = match[0];
  const bodyStart = consumed.split("\n").length;
  return {
    frontmatter: fm,
    body: raw.slice(consumed.length),
    bodyStartLine: bodyStart,
  };
}

function extractOutLinks(body: string, bodyStartLine: number): LinkRef[] {
  const links: LinkRef[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    WIKILINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WIKILINK_RE.exec(line)) !== null) {
      const target = m[1].split("|")[0].split("#")[0].trim();
      links.push({ target, line: bodyStartLine + i });
    }
  }
  return links;
}

async function listWikiPages(): Promise<readonly string[]> {
  const entries = await fs.readdir(WIKI_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => e.name)
    .sort();
}

async function loadPage(fileName: string): Promise<PageRecord> {
  const filePath = path.join(WIKI_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const { frontmatter, body, bodyStartLine } = parseFrontmatter(raw);
  const lines = raw.split("\n");
  const outLinks = extractOutLinks(body, bodyStartLine);
  return {
    filePath,
    fileName,
    slug: slugFromFilename(fileName),
    raw,
    lines,
    frontmatter,
    body,
    bodyStartLine,
    outLinks,
  };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkFilenames(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    const name = p.fileName;
    const reasons: string[] = [];
    if (!name.endsWith(".md")) reasons.push("missing .md extension");
    if (name !== name.toLowerCase()) reasons.push("contains uppercase");
    if (/\s/.test(name)) reasons.push("contains whitespace");
    if (/[^a-z0-9\-.]/.test(name.toLowerCase())) {
      reasons.push("contains non [a-z0-9-.] characters");
    }
    if (!KEBAB_OK_RE.test(name) && !reasons.length) {
      reasons.push("not strict kebab-case");
    }
    if (reasons.length) {
      findings.push({
        check: "filename-violation",
        severity: "error",
        file: p.filePath,
        message: `Filename "${name}" — ${reasons.join("; ")}`,
      });
    }
  }
  return findings;
}

function checkDuplicateSlugs(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  const groups = new Map<string, PageRecord[]>();
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    const key = normalizedSlug(p.slug);
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  for (const [key, group] of groups) {
    if (group.length > 1) {
      for (const p of group) {
        findings.push({
          check: "duplicate-slug",
          severity: "error",
          file: p.filePath,
          message: `Slug "${key}" is shared by ${group.length} files: ${group
            .map((g) => g.fileName)
            .join(", ")}`,
        });
      }
    }
  }
  return findings;
}

function checkDeadWikilinks(
  pages: readonly PageRecord[],
  slugSet: ReadonlySet<string>,
): Finding[] {
  const findings: Finding[] = [];
  for (const p of pages) {
    if (p.slug === "log") continue;
    for (const link of p.outLinks) {
      if (!link.target) continue;
      // Normalize the target: strip .md if present.
      const target = link.target.replace(/\.md$/i, "");
      if (/\s/.test(target)) {
        findings.push({
          check: "dead-wikilink",
          severity: "error",
          file: p.filePath,
          line: link.line,
          message: `Wikilink target "${link.target}" contains whitespace — malformed slug`,
        });
        continue;
      }
      if (!slugSet.has(target)) {
        findings.push({
          check: "dead-wikilink",
          severity: "error",
          file: p.filePath,
          line: link.line,
          message: `Wikilink target "[[${link.target}]]" does not resolve to any wiki page`,
        });
      }
    }
  }
  // Also validate markdown-style links in index.md — these must resolve to an
  // on-disk file. Broken entries here are how the "space in filename" class of
  // bug enters the wiki.
  const indexPage = pages.find((p) => p.slug === "index");
  if (indexPage) {
    const indexLines = indexPage.raw.split("\n");
    for (let i = 0; i < indexLines.length; i++) {
      const line = indexLines[i];
      INDEX_LINK_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = INDEX_LINK_RE.exec(line)) !== null) {
        const href = m[1];
        if (!href.endsWith(".md")) continue;
        const base = path.basename(href);
        const slug = slugFromFilename(base);
        if (/\s/.test(base)) {
          findings.push({
            check: "dead-wikilink",
            severity: "error",
            file: indexPage.filePath,
            line: i + 1,
            message: `index.md links to "${base}" — filename contains whitespace (invalid kebab-case)`,
          });
          continue;
        }
        if (!slugSet.has(slug)) {
          findings.push({
            check: "dead-wikilink",
            severity: "error",
            file: indexPage.filePath,
            line: i + 1,
            message: `index.md links to "${base}" — file does not exist`,
          });
        }
      }
    }
  }
  return findings;
}

function checkOrphans(pages: readonly PageRecord[]): Finding[] {
  // Build inbound index across all pages including index.md.
  const inbound = new Map<string, number>();
  for (const p of pages) {
    for (const link of p.outLinks) {
      const target = link.target.replace(/\.md$/i, "");
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }
  // Also treat index.md hyperlinks as inbound references.
  const indexPage = pages.find((p) => p.slug === "index");
  if (indexPage) {
    INDEX_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INDEX_LINK_RE.exec(indexPage.raw)) !== null) {
      const href = m[1];
      if (href.endsWith(".md")) {
        const slug = slugFromFilename(path.basename(href));
        inbound.set(slug, (inbound.get(slug) ?? 0) + 1);
      }
    }
  }
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    if ((inbound.get(p.slug) ?? 0) === 0) {
      findings.push({
        check: "orphan-page",
        severity: "warning",
        file: p.filePath,
        message: `Page "${p.slug}" has zero inbound [[links]] and no index.md reference`,
      });
    }
  }
  return findings;
}

function checkBidirectional(
  pages: readonly PageRecord[],
  slugSet: ReadonlySet<string>,
): Finding[] {
  const byslug = new Map<string, PageRecord>();
  for (const p of pages) byslug.set(p.slug, p);
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    const outSlugs = new Set<string>();
    for (const l of p.outLinks) {
      outSlugs.add(l.target.replace(/\.md$/i, ""));
    }
    for (const target of outSlugs) {
      if (!slugSet.has(target)) continue; // skip dead links — covered elsewhere
      if (target === p.slug) continue;
      const other = byslug.get(target);
      if (!other) continue;
      if (META_SLUGS.has(other.slug)) continue;
      const linksBack = other.outLinks.some(
        (l) => l.target.replace(/\.md$/i, "") === p.slug,
      );
      if (!linksBack) {
        findings.push({
          check: "bidirectional-failure",
          severity: "warning",
          file: p.filePath,
          message: `Links to [[${target}]] but [[${target}]] does not link back to [[${p.slug}]]`,
        });
      }
    }
  }
  return findings;
}

function checkStaleDiagrams(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    for (let i = 0; i < p.lines.length; i++) {
      const line = p.lines[i];
      DIAGRAM_RE.lastIndex = 0;
      if (DIAGRAM_RE.test(line)) {
        findings.push({
          check: "stale-diagram-marker",
          severity: "info",
          file: p.filePath,
          line: i + 1,
          message: `Unresolved DIAGRAM marker: ${line.trim().slice(0, 200)}`,
        });
      }
    }
  }
  return findings;
}

function checkMissingCitations(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    if (p.frontmatter.type === "source-summary") continue;
    // Skip pages with zero citations — those are counted below.
    const pageHasAnyCitation = CITATION_RE.test(p.raw);
    if (!pageHasAnyCitation) {
      findings.push({
        check: "missing-citation",
        severity: "warning",
        file: p.filePath,
        message: `Page has no [Sn]-style citation anywhere`,
      });
      continue;
    }
    // Find factual-looking claim lines without an inline or nearby citation.
    let suspectLine = -1;
    for (let i = 0; i < p.lines.length; i++) {
      const line = p.lines[i];
      if (!FACTUAL_LINE_RE.test(line)) continue;
      if (CITATION_RE.test(line)) continue;
      // Tolerate citation in an adjacent line (author's style sometimes puts
      // the citation on a following summary line).
      const prev = p.lines[i - 1] ?? "";
      const next = p.lines[i + 1] ?? "";
      if (CITATION_RE.test(prev) || CITATION_RE.test(next)) continue;
      // Tolerate structural lines (headers, code fences, YAML, empty).
      if (/^(#{1,6}\s|```|---|\s*$|\|)/.test(line)) continue;
      // Tolerate obvious non-prose (numbered list with small numbers only).
      if (/^\s*\d+\.\s+[A-Za-z]/.test(line) && !/\d{2,}|%|–/.test(line)) continue;
      suspectLine = i + 1;
      break;
    }
    if (suspectLine > 0) {
      findings.push({
        check: "missing-citation",
        severity: "info",
        file: p.filePath,
        line: suspectLine,
        message: `Factual-looking line lacks adjacent [Sn] citation`,
      });
    }
  }
  return findings;
}

function checkSchemaSections(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    const type = p.frontmatter.type;
    if (!type) {
      findings.push({
        check: "schema-section-missing",
        severity: "warning",
        file: p.filePath,
        message: `Frontmatter is missing required \`type\` key`,
      });
      continue;
    }
    const required = REQUIRED_SECTIONS[type];
    if (!required) continue;
    const missing: string[] = [];
    for (const heading of required) {
      const pattern = new RegExp(
        `^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "m",
      );
      if (!pattern.test(p.body)) missing.push(heading);
    }
    if (missing.length) {
      findings.push({
        check: "schema-section-missing",
        severity: "warning",
        file: p.filePath,
        message: `Type=${type} missing section(s): ${missing.join(", ")}`,
      });
    }
  }
  return findings;
}

function checkDuplicateIndexEntries(pages: readonly PageRecord[]): Finding[] {
  const findings: Finding[] = [];
  const indexPage = pages.find((p) => p.slug === "index");
  if (!indexPage) return findings;
  const seen = new Map<string, number[]>();
  const raw = indexPage.raw;
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    INDEX_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INDEX_LINK_RE.exec(lines[i])) !== null) {
      const href = m[1];
      if (!href.endsWith(".md")) continue;
      const slug = slugFromFilename(path.basename(href));
      const arr = seen.get(slug) ?? [];
      arr.push(i + 1);
      seen.set(slug, arr);
    }
  }
  for (const [slug, linesSeen] of seen) {
    if (linesSeen.length > 1) {
      findings.push({
        check: "duplicate-index-entry",
        severity: "error",
        file: indexPage.filePath,
        line: linesSeen[0],
        message: `Slug "${slug}" is listed ${linesSeen.length} times in index.md (lines ${linesSeen.join(", ")})`,
      });
    }
  }
  return findings;
}

function checkGapConcepts(
  pages: readonly PageRecord[],
  slugSet: ReadonlySet<string>,
): Finding[] {
  const findings: Finding[] = [];
  // term -> set of slugs that mention it in body prose.
  const mentions = new Map<string, Set<string>>();
  for (const p of pages) {
    if (META_SLUGS.has(p.slug)) continue;
    TITLE_CASE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    // Use a per-page dedup set to avoid counting the same term many times.
    const seenInPage = new Set<string>();
    while ((m = TITLE_CASE_RE.exec(p.body)) !== null) {
      const term = m[0];
      const wordCount = term.split(/\s+/).length;
      if (wordCount < GAP_MIN_WORDS || wordCount > GAP_MAX_WORDS) continue;
      if (seenInPage.has(term)) continue;
      seenInPage.add(term);
      const set = mentions.get(term) ?? new Set<string>();
      set.add(p.slug);
      mentions.set(term, set);
    }
  }
  // Known-noise prefixes/words from the corpus' narrative framing.
  const noise = new Set([
    "Motion Offense",
    "Triangle Offense",
    "Continuity Offense",
    "Coaches Playbook",
    "Common Mistakes",
    "Key Principles",
    "Related Concepts",
    "Related Plays",
    "Coaching Points",
    "Key Coaching",
    "Sources",
    "Overview",
  ]);
  for (const [term, pageSet] of mentions) {
    if (pageSet.size < GAP_MIN_PAGES) continue;
    if (noise.has(term)) continue;
    const slug = term.toLowerCase().replace(/\s+/g, "-");
    // A gap only if no page's slug contains this term as a complete run.
    let hasPage = false;
    for (const s of slugSet) {
      if (s === slug || s.includes(`-${slug}-`) || s.startsWith(`${slug}-`) || s.endsWith(`-${slug}`)) {
        hasPage = true;
        break;
      }
      if (s.includes(slug)) {
        hasPage = true;
        break;
      }
    }
    if (hasPage) continue;
    findings.push({
      check: "gap-concept",
      severity: "info",
      file: path.join(WIKI_DIR, "(corpus)"),
      message: `Term "${term}" appears in ${pageSet.size} pages but has no dedicated page`,
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function groupByCheck(findings: readonly Finding[]): Map<CheckId, Finding[]> {
  const out = new Map<CheckId, Finding[]>();
  for (const f of findings) {
    const arr = out.get(f.check) ?? [];
    arr.push(f);
    out.set(f.check, arr);
  }
  return out;
}

function relPath(p: string): string {
  const base = process.cwd();
  return p.startsWith(base) ? p.slice(base.length + 1) : p;
}

function buildReport(
  totalPages: number,
  findings: readonly Finding[],
): string {
  const grouped = groupByCheck(findings);
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# Wiki Lint Report — ${now}`);
  lines.push("");
  lines.push(`> Automated read-only audit of \`knowledge-base/wiki/\` against SCHEMA.md.`);
  lines.push(`> Generated by \`scripts/lint-wiki.ts\`. Do not edit by hand.`);
  lines.push("");
  lines.push(`- **Pages scanned**: ${totalPages}`);
  lines.push(`- **Total findings**: ${findings.length}`);
  const counts: Record<Severity, number> = {
    error: findings.filter((f) => f.severity === "error").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
  lines.push(`- **Severity breakdown**: error=${counts.error}, warning=${counts.warning}, info=${counts.info}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Check | Severity | Count | Recommendation |");
  lines.push("|-------|----------|-------|----------------|");
  for (const spec of CHECK_CATALOG) {
    const list = grouped.get(spec.id) ?? [];
    const sev = list.length
      ? list.reduce<Severity>((acc, f) => {
          if (acc === "error" || f.severity === "error") return "error";
          if (acc === "warning" || f.severity === "warning") return "warning";
          return "info";
        }, "info")
      : "info";
    lines.push(
      `| ${spec.title} | ${sev} | ${list.length} | ${spec.recommendation.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");
  for (const spec of CHECK_CATALOG) {
    const list = grouped.get(spec.id) ?? [];
    lines.push(`## ${spec.title} (${list.length})`);
    lines.push("");
    if (!list.length) {
      lines.push("_No findings._");
      lines.push("");
      continue;
    }
    lines.push(`**Recommendation**: ${spec.recommendation}`);
    lines.push("");
    lines.push("| # | Severity | File | Line | Message |");
    lines.push("|---|----------|------|------|---------|");
    const sample = list.slice(0, 20);
    sample.forEach((f, i) => {
      const linePart = f.line ? String(f.line) : "—";
      const msg = f.message.replace(/\|/g, "\\|").slice(0, 300);
      lines.push(`| ${i + 1} | ${f.severity} | \`${relPath(f.file)}\` | ${linePart} | ${msg} |`);
    });
    if (list.length > sample.length) {
      lines.push("");
      lines.push(`_Showing first 20 of ${list.length}._`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runLint(): Promise<{
  totalPages: number;
  findings: readonly Finding[];
}> {
  const fileNames = await listWikiPages();
  const pages: PageRecord[] = [];
  for (const f of fileNames) {
    pages.push(await loadPage(f));
  }
  const slugSet = new Set<string>(pages.map((p) => p.slug));

  const findings: Finding[] = [];
  findings.push(...checkFilenames(pages));
  findings.push(...checkDuplicateSlugs(pages));
  findings.push(...checkDeadWikilinks(pages, slugSet));
  findings.push(...checkOrphans(pages));
  findings.push(...checkBidirectional(pages, slugSet));
  findings.push(...checkStaleDiagrams(pages));
  findings.push(...checkMissingCitations(pages));
  findings.push(...checkSchemaSections(pages));
  findings.push(...checkDuplicateIndexEntries(pages));
  findings.push(...checkGapConcepts(pages, slugSet));

  return { totalPages: pages.length, findings };
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const { totalPages, findings } = await runLint();
  const report = buildReport(totalPages, findings);
  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, report, "utf8");
  const byCheck = groupByCheck(findings);
  const elapsed = Date.now() - t0;
  process.stdout.write(
    `[lint-wiki] scanned ${totalPages} pages in ${elapsed}ms — ` +
      `${findings.length} findings\n`,
  );
  for (const spec of CHECK_CATALOG) {
    const list = byCheck.get(spec.id) ?? [];
    if (list.length === 0) continue;
    process.stdout.write(`  - ${spec.title}: ${list.length}\n`);
  }
  process.stdout.write(`[lint-wiki] report written to ${relPath(REPORT_FILE)}\n`);
  // Touch meta files so LOG_FILE and INDEX_FILE are known to exist (used by callers).
  void LOG_FILE;
  void INDEX_FILE;
  const critical = findings.filter((f) => CRITICAL_SEVERITIES.has(f.severity));
  if (critical.length > 0) {
    process.stdout.write(
      `[lint-wiki] ${critical.length} error-level finding(s) — exit 1\n`,
    );
    process.exit(1);
  }
  process.exit(0);
}

// Run when invoked directly.
// Detect direct invocation via tsx: argv[1] ends with lint-wiki.ts.
const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /lint-wiki\.ts$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[lint-wiki] fatal: ${msg}\n`);
    process.exit(2);
  });
}
