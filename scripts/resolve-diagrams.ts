#!/usr/bin/env npx tsx
/**
 * Basketball Coaching Wiki — Diagram Resolution Pipeline
 *
 * Scans wiki pages for `<!-- DIAGRAM: ... -->` markers, extracts the cited
 * source PDF page(s), asks Claude to interpret the diagram + surrounding
 * prose, and emits a structured JSON positions block that replaces the
 * marker in place.
 *
 * Court coordinate system: viewBox="-28 -3 56 50".
 *   - Origin (0,0) = center of the top of the half court (half-court line / center).
 *   - x ∈ [-28, 28] (negative = left side of court facing the basket).
 *   - y ∈ [-3, 47]   (y increases going toward the baseline / basket).
 *   - The rim sits near (0, ~43). The free-throw line is near y ≈ 29.
 *   - Common anchors: top_of_key ≈ (0, 24); left_wing ≈ (-18, 22);
 *     right_wing ≈ (18, 22); left_corner ≈ (-22, 42); right_corner ≈ (22, 42);
 *     left_elbow ≈ (-8, 29); right_elbow ≈ (8, 29); left_block ≈ (-7, 40);
 *     right_block ≈ (7, 40); out-of-bounds baseline: y ≈ 47.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/resolve-diagrams.ts [options]
 *
 * Options:
 *   --dry-run                Scan + report only; writes docs/diagram-resolution-plan.md
 *   --sample <s1,s2,s3>      Comma-separated wiki slugs (without .md) to actually resolve
 *   --model <id>             Claude model (default: claude-sonnet-4-6)
 *   --max-tokens <n>         Model max_tokens (default: 8192)
 *
 * Examples:
 *   npx tsx scripts/resolve-diagrams.ts --dry-run
 *   npx tsx scripts/resolve-diagrams.ts --sample 23-flare,32-lob,blob-cross
 */

import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

