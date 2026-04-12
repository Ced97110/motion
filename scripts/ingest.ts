#!/usr/bin/env npx tsx
/**
 * Basketball Coaching Wiki — Ingestion Pipeline
 *
 * Reads a PDF, splits it into page-range chunks, sends each chunk
 * to Claude as a native PDF document, and writes structured wiki
 * pages following SCHEMA.md.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/ingest.ts <pdf-path> [options]
 *
 * Options:
 *   --chunk-size <n>   Pages per API call (default: 20, max: 100)
 *   --model <id>       Claude model (default: claude-sonnet-4-6)
 *   --dry-run          Show what would happen without calling the API
 *   --start-page <n>   Resume from this page (1-indexed, default: 1)
 *
 * Examples:
 *   npx tsx scripts/ingest.ts knowledge-base/raw/Basketball_Skills_Drills.pdf
 *   npx tsx scripts/ingest.ts knowledge-base/raw/NBA-Playbook.pdf --chunk-size 15 --model claude-haiku-4-5-20251001
 */

import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

// ── Constants ──────────────────────────────────────────────────────────

const WIKI_DIR = path.resolve("knowledge-base/wiki");
const SCHEMA_PATH = path.resolve("knowledge-base/SCHEMA.md");
const INDEX_PATH = path.join(WIKI_DIR, "index.md");
const LOG_PATH = path.join(WIKI_DIR, "log.md");

const DEFAULT_CHUNK_SIZE = 20;
const DEFAULT_MODEL = "claude-sonnet-4-6";

// Map filename substrings to source metadata
const KNOWN_SOURCES: Record<string, { id: string; title: string }> = {
  "lets-talk-defense": { id: "S1", title: "Let's Talk Defense — Herb Brown" },
  "basketball-anatomy": { id: "S2", title: "Basketball Anatomy" },
  "offensive-skill-development": {
    id: "S3",
    title: "Basketball Coaches' Guide to Advanced Offensive Skill Development",
  },
  "basketball-for-coaches": { id: "S4", title: "Basketball For Coaches" },
  "basketball-shooting": { id: "S5", title: "Basketball Shooting, Enhanced Edition" },
  "footwork-balance-pivoting": {
    id: "S6",
    title: "The Complete Basketball Coaches Guide to Footwork, Balance, and Pivoting",
  },
  "nba-coaches-playbook": { id: "S7", title: "NBA Coaches Playbook — NBCA" },
  "speed-agility-quickness": {
    id: "S8",
    title: "Training for Speed, Agility, and Quickness",
  },
  "explosive-calisthenics": {
    id: "S9",
    title: "Explosive Calisthenics — Superhuman Power, Maximum Speed and Agility",
  },
};

// ── Types ──────────────────────────────────────────────────────────────

interface WikiPage {
  filename: string;
  content: string;
  summary: string;
  category: "concept" | "drill" | "play" | "source-summary";
}

interface ToolInput {
  pages: WikiPage[];
  chunk_notes?: string;
}

interface ParsedArgs {
  pdfPath: string;
  chunkSize: number;
  model: string;
  dryRun: boolean;
  startPage: number;
}

// ── CLI Parsing ────────────────────────────────────────────────────────

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const pdfPath = args.find((a) => !a.startsWith("--"));
  if (!pdfPath) {
    console.error(
      "Usage: npx tsx scripts/ingest.ts <pdf-path> [--chunk-size N] [--model ID] [--dry-run] [--start-page N]"
    );
    process.exit(1);
  }

  const flagIndex = (name: string) => args.indexOf(name);
  const flagValue = (name: string, fallback: string) => {
    const i = flagIndex(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
  };

  return {
    pdfPath: path.resolve(pdfPath),
    chunkSize: Math.min(
      100,
      parseInt(flagValue("--chunk-size", String(DEFAULT_CHUNK_SIZE)))
    ),
    model: flagValue("--model", DEFAULT_MODEL),
    dryRun: args.includes("--dry-run"),
    startPage: Math.max(
      1,
      parseInt(flagValue("--start-page", "1"))
    ),
  };
}

