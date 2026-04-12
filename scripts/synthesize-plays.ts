#!/usr/bin/env tsx
/**
 * Synthesize animated plays from wiki prose.
 *
 * Better replacement for scripts/extract-diagrams.ts — no PDF, no image,
 * no pixel guessing. Reads the wiki page's structured narrative, asks
 * Claude for a SemanticPlay (named court positions), runs our
 * deterministic translator to produce a Play with SVG coordinates.
 *
 * Benefits vs image-based extraction:
 *   - ~10× cheaper (no image tokens)
 *   - Deterministic re-runs
 *   - Textbook-accurate positions (canonical vocabulary)
 *   - Works on any wiki play, even ones without a diagram in the book
 *
 * Usage:
 *   npx tsx scripts/synthesize-plays.ts --dry-run
 *   npx tsx scripts/synthesize-plays.ts --single blob-cross
 *   npx tsx scripts/synthesize-plays.ts --limit 5
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import {
  POSITION_NAMES,
  type PositionName,
} from "../src/lib/court/positions";
import {
  synthesizePlay,
  validateSemanticPlay,
  type SemanticPlay,
} from "../src/lib/court/synthesize";
import {
  revalidateAllPlays,
  printRevalidateReport,
} from "./revalidate-plays";
import { extractDiagramPositionsRaw } from "../src/lib/court/diagram-positions";

// --- Env loader (lightweight .env.local) ---------------------------------

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

// --- Config --------------------------------------------------------------

const WIKI_DIR = path.join(process.cwd(), "knowledge-base", "wiki");
const PLAYS_TS_DIR = path.join(process.cwd(), "src", "data", "plays");
const INDEX_PATH = path.join(PLAYS_TS_DIR, "index.ts");
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

interface Target {
  slug: string;
  path: string;
  title: string;
  category?: string;
  tags: string[];
  body: string;
}

function scanTargets(): Target[] {
  if (!fs.existsSync(WIKI_DIR)) return [];
  const out: Target[] = [];
  for (const file of fs.readdirSync(WIKI_DIR)) {
    if (!file.endsWith(".md")) continue;
    if (file === "index.md" || file === "log.md") continue;
    const raw = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    if (data.type !== "play") continue;
    const title = (content.match(/^#\s+(.+)$/m)?.[1] ?? file).trim();
    out.push({
      slug: file.replace(/\.md$/, ""),
      path: path.join(WIKI_DIR, file),
      title,
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags : [],
      body: content,
    });
  }
  return out;
}

// --- Claude tool definition ---------------------------------------------

// Build the JSON-schema enum for positions from the canonical list so the
// prompt's vocabulary is always in sync with the positions module.
const positionEnum = [...POSITION_NAMES];

const writeSemanticPlayTool: Anthropic.Tool = {
  name: "write_semantic_play",
  description:
    "Encode a basketball play as a SemanticPlay: players at named court positions, actions referencing position names (cut/pass/screen/handoff/dribble). A deterministic translator converts this to SVG coordinates.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      tag: { type: "string", description: "Short category label, e.g. 'BLOB'" },
      desc: { type: "string" },
      players: {
        type: "object",
        description:
          "Map player id ('1'..'5') to a named starting position. Must include exactly 5 entries for a full-court play or fewer for situational plays.",
        additionalProperties: {
          type: "string",
          enum: positionEnum,
        },
      },
      roster: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Generic name like 'Guard 1' or 'Post 5'. NO real NBA player names.",
            },
            pos: {
              type: "string",
              enum: ["PG", "SG", "SF", "PF", "C"],
            },
          },
          required: ["name", "pos"],
        },
      },
      ballStart: {
        type: "string",
        description:
          "Player id ('1'..'5') who starts with the ball — NOT a position name. Must be a key in the players map.",
      },
      phases: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            text: { type: "string" },
            detail: { type: "string" },
            actions: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["cut", "screen", "pass", "dribble", "handoff"],
                  },
                  player: { type: "string" },
                  to: { type: "string", enum: positionEnum },
                  screener: { type: "string" },
                  cutter: { type: "string" },
                  at: { type: "string", enum: positionEnum },
                  cutter_to: { type: "string", enum: positionEnum },
                  from_player: { type: "string" },
                  to_player: { type: "string" },
                  giver: { type: "string" },
                  receiver: { type: "string" },
                  bias: {
                    type: "string",
                    enum: [
                      "straight",
                      "toward_basket",
                      "away_from_basket",
                      "left",
                      "right",
                    ],
                  },
                },
                required: ["type"],
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

const SYSTEM_PROMPT = `You encode basketball plays for a coaching app.

You receive a wiki page describing a play and must emit a SemanticPlay via
the write_semantic_play tool. You DO NOT need to output SVG coordinates —
players sit at named court positions and actions reference those names. A
downstream translator computes coordinates deterministically.

DIAGRAM-GROUNDED POSITIONS (when present):
If the user message includes a DIAGRAM_POSITIONS block containing JSON with
player x/y coordinates (extracted from the source book's court diagram), use
those coordinates as GROUND TRUTH for starting positions. Map each x/y pair
to the nearest canonical position from the vocabulary. The diagram reflects
what the book actually depicts; prose descriptions are secondary when the
diagram exists. If diagram positions and prose disagree, trust the diagram
unless its note field explicitly says "reconstructed from prose" or
"no diagram on this page".

Action types:
  cut        { player, to, bias? }           — player moves to a named spot
  screen     { screener, cutter, at, cutter_to, bias? }
                                             — screener sets screen at "at";
                                               cutter moves to "cutter_to"
  pass       { from_player, to_player }      — ball pass
  dribble    { player, to, bias? }           — dribble move
  handoff    { giver, receiver, at }         — ball handoff at spot

Conventions:
  - 5 players with ids "1","2","3","4","5" (or fewer for BLOB/SLOB plays)
  - Generic roster names ("Guard 1","Wing 2","Post 4"). NO NBA names.
  - Every phase has 1-3 actions.
  - For BLOB plays, the inbounder sits at "baseline_center" or a baseline_* position.
  - For SLOB plays, inbounder uses sideline_left_high or sideline_right_high.

Prefer canonical labels over creative ones: "left_wing" beats "wing-ish",
"low_post" beats "just outside the paint". The position vocabulary is
fixed — if the play calls for a spot not in the list, pick the nearest
valid one.

CRITICAL — NO COLLISIONS:
At the END of every phase, ALL players must be at DISTINCT positions. Never
put two players at the same named position, and never move one player to a
position another player already occupies unless the first player moves
away in the same phase.

Common pitfalls to avoid:
  - A flare screen's "at" spot must NOT equal any player's existing position.
    Pick a spot 9+ units away from all other players.
  - When text says "X dribbles toward the wing", do NOT move X to the same
    slot another player occupies. The dribble may end short of the wing, or
    the text may be describing direction, not destination. If in doubt,
    don't move a player whose final position isn't stated.
  - Two players cannot screen at the same spot; the screener "at" and the
    cutter "cutter_to" must be distinct.
  - Spots along the same y (e.g. left_wing vs. right_wing) are safe; spots
    at the same coordinate (e.g. two players both at left_slot) are NOT.

When the wiki says "player stays" or "player holds position", emit NO cut
or dribble action for that player in that phase.

Use the wiki page body as the authoritative source — it already describes
phase-by-phase actions. Your job is structural translation, not creativity.`;

// --- Script orchestration -----------------------------------------------

function camelCase(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Camel-cased identifiers used by index.ts imports. Some slugs start with
 * a digit (e.g. "23-flare"); those are not valid JS identifiers, so we
 * prefix with "play_" to keep imports legal.
 */