// ── Minimal .env.local loader (no new deps) ────────────────────────────
// Next.js loads .env.local for the dev server but tsx scripts do not
// inherit that behaviour. Load it manually so ANTHROPIC_API_KEY is
// available without having to pass it on the command line.
function loadEnvLocal(): void {
  const envPath = path.resolve(".env.local");
  if (!fsSync.existsSync(envPath)) return;
  const raw = fsSync.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnvLocal();

// ── Constants ──────────────────────────────────────────────────────────

const WIKI_DIR = path.resolve("knowledge-base/wiki");
const RAW_DIR = path.resolve("knowledge-base/raw");
const PLAN_PATH = path.resolve("docs/diagram-resolution-plan.md");
const PLAYS_DIR = path.resolve("src/data/plays");
const OFFSETS_PATH = path.resolve("scripts/.page-offsets.json");

// Per-source printed-page-to-physical-page offsets (physical = printed + offset).
// Loaded from scripts/.page-offsets.json at startup (populated by
// scripts/detect-page-offsets.ts). Missing entries default to 0.
let PAGE_OFFSETS: Record<string, number> = {};
try {
  if (fsSync.existsSync(OFFSETS_PATH)) {
    const raw = fsSync.readFileSync(OFFSETS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { offsets?: Record<string, number> };
    PAGE_OFFSETS = parsed.offsets ?? {};
  }
} catch {
  // Missing or malformed offsets file is non-fatal; default to zero offsets.
  PAGE_OFFSETS = {};
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;
const CONTEXT_LINES = 40; // lines of prose around the marker to send as context

// Source id → PDF filename lookup (mirrors scripts/ingest.ts)
const SOURCE_PDFS: Record<string, string> = {
  S1: "lets-talk-defense.pdf",
  S2: "basketball-anatomy.pdf",
  S3: "offensive-skill-development.pdf",
  S4: "basketball-for-coaches.pdf",
  S5: "basketball-shooting.pdf",
  S6: "footwork-balance-pivoting.pdf",
  S7: "nba-coaches-playbook.pdf",
  S8: "speed-agility-quickness.pdf",
  S9: "explosive-calisthenics.pdf",
};

// ── Types ──────────────────────────────────────────────────────────────

interface MarkerRecord {
  slug: string;           // wiki slug without .md
  filePath: string;       // absolute path to wiki file
  line: number;           // 1-indexed line number of marker
  rawMarker: string;      // exact marker text including <!-- ... -->
  markerBody: string;     // text inside the marker
  sourceId: string | null; // e.g., "S4"
  pages: number[];        // resolved page numbers (1-indexed); may be empty
  pageHint: number | null; // first page hint parsed from marker body
  wikiType: string | null; // frontmatter "type" (play/concept/drill)
  wikiTitle: string;       // first H1 of the wiki page
  prose: string;           // surrounding prose (multi-line context)
  isRegisteredPlay: boolean; // whether a synthesized play exists for this slug
}

interface PlayerPosition {
  role: string;
  x: number;
  y: number;
}

interface ActionEdge {
  from: string;
  to: string;
  type: string;
}

interface DiagramJson {
  players: PlayerPosition[];
  actions: ActionEdge[];
  notes?: string;
}

interface ParsedArgs {
  dryRun: boolean;
  sampleSlugs: string[] | null;
  sourceIds: string[] | null;
  limit: number | null;
  model: string;
  maxTokens: number;
}

// ── CLI Parsing ────────────────────────────────────────────────────────

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const flagIdx = (name: string): number => args.indexOf(name);
  const flagValue = (name: string, fallback: string): string => {
    const i = flagIdx(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
  };

  const sampleRaw = flagValue("--sample", "");
  const sampleSlugs = sampleRaw
    ? sampleRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const sourceRaw = flagValue("--source", "");
  const sourceIds = sourceRaw
    ? sourceRaw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : null;

  const limitRaw = flagValue("--limit", "");
  const limit = limitRaw ? parseInt(limitRaw, 10) : null;

  return {
    dryRun: args.includes("--dry-run"),
    sampleSlugs,
    sourceIds,
    limit: limit !== null && Number.isFinite(limit) && limit > 0 ? limit : null,
    model: flagValue("--model", DEFAULT_MODEL),
    maxTokens: parseInt(flagValue("--max-tokens", String(DEFAULT_MAX_TOKENS)), 10),
  };
}

// ── Marker Scanning ────────────────────────────────────────────────────

const MARKER_REGEX = /<!--\s*DIAGRAM:\s*([\s\S]*?)-->/g;

// Matches things like: [S4, p.9], [S4, pp.35-36], p.35, p.9
const SOURCE_CITE_REGEX = /\[S(\d)(?:,\s*pp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\]/g;
const PAGE_ONLY_REGEX = /\bpp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/g;

function parseSourceAndPages(
  markerBody: string,
  surroundingProse: string
): { sourceId: string | null; pages: number[]; pageHint: number | null } {
  // First, try to find a source citation anywhere in the marker body.
  const combined = `${markerBody}\n${surroundingProse}`;
  let sourceId: string | null = null;
  const pageSet = new Set<number>();
  let firstHint: number | null = null;

  // Prefer source-explicit citations in the marker body itself, then surrounding prose.
  for (const text of [markerBody, surroundingProse]) {
    SOURCE_CITE_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SOURCE_CITE_REGEX.exec(text)) !== null) {
      const sid = `S${m[1]}`;
      if (!sourceId) sourceId = sid;
      const start = m[2] ? parseInt(m[2], 10) : NaN;
      const end = m[3] ? parseInt(m[3], 10) : start;
      if (!Number.isNaN(start)) {
        if (firstHint === null) firstHint = start;
        for (let p = start; p <= end; p++) pageSet.add(p);
      }
    }
    if (sourceId && pageSet.size > 0) break;
  }

  // Fallback: plain "p.XX" hint from marker body.
  if (pageSet.size === 0) {
    PAGE_ONLY_REGEX.lastIndex = 0;
    const m = PAGE_ONLY_REGEX.exec(markerBody);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      if (!Number.isNaN(start)) {
        if (firstHint === null) firstHint = start;
        for (let p = start; p <= end; p++) pageSet.add(p);
      }
    }
  }

  // If we still have no source, look for one in the combined text (last resort).
  if (!sourceId) {
    SOURCE_CITE_REGEX.lastIndex = 0;
    const m = SOURCE_CITE_REGEX.exec(combined);
    if (m) sourceId = `S${m[1]}`;
  }

  return {
    sourceId,
    pages: [...pageSet].sort((a, b) => a - b),
    pageHint: firstHint,
  };
}

function extractFrontmatterType(content: string): string | null {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const match = fm[1].match(/^\s*type:\s*([A-Za-z_-]+)/m);
  return match ? match[1] : null;
}

function extractTitle(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function sliceProse(lines: string[], centerLine: number): string {
  const lo = Math.max(0, centerLine - CONTEXT_LINES);
  const hi = Math.min(lines.length, centerLine + CONTEXT_LINES);
  return lines.slice(lo, hi).join("\n");
}

async function scanAllMarkers(): Promise<MarkerRecord[]> {
  const entries = await fs.readdir(WIKI_DIR);
  const mdFiles = entries.filter((f) => f.endsWith(".md") && f !== "index.md" && f !== "log.md");

  // Figure out which slugs are registered plays (for "high-value" scoring).
  const playFiles = await fs
    .readdir(PLAYS_DIR)
    .catch(() => [] as string[]);
  const registeredSlugs = new Set(
    playFiles
      .filter((f) => f.endsWith(".ts") && f !== "index.ts")
      .map((f) => f.replace(/\.ts$/, ""))
  );

  const records: MarkerRecord[] = [];

  for (const file of mdFiles) {
    const filePath = path.join(WIKI_DIR, file);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const slug = file.replace(/\.md$/, "");
    const wikiType = extractFrontmatterType(content);
    const wikiTitle = extractTitle(content);
    const isRegisteredPlay = registeredSlugs.has(slug);

    // Find every marker occurrence with its line number.
    MARKER_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKER_REGEX.exec(content)) !== null) {
      const raw = match[0];
      const body = match[1].trim();
      // Derive line number from byte offset.
      const offset = match.index;
      const before = content.slice(0, offset);
      const line = before.split("\n").length;

      const prose = sliceProse(lines, line - 1);
      const { sourceId, pages, pageHint } = parseSourceAndPages(body, prose);

      records.push({
        slug,
        filePath,
        line,
        rawMarker: raw,
        markerBody: body,
        sourceId,
        pages,
        pageHint,
        wikiType,
        wikiTitle,
        prose,
        isRegisteredPlay,
      });
    }
  }

  return records;
}