// ── Source Detection ───────────────────────────────────────────────────

function detectSource(pdfPath: string): { id: string; title: string } {
  const basename = path.basename(pdfPath);
  for (const [pattern, meta] of Object.entries(KNOWN_SOURCES)) {
    if (basename.includes(pattern)) return meta;
  }
  // Unknown source — use filename
  const name = path.basename(pdfPath, ".pdf").replace(/[-_]/g, " ");
  return { id: "S?", title: name };
}

// ── PDF Chunking ───────────────────────────────────────────────────────

async function splitPdf(
  pdfBytes: Uint8Array,
  chunkSize: number,
  startPage: number
): Promise<Array<{ base64: string; startPage: number; endPage: number }>> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const chunks: Array<{
    base64: string;
    startPage: number;
    endPage: number;
  }> = [];

  const start0 = startPage - 1; // convert to 0-indexed

  for (let i = start0; i < totalPages; i += chunkSize) {
    const end = Math.min(i + chunkSize, totalPages);
    const indices = Array.from({ length: end - i }, (_, k) => i + k);

    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(pdfDoc, indices);
    for (const page of copiedPages) {
      chunkDoc.addPage(page);
    }
    const chunkBytes = await chunkDoc.save();
    const base64 = Buffer.from(chunkBytes).toString("base64");

    chunks.push({
      base64,
      startPage: i + 1, // 1-indexed for display
      endPage: end,
    });
  }

  return chunks;
}

// ── Claude API Tool Definition ─────────────────────────────────────────

const writeWikiPagesTool: Anthropic.Tool = {
  name: "write_wiki_pages",
  description:
    "Write or update basketball coaching wiki pages extracted from the source material. Each page must follow the SCHEMA conventions. Return an empty pages array if the chunk has no extractable content (e.g., table of contents, bibliography).",
  input_schema: {
    type: "object" as const,
    properties: {
      pages: {
        type: "array",
        description: "Wiki pages to create or update",
        items: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description:
                'Kebab-case .md filename (e.g., "pick-and-roll-defense.md")',
            },
            content: {
              type: "string",
              description:
                "Full page content: YAML frontmatter + markdown body following SCHEMA.md templates",
            },
            summary: {
              type: "string",
              description: "One-line summary for index.md (max 120 chars)",
            },
            category: {
              type: "string",
              enum: ["concept", "drill", "play", "source-summary"],
              description: "Page type for index organization",
            },
          },
          required: ["filename", "content", "summary", "category"],
        },
      },
      chunk_notes: {
        type: "string",
        description:
          "Brief notes about this chunk for the ingestion log (e.g., 'Chapter 3: help defense rotations')",
      },
    },
    required: ["pages"],
  },
};

// ── Build System Prompt ────────────────────────────────────────────────

async function buildSystemPrompt(
  source: { id: string; title: string },
  existingIndex: string
): Promise<string> {
  const schema = await fs.readFile(SCHEMA_PATH, "utf-8");

  return `You are a basketball coaching knowledge wiki maintainer.

Your job: read pages from a coaching book and extract structured wiki pages following the schema below.

## Source Being Ingested
- Source ID: ${source.id}
- Title: ${source.title}
- Citation format: [${source.id}, p.XX]

## Schema (FOLLOW EXACTLY)

${schema}

## Current Wiki Index (for cross-linking and dedup)

${existingIndex}

## Instructions

1. Read the PDF pages carefully.
2. Extract every distinct concept, drill, or play into its own wiki page.
3. Follow the SCHEMA page templates exactly — include all required sections.
4. Cross-link to existing wiki pages listed in the index above.
5. If content overlaps with an existing page, note it in the summary so the merge can happen later.
6. Use the write_wiki_pages tool to output your pages.
7. Skip filler content (acknowledgments, table of contents, bibliography, blank pages).
8. For court diagrams or figures: describe positions and movements if interpretable, otherwise add a <!-- DIAGRAM --> comment.
9. Be thorough — extract ALL coaching knowledge, not just headlines.`;
}

// ── Process One Chunk ──────────────────────────────────────────────────

