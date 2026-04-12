#!/usr/bin/env tsx
/**
 * Two-pass court diagram extraction (CLAUDE.md: "Ingestion Pipeline").
 *
 * Pass 1 (already done): the wiki ingestion leaves breadcrumbs in each
 *   .md page like `<!-- DIAGRAM: needs visual extraction, p.9 -->`.
 *
 * Pass 2 (this script):
 *   1. Scan the wiki for those breadcrumbs.
 *   2. Rasterize the source PDF page with pdftoppm.
 *   3. Send image + page body to Claude; force a tool call that returns
 *      a Play-shaped JSON structure matching the TypeScript `Play` interface.
 *   4. Write a new wiki page with `court_data:` frontmatter and the Play
 *      as a generated TS data file under src/data/plays/<slug>.ts.
 *
 * Usage:
 *   npx tsx scripts/extract-diagrams.ts --dry-run            # list targets
 *   npx tsx scripts/extract-diagrams.ts --single blob-cross  # one diagram
 *   npx tsx scripts/extract-diagrams.ts                      # all 28
 *
 * Cost: ~$0.05 per diagram with Sonnet (image + short prompt).
 */

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Lightweight loader for `.env.local` (Next.js convention). We do not take
 * a dotenv dep for a one-file script. Each line is KEY=VALUE; comments and
 * blanks are ignored; existing process.env values are not overwritten.
 */
function loadEnvLocal(): void {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

const WIKI_DIR = path.join(process.cwd(), "knowledge-base", "wiki");
const RAW_DIR = path.join(process.cwd(), "knowledge-base", "raw");
const PLAYS_TS_DIR = path.join(process.cwd(), "src", "data", "plays");
const TMP_DIR = path.join(process.cwd(), ".cache", "diagram-frames");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const DPI = 200;

// Maps "S1" → source PDF basename. Keep in sync with scripts/ingest.ts.
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

// --- Types ---------------------------------------------------------------

interface DiagramTarget {
  slug: string; // wiki page slug
  wikiPath: string; // path to .md
  sourceId: string; // e.g. "S4"
  pageNumber: number; // first page referenced
  caption: string; // raw DIAGRAM comment line
  title: string; // page title
  category?: string;
  tags: string[];
}

// Matches the `Play` TS interface in src/lib/types.ts.
interface ExtractedPlay {
  name: string;
  tag: string;
  desc: string;
  players: Record<string, [number, number]>;
  roster: Record<string, { name: string; pos: string }>;
  ballStart: string;
  phases: Array<{
    label: string;
    text: string;
    detail?: string;
    actions: Array<{
      marker: "arrow" | "screen";
      path: string;
      dashed?: boolean;
      move?: { id: string; to: [number, number] };
      ball?: { from: string; to: string };
    }>;
  }>;
}

// --- Step 1: scan wiki ---------------------------------------------------

/**
 * Parse "DIAGRAM: needs visual extraction, p.9" or "pp.9-10" from a page.
 * Returns the first page number referenced.
 */
function parseDiagramComment(body: string): {
  page: number;
  caption: string;
} | null {
  const match = body.match(
    /<!--\s*DIAGRAM:\s*needs visual extraction[^-]*?p\.?p?\.?\s*(\d+)/i,
  );
  if (!match) return null;
  return {
    page: parseInt(match[1], 10),
    caption: match[0],
  };
}

/** Parse the source id from page body — looks for "[S4, p.9]" patterns. */
function parseFirstSource(body: string): string | null {
  const match = body.match(/\[(S\d+)[,\]\s]/);
  return match ? match[1] : null;
}

function scanTargets(): DiagramTarget[] {
  if (!fs.existsSync(WIKI_DIR)) return [];
  const files = fs
    .readdirSync(WIKI_DIR)
    .filter((f) => f.endsWith(".md") && !["index.md", "log.md"].includes(f));

  const targets: DiagramTarget[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8");
    const diagram = parseDiagramComment(raw);
    if (!diagram) continue;
    const sourceId = parseFirstSource(raw);
    if (!sourceId) {
      console.warn(`⚠ ${file}: no [S#] source id found, skipping`);
      continue;
    }
    const { data, content } = matter(raw);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    targets.push({
      slug: file.replace(/\.md$/, ""),
      wikiPath: path.join(WIKI_DIR, file),
      sourceId,
      pageNumber: diagram.page,
      caption: diagram.caption,
      title: titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, ""),
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags : [],
    });
  }
  return targets;
}