// ── PDF Page Extraction ────────────────────────────────────────────────

async function extractPdfPagesAsBase64(
  pdfPath: string,
  printedPages: number[],
  sourceId: string
): Promise<string> {
  const buffer = await fs.readFile(pdfPath);
  const pdfBytes = new Uint8Array(buffer);
  const srcDoc = await PDFDocument.load(pdfBytes);
  const total = srcDoc.getPageCount();

  // Convert printed page numbers to physical page indices using the per-source
  // offset (physical = printed + offset). Citations in the wiki reference the
  // book's printed page numbers; the PDF's physical index is shifted by front
  // matter (cover, TOC, preface, acknowledgments).
  const offset = PAGE_OFFSETS[sourceId] ?? 0;
  const indices0 = printedPages
    .map((p) => p + offset)
    .filter((physical) => physical >= 1 && physical <= total)
    .map((physical) => physical - 1);

  if (indices0.length === 0) {
    throw new Error(
      `No valid pages in range (requested printed ${printedPages.join(", ")} +offset ${offset}; PDF has ${total} pages)`
    );
  }

  const outDoc = await PDFDocument.create();
  const copied = await outDoc.copyPages(srcDoc, indices0);
  for (const page of copied) outDoc.addPage(page);
  const outBytes = await outDoc.save();
  return Buffer.from(outBytes).toString("base64");
}

// ── Claude Prompting ───────────────────────────────────────────────────