async function processChunk(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  chunk: { base64: string; startPage: number; endPage: number },
  sourceTitle: string
): Promise<{ pages: WikiPage[]; notes: string }> {
  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: chunk.base64,
            },
          },
          {
            type: "text",
            text: `Ingest pages ${chunk.startPage}-${chunk.endPage} from "${sourceTitle}". Extract all concepts, drills, and plays into wiki pages following the SCHEMA. Use the write_wiki_pages tool.`,
          },
        ],
      },
    ],
    tools: [writeWikiPagesTool],
    tool_choice: { type: "tool", name: "write_wiki_pages" },
  });

  // Extract tool call
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    return { pages: [], notes: "No tool call returned" };
  }

  const input = toolUse.input as ToolInput;

  // Normalize pages — model may return a single object instead of an array
  let rawPages = input.pages || [];
  if (!Array.isArray(rawPages)) {
    rawPages = [rawPages as unknown as WikiPage];
  }

  // Validate and filter pages — model may return malformed entries
  const validPages = rawPages.filter((p) => {
    if (!p.filename || typeof p.filename !== "string") {
      console.error(`    ⚠ Skipping page with missing filename:`, JSON.stringify(p).slice(0, 120));
      return false;
    }
    if (!p.content || typeof p.content !== "string") {
      console.error(`    ⚠ Skipping page "${p.filename}" with missing content`);
      return false;
    }
    return true;
  });

  return {
    pages: validPages,
    notes: input.chunk_notes || "",
  };
}

// ── Write Wiki Pages ───────────────────────────────────────────────────

async function writePages(pages: WikiPage[]): Promise<{
  created: string[];
  updated: string[];
}> {
  const created: string[] = [];
  const updated: string[] = [];

  for (const page of pages) {
    if (!page.filename) continue;
    // Sanitize filename — ensure it ends with .md and has no path traversal
    const safeName = path.basename(page.filename).replace(/[^a-z0-9._-]/gi, "-");
    const filePath = path.join(WIKI_DIR, safeName);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    await fs.writeFile(filePath, page.content || "", "utf-8");
    page.filename = safeName; // normalize for index

    if (exists) {
      updated.push(safeName);
    } else {
      created.push(safeName);
    }
  }

  return { created, updated };
}

// ── Update Index ───────────────────────────────────────────────────────

async function updateIndex(allPages: WikiPage[]): Promise<void> {
  const existing = await fs.readFile(INDEX_PATH, "utf-8");

  // Group new pages by category
  const byCategory: Record<string, WikiPage[]> = {
    concept: [],
    drill: [],
    play: [],
    "source-summary": [],
  };

  for (const page of allPages) {
    byCategory[page.category]?.push(page);
  }

  // Parse existing entries to avoid duplicates
  const existingEntries = new Set<string>();
  for (const match of existing.matchAll(
    /\[([^\]]+)\]\(([^)]+)\)/g
  )) {
    existingEntries.add(match[2]);
  }

  // Build new entries per category
  const sectionMap: Record<string, string> = {
    concept: "## Concepts",
    drill: "## Drills",
    play: "## Plays",
    "source-summary": "## Source Summaries",
  };

  let updated = existing;

  for (const [category, pages] of Object.entries(byCategory)) {
    const newPages = pages.filter(
      (p) => !existingEntries.has(p.filename)
    );
    if (newPages.length === 0) continue;

    const heading = sectionMap[category];
    const entries = newPages
      .map((p) => {
        const name = p.filename.replace(".md", "").replace(/-/g, " ");
        const title = name.charAt(0).toUpperCase() + name.slice(1);
        return `- [${title}](${p.filename}) — ${p.summary}`;
      })
      .join("\n");

    // Insert after the section heading
    const headingIndex = updated.indexOf(heading);
    if (headingIndex >= 0) {
      const insertPos = updated.indexOf("\n", headingIndex) + 1;
      updated =
        updated.slice(0, insertPos) + entries + "\n" + updated.slice(insertPos);
    }
  }

  await fs.writeFile(INDEX_PATH, updated, "utf-8");
}

// ── Append to Log ──────────────────────────────────────────────────────