function toIdentifier(slug: string): string {
  const c = camelCase(slug);
  return /^[0-9]/.test(c) ? `play_${c}` : c;
}

/**
 * Rewrite src/data/plays/index.ts so every .ts file in the directory
 * (except index.ts itself) is imported and registered in PLAYS_BY_SLUG.
 * Sorted alphabetically by slug for stable diffs. Safe to call multiple
 * times — idempotent given the same set of files on disk.
 */
function rewriteIndex(): void {
  const files = fs
    .readdirSync(PLAYS_TS_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();

  const imports = files
    .map((slug) => `import { ${toIdentifier(slug)} } from "./${slug}";`)
    .join("\n");
  const entries = files
    .map((slug) => `  "${slug}": ${toIdentifier(slug)},`)
    .join("\n");

  const content = `// GENERATED by scripts/synthesize-plays.ts — do not edit by hand.
// Registry of plays with extracted SVG coordinate data.
// Add plays by running npm run synthesize; remove by deleting the .ts file and re-running.

import type { Play } from "@/lib/types";
${imports}

export const PLAYS_BY_SLUG: Record<string, Play> = {
${entries}
};

export function getPlayBySlug(slug: string): Play | null {
  return PLAYS_BY_SLUG[slug] ?? null;
}
`;
  fs.writeFileSync(INDEX_PATH, content, "utf-8");
}

function toTsModule(slug: string, play: unknown, semantic: SemanticPlay): string {
  const id = toIdentifier(slug);
  return `// GENERATED by scripts/synthesize-plays.ts — do not edit by hand.
// Source: wiki slug "${slug}"
// Semantic source retained for audit — modify the semantic form, then re-run the synthesizer.
import type { Play } from "@/lib/types";

export const ${id}Semantic = ${JSON.stringify(semantic, null, 2)} as const;

export const ${id}: Play = ${JSON.stringify(play, null, 2)};
`;
}

interface CliArgs {
  dryRun: boolean;
  single: string | null;
  slugs: string[] | null;
  limit: number | null;
  /** When true, skip the Claude call and re-translate the existing semantic in src/data/plays/<slug>.ts. */
  fromSemantic: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    dryRun: false,
    single: null,
    slugs: null,
    limit: null,
    fromSemantic: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--single") out.single = argv[++i] ?? null;
    else if (a === "--slugs") {
      const raw = argv[++i] ?? "";
      out.slugs = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--limit") out.limit = parseInt(argv[++i] ?? "0", 10);
    else if (a === "--from-semantic") out.fromSemantic = true;
  }
  return out;
}

/**
 * Load the `*Semantic` const exported by a generated play file. Used for
 * offline re-translation (no Claude call) after a coach edits the
 * semantic form by hand. Requires tsx to have already executed the import.
 */
async function loadExistingSemantic(slug: string): Promise<SemanticPlay> {
  const filePath = path.join(PLAYS_TS_DIR, `${slug}.ts`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} does not exist — cannot re-translate`);
  }
  // Dynamic import; tsx executes TS at runtime. The semantic export is
  // named <identifier>Semantic. file:// prefix required for ESM loaders.
  const imp = await import(`file://${filePath}`);
  const semanticKey = `${toIdentifier(slug)}Semantic`;
  const semantic = imp[semanticKey];
  if (!semantic) {
    throw new Error(
      `${filePath} does not export "${semanticKey}" — was the file generated by a recent synthesizer?`,
    );
  }
  return semantic as SemanticPlay;
}

async function synthesizeOne(
  client: Anthropic,
  target: Target,
): Promise<{ play: unknown; semantic: SemanticPlay }> {
  const diagramJson = extractDiagramPositionsRaw(target.body);
  const diagramBlock = diagramJson
    ? `\nDIAGRAM_POSITIONS (extracted from source book diagram — ground truth for starting coordinates):\n${diagramJson}\n`
    : "";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Play slug: ${target.slug}
Title: ${target.title}
Category: ${target.category ?? "unknown"}
Tags: ${target.tags.join(", ")}
${diagramBlock}
WIKI PAGE BODY:
${target.body.slice(0, 6000)}`,
      },
    ],
    tools: [writeSemanticPlayTool],
    tool_choice: { type: "tool", name: "write_semantic_play" },
  });

  const tu = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!tu) throw new Error("no tool_use block in response");
  const semantic = tu.input as SemanticPlay;
  const errs = validateSemanticPlay(semantic);
  if (errs.length > 0) {
    throw new Error(`semantic validation failed: ${errs.join("; ")}`);
  }
  const play = synthesizePlay(semantic);
  return { play, semantic };
}

async function main() {
  const args = parseArgs(process.argv);
  let targets = scanTargets();
  if (args.single) {
    targets = targets.filter((t) => t.slug === args.single);
    if (targets.length === 0) {
      console.error(`No type:play wiki page matches slug "${args.single}"`);
      process.exit(1);
    }
  } else if (args.slugs && args.slugs.length > 0) {
    // Preserve caller-provided ordering so priority lists translate to
    // the actual synthesis order on disk.
    const bySlug = new Map(targets.map((t) => [t.slug, t]));
    const ordered: Target[] = [];
    const missing: string[] = [];
    for (const slug of args.slugs) {
      const t = bySlug.get(slug);
      if (t) ordered.push(t);
      else missing.push(slug);
    }
    if (missing.length > 0) {
      console.error(
        `No type:play wiki page matches slug(s): ${missing.join(", ")}`,
      );
      if (ordered.length === 0) process.exit(1);
    }
    targets = ordered;
  }
  if (args.limit && args.limit > 0) targets = targets.slice(0, args.limit);

  console.log(`${targets.length} target play(s) found.`);
  if (args.dryRun) {
    for (const t of targets)
      console.log(`  ${t.slug} — "${t.title}" [${t.category ?? "-"}]`);
    return;
  }

  fs.mkdirSync(PLAYS_TS_DIR, { recursive: true });
  let ok = 0;
  let failed = 0;

  // Offline re-translation path — reads the existing <slug>.ts semantic
  // const and re-runs the deterministic translator. No Claude call.
  if (args.fromSemantic) {
    for (const target of targets) {
      process.stdout.write(`  ${target.slug} (from-semantic) … `);
      try {
        const semantic = await loadExistingSemantic(target.slug);
        const errs = validateSemanticPlay(semantic);
        if (errs.length > 0) {
          throw new Error(`semantic validation failed: ${errs.join("; ")}`);
        }
        const play = synthesizePlay(semantic);
        const outPath = path.join(PLAYS_TS_DIR, `${target.slug}.ts`);
        fs.writeFileSync(
          outPath,
          toTsModule(target.slug, play, semantic),
          "utf-8",
        );
        console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
        ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`FAILED: ${msg}`);
        failed++;
      }
    }
    if (ok > 0) {
      rewriteIndex();
      console.log(`Rewrote ${path.relative(process.cwd(), INDEX_PATH)}.`);
    }
    console.log(`\nDone: ${ok} re-translated, ${failed} failed.`);
    await postSynthesisGate();
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set — aborting.");
    process.exit(1);
  }

  const client = new Anthropic();
  for (const target of targets) {
    process.stdout.write(`  ${target.slug} … `);
    try {
      const { play, semantic } = await synthesizeOne(client, target);
      const outPath = path.join(PLAYS_TS_DIR, `${target.slug}.ts`);
      fs.writeFileSync(
        outPath,
        toTsModule(target.slug, play, semantic),
        "utf-8",
      );
      console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      failed++;
    }
  }
  if (ok > 0) {
    rewriteIndex();
    console.log(`Rewrote ${path.relative(process.cwd(), INDEX_PATH)}.`);
  }
  console.log(`\nDone: ${ok} synthesized, ${failed} failed.`);
  await postSynthesisGate();
}

/**
 * Revalidate every registered play after synthesis writes new files. This
 * catches drift cases where the validator rules tightened since a play was
 * last synthesized but its .ts file was never re-generated. Exits the process
 * with code 1 if any registered play fails — run `npm run test:visual`
 * separately as the rendering gate.
 */
async function postSynthesisGate(): Promise<void> {
  console.log("\nRevalidating all registered plays…");
  const results = await revalidateAllPlays();
  const code = printRevalidateReport(results);
  if (code !== 0) {
    console.log(
      `\nOne or more registered plays failed revalidation. Move them to ` +
        `${path.relative(process.cwd(), path.join(PLAYS_TS_DIR, "_review"))}/ ` +
        `and remove their entries from index.ts before proceeding.`,
    );
    process.exit(code);
  }
  console.log("\nNext: run `npm run test:visual` to verify rendering.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