const emitDiagramTool: Anthropic.Tool = {
  name: "emit_diagram_positions",
  description:
    "Emit the structured player positions and actions for a basketball court diagram on the provided PDF page(s). Use the court coordinate system described in the system prompt. Return ONLY what is directly depicted on the diagram. If multiple sub-diagrams exist (e.g., Phase 1 and Phase 2), emit the STARTING formation unless the marker specifies otherwise.",
  input_schema: {
    type: "object" as const,
    properties: {
      players: {
        type: "array",
        description:
          "Offensive players with their on-court positions at the start of the depicted action.",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              description:
                'Player role label as used in the wiki — typically "1".."5" for offense, "x1".."x5" for defenders, or "OB" for an out-of-bounds inbounder.',
            },
            x: {
              type: "number",
              description: "Horizontal coord in viewBox (-28 left to 28 right).",
            },
            y: {
              type: "number",
              description:
                "Vertical coord in viewBox (-3 half-court line to 47 baseline). Larger y = closer to the rim.",
            },
          },
          required: ["role", "x", "y"],
        },
      },
      actions: {
        type: "array",
        description:
          "Directed actions depicted by arrows on the diagram: passes, cuts, screens, dribbles. If no action arrows are clearly depicted, return an empty array.",
        items: {
          type: "object",
          properties: {
            from: { type: "string", description: "Role initiating the action." },
            to: {
              type: "string",
              description:
                "Role receiving the action, or a target anchor (e.g., 'rim', 'left_corner'). Required even for cuts (use the destination anchor).",
            },
            type: {
              type: "string",
              enum: ["pass", "cut", "screen", "dribble", "handoff"],
              description: "Kind of action.",
            },
          },
          required: ["from", "to", "type"],
        },
      },
      notes: {
        type: "string",
        description:
          "Optional short note if the diagram is ambiguous or if the depicted formation differs from the wiki prose.",
      },
    },
    required: ["players", "actions"],
  },
};

function buildSystemPrompt(): string {
  return `You are a basketball diagram interpreter. You are given a scan of one or more pages from a basketball coaching book, plus surrounding wiki prose describing the play. Your job is to extract the STARTING on-court positions and any clearly depicted action arrows from the book's diagram into a structured JSON format.

## Court Coordinate System (MUST follow exactly)

SVG viewBox = "-28 -3 56 50". This is a HALF COURT.
- Origin (0, 0) is the center of the half-court line (top of the half court).
- x ranges from -28 (left sideline) to +28 (right sideline).
- y ranges from -3 (a bit past half-court) to +47 (baseline behind the rim).
- Rim: (0, 43). Free-throw line: (0, 29). Top of the key arc: (0, 24).
- Left wing: (-18, 22). Right wing: (18, 22).
- Left corner: (-22, 42). Right corner: (22, 42).
- Left elbow: (-8, 29). Right elbow: (8, 29).
- Left low block: (-7, 40). Right low block: (7, 40).
- Out-of-bounds inbounder (baseline): y ≈ 47, pick an x based on the diagram.

The ball-side in the diagram is the side the book shows — do NOT flip or mirror.

## Role Labels

- Offense: "1", "2", "3", "4", "5" (match the wiki prose labels).
- Defense: "x1", "x2", ..., "x5" if shown.
- Inbounder: "OB" or the numeric role if the wiki uses a number.

## Rules

1. Report ONLY what is actually depicted on the diagram pages you received.
2. If the book shows multiple diagrams (e.g., Phase 1, Phase 2), extract the INITIAL formation (the first diagram) unless the marker body explicitly requests a later phase.
3. Keep positions within the viewBox. Use reasonable approximations — do not guess wildly.
4. If a player is not visible in the diagram (e.g., the inbounder is cut off), omit them rather than inventing coordinates.
5. If the diagram is unreadable, return an empty players array and explain in notes.
6. Call emit_diagram_positions exactly once.`;
}

function buildUserPrompt(record: MarkerRecord): string {
  return `## Wiki page
Title: ${record.wikiTitle}
Slug: ${record.slug}
Type: ${record.wikiType ?? "(unknown)"}

## Diagram marker in wiki (verbatim)
${record.rawMarker}

## Surrounding wiki prose (context only — the book diagram is authoritative for coordinates)
${record.prose}

## Task
Interpret the book diagram on the attached PDF page(s). Emit the starting on-court formation (and any clear action arrows) using emit_diagram_positions. Follow the coordinate system exactly as specified in the system prompt.`;
}

// ── Resolution ─────────────────────────────────────────────────────────