async function appendLog(
  source: { id: string; title: string },
  startPage: number,
  endPage: number,
  created: string[],
  updated: string[],
  notes: string
): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const entry = `
## [${date}] ingest | ${source.title} (pp.${startPage}-${endPage})
- Created: ${created.length > 0 ? created.join(", ") : "(none)"}
- Updated: ${updated.length > 0 ? updated.join(", ") : "(none)"}
- Notes: ${notes || "—"}
`;
  await fs.appendFile(LOG_PATH, entry, "utf-8");
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const source = detectSource(args.pdfPath);

  console.log(`\n🏀 Basketball Wiki Ingestion Pipeline`);
  console.log(`────────────────────────────────────────`);
  console.log(`  Source:     ${source.title} (${source.id})`);
  console.log(`  PDF:        ${args.pdfPath}`);
  console.log(`  Model:      ${args.model}`);
  console.log(`  Chunk size: ${args.chunkSize} pages`);
  console.log(`  Start page: ${args.startPage}`);
  console.log(`  Dry run:    ${args.dryRun}`);
  console.log();

  // Validate API key
  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
    console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  // Read PDF
  let pdfBytes: Uint8Array;
  try {
    const buffer = await fs.readFile(args.pdfPath);
    pdfBytes = new Uint8Array(buffer);
  } catch {
    console.error(`Error: Cannot read PDF at ${args.pdfPath}`);
    process.exit(1);
  }

  // Split into chunks
  console.log("Splitting PDF into chunks...");
  const chunks = await splitPdf(pdfBytes, args.chunkSize, args.startPage);
  const totalPages = chunks.length > 0
    ? chunks[chunks.length - 1].endPage
    : 0;
  console.log(
    `  ${totalPages} total pages → ${chunks.length} chunks of ≤${args.chunkSize} pages\n`
  );

  if (args.dryRun) {
    console.log("DRY RUN — would process these chunks:");
    for (const c of chunks) {
      console.log(`  Pages ${c.startPage}-${c.endPage}`);
    }
    return;
  }

  // Initialize Claude client
  const client = new Anthropic();
  const existingIndex = await fs.readFile(INDEX_PATH, "utf-8");
  const systemPrompt = await buildSystemPrompt(source, existingIndex);

  // Process chunks
  const allCreated: string[] = [];
  const allUpdated: string[] = [];
  const allPages: WikiPage[] = [];
  let totalPagesWritten = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const label = `[${i + 1}/${chunks.length}]`;
    process.stdout.write(
      `${label} Processing pages ${chunk.startPage}-${chunk.endPage}...`
    );

    try {
      const result = await processChunk(
        client,
        args.model,
        systemPrompt,
        chunk,
        source.title
      );

      if (result.pages.length === 0) {
        console.log(" → skipped (no extractable content)");
        continue;
      }

      // Write pages to disk
      const { created, updated } = await writePages(result.pages);
      allCreated.push(...created);
      allUpdated.push(...updated);
      allPages.push(...result.pages);
      totalPagesWritten += result.pages.length;

      console.log(
        ` → ${created.length} created, ${updated.length} updated`
      );
      if (created.length > 0) {
        console.log(`       ${created.join(", ")}`);
      }

      // Log each chunk
      await appendLog(
        source,
        chunk.startPage,
        chunk.endPage,
        created,
        updated,
        result.notes
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(` → ERROR: ${message}`);
      console.log(`       Resume with: --start-page ${chunk.startPage}`);
      // Continue to next chunk rather than aborting entirely
    }

    // Small delay between API calls to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Update index with all new pages
  if (allPages.length > 0) {
    await updateIndex(allPages);
  }

  // Summary
  console.log(`\n────────────────────────────────────────`);
  console.log(`✅ Ingestion complete`);
  console.log(`  Wiki pages created:  ${allCreated.length}`);
  console.log(`  Wiki pages updated:  ${allUpdated.length}`);
  console.log(`  Total pages written: ${totalPagesWritten}`);
  console.log(`  Index updated:       ${INDEX_PATH}`);
  console.log(`  Log appended:        ${LOG_PATH}`);
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