// --- Step 2: rasterize page ---------------------------------------------

function rasterizePage(target: DiagramTarget): string {
  const pdfBase = SOURCE_PDFS[target.sourceId];
  if (!pdfBase) {
    throw new Error(`Unknown source id ${target.sourceId}`);
  }
  const pdfPath = path.join(RAW_DIR, pdfBase);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Source PDF not found: ${pdfPath}`);
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const outPrefix = path.join(TMP_DIR, `${target.slug}-p${target.pageNumber}`);
  // pdftoppm -jpeg -r DPI -f page -l page pdf outPrefix → outPrefix-N.jpg
  execSync(
    `pdftoppm -jpeg -r ${DPI} -f ${target.pageNumber} -l ${target.pageNumber} "${pdfPath}" "${outPrefix}"`,
    { stdio: "pipe" },
  );
  // pdftoppm appends -<page> or padded -001 depending on version; glob it.
  const files = fs
    .readdirSync(TMP_DIR)
    .filter(
      (f) =>
        f.startsWith(`${target.slug}-p${target.pageNumber}`) &&
        f.endsWith(".jpg"),
    );
  if (files.length === 0) {
    throw new Error(`pdftoppm produced no output for ${target.slug}`);
  }
  return path.join(TMP_DIR, files[0]);
}

// --- Step 3: Claude call -------------------------------------------------

const extractPlayTool: Anthropic.Tool = {
  name: "write_play_diagram",
  description:
    "Extract basketball court coordinates and actions from a diagram image. Coordinates use SVG viewBox '-28 -3 56 50': origin at center-top, x in [-28, 28], y in [-3, 47].",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Play name" },
      tag: { type: "string", description: "Short category, e.g. 'BLOB'" },
      desc: { type: "string", description: "One-paragraph description" },
      players: {
        type: "object",
        description:
          "Map player id ('1'..'5') to starting [x, y] coordinates.",
        additionalProperties: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
        },
      },
      roster: {
        type: "object",
        description:
          "Map player id to {name, pos}. Use position abbrev only, no real NBA player names.",
        additionalProperties: {
          type: "object",
          properties: {
            name: { type: "string" },
            pos: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
          },
          required: ["name", "pos"],
        },
      },
      ballStart: {
        type: "string",
        description: "Player id that starts with the ball.",
      },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            text: { type: "string" },
            detail: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  marker: { type: "string", enum: ["arrow", "screen"] },
                  path: { type: "string", description: "SVG path d attribute" },
                  dashed: { type: "boolean" },
                  move: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      to: {
                        type: "array",
                        items: { type: "number" },
                        minItems: 2,
                        maxItems: 2,
                      },
                    },
                    required: ["id", "to"],
                  },
                  ball: {
                    type: "object",
                    properties: {
                      from: { type: "string" },
                      to: { type: "string" },
                    },
                    required: ["from", "to"],
                  },
                },
                required: ["marker", "path"],
              },
            },
          },
          required: ["label", "text", "actions"],
        },
      },
    },
    required: ["name", "tag", "desc", "players", "roster", "ballStart", "phases"],
  },
};

const SYSTEM_PROMPT = `You are an expert basketball play diagramming assistant.

Given an image of a basketball play diagram and its textual description, extract the play into a structured JSON format matching the SVG coordinate system:
- ViewBox: "-28 -3 56 50"
- Origin (0,0) at center-top of half court
- X axis: -28 (left sideline) to +28 (right sideline)
- Y axis: 0 (baseline) to 47 (half-court line)
- Hoop at approximately (0, 5.25)
- Free-throw line at y ≈ 19

Rules:
1. NO real NBA player names — use generic names like "Guard 1", "Wing 2", etc.
2. Keep positions within the court bounds.
3. SVG paths: use simple "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2" cubic Béziers for curves, or "M x1 y1 L x2 y2" for straight lines.
4. Pass lines: set dashed=true and marker="arrow". Cuts/drives: dashed=false.
5. Screens: marker="screen" for off-ball screen actions.
6. Every action should either MOVE a player or transfer the BALL (or both).
7. Phases break on significant tempo changes. Most plays have 2-3 phases.

Use the write_play_diagram tool with your extraction.`;

async function extractOne(
  client: Anthropic,
  target: DiagramTarget,
  imagePath: string,
): Promise<ExtractedPlay> {
  const imageData = fs.readFileSync(imagePath).toString("base64");
  const pageBody = fs.readFileSync(target.wikiPath, "utf-8");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageData,
            },
          },
          {
            type: "text",
            text: `Extract the play diagram from page ${target.pageNumber} of "${target.sourceId}" into structured coordinates.\n\nTitle: ${target.title}\nCategory: ${target.category ?? "unknown"}\nTags: ${target.tags.join(", ")}\n\nWiki page body follows — use it as the authoritative description of what happens in the play:\n\n${pageBody.slice(0, 4000)}`,
          },
        ],
      },
    ],
    tools: [extractPlayTool],
    tool_choice: { type: "tool", name: "write_play_diagram" },
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("no tool_use block in response");
  return toolUse.input as ExtractedPlay;
}

// --- Step 4: validate + write -------------------------------------------

function validate(play: ExtractedPlay): string[] {
  const errs: string[] = [];
  for (const [id, pos] of Object.entries(play.players)) {
    if (!Array.isArray(pos) || pos.length !== 2) {
      errs.push(`player ${id} position is not [x,y]`);
      continue;
    }
    const [x, y] = pos;
    if (x < -28 || x > 28) errs.push(`player ${id} x=${x} out of viewBox`);
    if (y < -3 || y > 47) errs.push(`player ${id} y=${y} out of viewBox`);
  }
  if (!play.players[play.ballStart]) {
    errs.push(`ballStart "${play.ballStart}" not in players map`);
  }
  if (play.phases.length === 0) errs.push("no phases");
  for (const [i, phase] of play.phases.entries()) {
    if (phase.actions.length === 0)
      errs.push(`phase ${i} has zero actions`);
  }
  return errs;
}

function toTsModule(slug: string, play: ExtractedPlay): string {
  const camel = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  return `// GENERATED by scripts/extract-diagrams.ts — do not edit by hand.
// Source: wiki slug "${slug}"
import type { Play } from "@/lib/types";

export const ${camel}: Play = ${JSON.stringify(play, null, 2)};
`;
}

function writeOutputs(target: DiagramTarget, play: ExtractedPlay) {
  fs.mkdirSync(PLAYS_TS_DIR, { recursive: true });
  const outPath = path.join(PLAYS_TS_DIR, `${target.slug}.ts`);
  fs.writeFileSync(outPath, toTsModule(target.slug, play), "utf-8");
  return outPath;
}

// --- Orchestration -------------------------------------------------------

function parseArgs(argv: string[]): {
  dryRun: boolean;
  single: string | null;
  limit: number | null;
} {
  const out = { dryRun: false, single: null as string | null, limit: null as number | null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--single") out.single = argv[++i] ?? null;
    else if (a === "--limit") out.limit = parseInt(argv[++i] ?? "0", 10);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  let targets = scanTargets();
  if (args.single) {
    targets = targets.filter((t) => t.slug === args.single);
    if (targets.length === 0) {
      console.error(`No target matches slug "${args.single}"`);
      process.exit(1);
    }
  }
  if (args.limit && args.limit > 0) targets = targets.slice(0, args.limit);

  console.log(`Found ${targets.length} diagram target(s).`);
  if (args.dryRun) {
    for (const t of targets) {
      console.log(`  ${t.slug} [${t.sourceId} p.${t.pageNumber}] "${t.title}"`);
    }
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set — aborting (use --dry-run to preview).");
    process.exit(1);
  }

  const client = new Anthropic();
  let ok = 0;
  let failed = 0;
  for (const target of targets) {
    process.stdout.write(`  ${target.slug} … `);
    try {
      const imgPath = rasterizePage(target);
      const play = await extractOne(client, target, imgPath);
      const errs = validate(play);
      if (errs.length > 0) {
        console.log(`VALIDATION FAILED: ${errs.join("; ")}`);
        failed++;
        continue;
      }
      const wrote = writeOutputs(target, play);
      console.log(`✓ ${path.relative(process.cwd(), wrote)}`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERROR: ${msg}`);
      failed++;
    }
  }
  console.log(`\nDone: ${ok} extracted, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