async function resolveOne(
  client: Anthropic,
  model: string,
  maxTokens: number,
  record: MarkerRecord
): Promise<DiagramJson> {
  if (!record.sourceId || !SOURCE_PDFS[record.sourceId]) {
    throw new Error(
      `Marker has no resolvable source citation (sourceId=${record.sourceId ?? "null"})`
    );
  }
  if (record.pages.length === 0) {
    throw new Error(`Marker has no page numbers (source=${record.sourceId})`);
  }

  const pdfPath = path.join(RAW_DIR, SOURCE_PDFS[record.sourceId]);
  const base64 = await extractPdfPagesAsBase64(pdfPath, record.pages, record.sourceId);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: buildUserPrompt(record),
          },
        ],
      },
    ],
    tools: [emitDiagramTool],
    tool_choice: { type: "tool", name: "emit_diagram_positions" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a tool call");
  }

  const input = toolUse.input as DiagramJson;
  if (!Array.isArray(input.players)) {
    throw new Error("Tool response missing players array");
  }
  if (!Array.isArray(input.actions)) {
    // Tolerate missing actions — set to empty.
    input.actions = [];
  }

  return {
    players: input.players.map((p) => ({
      role: String(p.role),
      x: Number(p.x),
      y: Number(p.y),
    })),
    actions: input.actions.map((a) => ({
      from: String(a.from),
      to: String(a.to),
      type: String(a.type),
    })),
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

// ── In-Place Wiki Update ───────────────────────────────────────────────

function buildReplacementBlock(diagram: DiagramJson): string {
  const payload: DiagramJson = {
    players: diagram.players,
    actions: diagram.actions,
    ...(diagram.notes ? { notes: diagram.notes } : {}),
  };
  return [
    "```json name=diagram-positions",
    JSON.stringify(payload),
    "```",
  ].join("\n");
}

async function replaceMarkerInFile(
  record: MarkerRecord,
  replacement: string
): Promise<void> {
  const content = await fs.readFile(record.filePath, "utf-8");
  // Replace ONLY the first occurrence of this exact marker to avoid touching
  // other DIAGRAM markers in the same file.
  const idx = content.indexOf(record.rawMarker);
  if (idx < 0) {
    throw new Error(
      `Marker not found verbatim in ${record.filePath} — aborting replace`
    );
  }
  const updated =
    content.slice(0, idx) +
    replacement +
    content.slice(idx + record.rawMarker.length);
  await fs.writeFile(record.filePath, updated, "utf-8");
}

// ── Dry-Run Plan Report ────────────────────────────────────────────────

function scoreRecord(r: MarkerRecord): number {
  // Higher = higher value to resolve.
  let score = 0;
  if (r.isRegisteredPlay) score += 100;          // active plays in the SVG viewer
  if (r.wikiType === "play") score += 30;        // any play page
  if (r.sourceId && r.pages.length > 0) score += 20; // actually resolvable
  if (r.markerBody.includes("needs visual extraction")) score += 15;
  if (r.wikiType === "concept") score += 5;
  return score;
}

async function writePlan(records: MarkerRecord[]): Promise<void> {
  const total = records.length;
  const bySource: Record<string, number> = {};
  let resolvable = 0;
  let unresolvable = 0;
  for (const r of records) {
    const key = r.sourceId ?? "UNKNOWN";
    bySource[key] = (bySource[key] ?? 0) + 1;
    if (r.sourceId && r.pages.length > 0) resolvable++;
    else unresolvable++;
  }

  const ranked = [...records].sort((a, b) => scoreRecord(b) - scoreRecord(a));
  const top = ranked.slice(0, 20);

  const sourceRows = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([sid, count]) => {
      const pdf = sid in SOURCE_PDFS ? SOURCE_PDFS[sid] : "—";
      return `| ${sid} | ${count} | ${pdf} |`;
    })
    .join("\n");

  const topRows = top
    .map((r, i) => {
      const pages = r.pages.length > 0 ? r.pages.join(",") : "—";
      const src = r.sourceId ?? "—";
      const reg = r.isRegisteredPlay ? "yes" : "no";
      return `| ${i + 1} | ${r.slug} | ${r.wikiType ?? "—"} | ${src} | ${pages} | ${reg} | ${scoreRecord(r)} |`;
    })
    .join("\n");

  const body = `# Diagram Resolution Plan

Generated: ${new Date().toISOString()}

## Marker Inventory

- Total DIAGRAM markers: **${total}**
- Resolvable (source + page known): **${resolvable}**
- Unresolvable without manual help: **${unresolvable}**

## Distribution by Source

| Source | Markers | PDF |
|--------|---------|-----|
${sourceRows}

## Top 20 Highest-Value Markers

Score rewards registered plays (synthesized SVG exists), play-type pages, resolvable citations, and explicit "needs visual extraction" notes.

| # | Slug | Type | Source | Pages | Registered play | Score |
|---|------|------|--------|-------|-----------------|-------|
${topRows}

## Recommended Next Batch

1. Resolve all markers on registered plays in \`src/data/plays/\` first — these directly feed the SVG viewer and fidelity gates.
2. Then resolve play-type wiki pages whose source + pages are known (S4, S7 plays).
3. Finally, resolve concept pages with visual extraction markers (S6 footwork, S1 defense).

Run a sample with:

\`\`\`bash
npx tsx scripts/resolve-diagrams.ts --sample 23-flare,32-lob,blob-cross
\`\`\`
`;

  await fs.mkdir(path.dirname(PLAN_PATH), { recursive: true });
  await fs.writeFile(PLAN_PATH, body, "utf-8");
}

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  process.stdout.write(`Scanning wiki for DIAGRAM markers...\n`);
  const records = await scanAllMarkers();
  process.stdout.write(`  Found ${records.length} markers across wiki pages.\n\n`);

  if (args.dryRun) {
    await writePlan(records);
    process.stdout.write(`Dry run: wrote plan to ${PLAN_PATH}\n`);
    return;
  }

  // Always write the plan as a side effect so latest inventory is on disk.
  await writePlan(records);

  const hasSample = args.sampleSlugs && args.sampleSlugs.length > 0;
  const hasSource = args.sourceIds && args.sourceIds.length > 0;

  if (!hasSample && !hasSource) {
    process.stdout.write(
      `No --sample slugs, --source ids, or --dry-run. Plan written to ${PLAN_PATH}.\n`
    );
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    process.stdout.write(
      `ANTHROPIC_API_KEY not set — skipping actual resolution.\n`
    );
    return;
  }

  const targets: MarkerRecord[] = [];
  if (hasSample && args.sampleSlugs) {
    // Pick one resolvable marker per requested slug.
    for (const slug of args.sampleSlugs) {
      const candidates = records.filter(
        (r) => r.slug === slug && r.sourceId !== null && r.pages.length > 0
      );
      if (candidates.length === 0) {
        process.stdout.write(
          `  ! ${slug}: no resolvable marker (missing source or page). Skipping.\n`
        );
        continue;
      }
      targets.push(candidates[0]);
    }
  }
  if (hasSource && args.sourceIds) {
    // Include EVERY resolvable marker whose sourceId is in the requested set.
    const requestedSources = new Set(args.sourceIds);
    for (const r of records) {
      if (
        r.sourceId !== null &&
        requestedSources.has(r.sourceId) &&
        r.pages.length > 0
      ) {
        targets.push(r);
      }
    }
  }

  if (targets.length === 0) {
    process.stdout.write(`No resolvable targets. Exiting.\n`);
    return;
  }

  // Apply --limit if provided (cap the batch size for cost control).
  const capped = args.limit !== null ? targets.slice(0, args.limit) : targets;

  const client = new Anthropic();
  process.stdout.write(
    `Resolving ${capped.length}${args.limit !== null && targets.length > capped.length ? ` of ${targets.length}` : ""} markers with ${args.model}...\n\n`
  );

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < capped.length; i++) {
    const record = capped[i];
    const label = `[${i + 1}/${capped.length}] ${record.slug} L${record.line} ${record.sourceId} p.${record.pages.join(",")}`;
    process.stdout.write(`${label} ... `);
    try {
      const diagram = await resolveOne(client, args.model, args.maxTokens, record);
      const replacement = buildReplacementBlock(diagram);
      await replaceMarkerInFile(record, replacement);
      process.stdout.write(
        `OK (${diagram.players.length} players, ${diagram.actions.length} actions)\n`
      );
      okCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`FAIL: ${msg}\n`);
      failCount++;
    }

    // Gentle throttling between calls to stay comfortably below rate limits.
    if (i < capped.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  process.stdout.write(
    `\nDone. ${okCount} ok, ${failCount} failed, ${capped.length} total.\nPlan: ${PLAN_PATH}\n`
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${msg}\n`);
  process.exit(1);
});
