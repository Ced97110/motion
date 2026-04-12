#!/usr/bin/env npx tsx
/**
 * Detect the printed-page-vs-physical-page offset for each source PDF.
 *
 * Source PDFs have front matter (cover, TOC, preface, acknowledgments)
 * that shifts physical page indices relative to the printed page numbers
 * in the book body. Wiki citations use printed page numbers ([S4, p.33]),
 * so the resolver needs to add a per-source offset before extracting.
 *
 * This script extracts ONE physical mid-book page per PDF, asks Claude
 * to read the printed page number off the footer/header, and writes the
 * computed offsets to scripts/.page-offsets.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/detect-page-offsets.ts
 *
 * Re-run any time source PDFs are replaced. Cheap: 1 call per PDF.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

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
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const RAW_DIR = path.resolve("knowledge-base/raw");
const OFFSETS_PATH = path.resolve("scripts/.page-offsets.json");
const MODEL = "claude-haiku-4-5-20251001"; // cheap — it's OCR, not reasoning

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

interface OffsetResult {
  sourceId: string;
  pdfFile: string;
  totalPhysicalPages: number;
  samplePhysicalPage: number;
  printedPageReported: number | null;
  offset: number | null; // physical = printed + offset
  note?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function extractSinglePhysicalPageBase64(
  pdfPath: string,
  physicalPage1Indexed: number
): Promise<{ base64: string; totalPages: number; actualPage: number }> {
  const buffer = await fs.readFile(pdfPath);
  const srcDoc = await PDFDocument.load(new Uint8Array(buffer));
  const total = srcDoc.getPageCount();
  const actual = Math.max(1, Math.min(total, physicalPage1Indexed));
  const outDoc = await PDFDocument.create();
  const [copied] = await outDoc.copyPages(srcDoc, [actual - 1]);
  outDoc.addPage(copied);
  const bytes = await outDoc.save();
  return {
    base64: Buffer.from(bytes).toString("base64"),
    totalPages: total,
    actualPage: actual,
  };
}

const readPageNumberTool: Anthropic.Tool = {
  name: "report_printed_page_number",
  description:
    "Report the printed page number visible on the provided PDF page (usually shown in the header or footer). Use null if no printed page number is visible (e.g., blank page, cover, title page).",
  input_schema: {
    type: "object" as const,
    properties: {
      printed_page_number: {
        type: ["integer", "null"],
        description:
          "The printed page number as shown on the page itself, or null if none visible.",
      },
      rationale: {
        type: "string",
        description:
          "One short sentence on where the page number was found or why none is visible.",
      },
    },
    required: ["printed_page_number", "rationale"],
  },
};

async function probeOnePage(
  client: Anthropic,
  pdfPath: string,
  physicalPage: number
): Promise<{
  printed: number | null;
  note: string;
  actualPage: number;
  totalPages: number;
}> {
  const { base64, actualPage, totalPages } = await extractSinglePhysicalPageBase64(
    pdfPath,
    physicalPage
  );
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "You read printed page numbers off book pages. You respond only via the provided tool.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: "What printed page number appears on this book page (usually in the header or footer)? Respond via the tool.",
          },
        ],
      },
    ],
    tools: [readPageNumberTool],
    tool_choice: { type: "tool", name: "report_printed_page_number" },
  });
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) {
    return { printed: null, note: "No tool call", actualPage, totalPages };
  }
  const input = toolUse.input as {
    printed_page_number: number | null;
    rationale: string;
  };
  return {
    printed: input.printed_page_number,
    note: input.rationale,
    actualPage,
    totalPages,
  };
}

async function detectOne(
  client: Anthropic,
  sourceId: string,
  pdfFile: string
): Promise<OffsetResult> {
  const pdfPath = path.join(RAW_DIR, pdfFile);
  const exists = fsSync.existsSync(pdfPath);
  if (!exists) {
    return {
      sourceId,
      pdfFile,
      totalPhysicalPages: 0,
      samplePhysicalPage: 0,
      printedPageReported: null,
      offset: null,
      note: "PDF file missing",
    };
  }
  const buffer = await fs.readFile(pdfPath);
  const srcDoc = await PDFDocument.load(new Uint8Array(buffer));
  const total = srcDoc.getPageCount();

  // Try up to 4 different physical pages (mostly mid-book, stepping outward)
  // and collect every non-null result. If at least two offsets agree, trust
  // that consensus; otherwise take the first non-null. This defends against
  // per-chapter localised page labels (e.g., appendix restarts) that can
  // produce wildly wrong single-probe offsets.
  const probeTargets = [
    Math.max(40, Math.floor(total * 0.5)),
    Math.max(40, Math.floor(total * 0.3)),
    Math.max(40, Math.floor(total * 0.7)),
    Math.max(40, Math.floor(total * 0.4)),
  ];

  const observed: Array<{ physical: number; printed: number; offset: number }> = [];
  let lastNote = "";
  let lastPhysical = 0;
  for (const target of probeTargets) {
    const probe = await probeOnePage(client, pdfPath, target);
    lastPhysical = probe.actualPage;
    lastNote = probe.note;
    if (probe.printed !== null) {
      observed.push({
        physical: probe.actualPage,
        printed: probe.printed,
        offset: probe.actualPage - probe.printed,
      });
      if (observed.length >= 3) break; // enough to vote
    }
  }

  if (observed.length === 0) {
    return {
      sourceId,
      pdfFile,
      totalPhysicalPages: total,
      samplePhysicalPage: lastPhysical,
      printedPageReported: null,
      offset: null,
      note: `no printed page numbers visible in 4 probe points; last rationale: ${lastNote}`,
    };
  }

  // Pick the offset that appears most often; ties broken by first occurrence.
  const tally = new Map<number, number>();
  for (const o of observed) {
    tally.set(o.offset, (tally.get(o.offset) ?? 0) + 1);
  }
  const [consensusOffset] = [...tally.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];
  const picked = observed.find((o) => o.offset === consensusOffset)!;

  // Sanity check: book front matter rarely exceeds ~50 pages. Offsets above
  // that threshold almost always indicate chapter-local page numbering (each
  // chapter restarts at "p.1"), which no single offset can fix. Flag those
  // as null so the resolver defaults to 0 instead of extracting wildly wrong
  // physical pages.
  const OFFSET_SANITY_LIMIT = 50;
  if (Math.abs(consensusOffset) > OFFSET_SANITY_LIMIT) {
    return {
      sourceId,
      pdfFile,
      totalPhysicalPages: total,
      samplePhysicalPage: picked.physical,
      printedPageReported: picked.printed,
      offset: null,
      note: `detected offset +${consensusOffset} exceeds sanity limit (±${OFFSET_SANITY_LIMIT}); probable chapter-local numbering — needs manual inspection`,
    };
  }

  const agreementNote =
    observed.length > 1 && tally.get(consensusOffset)! > 1
      ? `consensus across ${tally.get(consensusOffset)}/${observed.length} probes`
      : observed.length > 1
        ? `probes disagreed: ${observed.map((o) => `+${o.offset}`).join(", ")} — picked first`
        : `single probe only`;

  return {
    sourceId,
    pdfFile,
    totalPhysicalPages: total,
    samplePhysicalPage: picked.physical,
    printedPageReported: picked.printed,
    offset: consensusOffset,
    note: agreementNote,
  };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write("ANTHROPIC_API_KEY not set. Aborting.\n");
    process.exit(1);
  }
  const client = new Anthropic();

  process.stdout.write("Detecting page offsets for 9 PDFs with Haiku 4.5...\n\n");
  const results: OffsetResult[] = [];
  for (const [sid, file] of Object.entries(SOURCE_PDFS)) {
    process.stdout.write(`[${sid}] ${file} ... `);
    try {
      const r = await detectOne(client, sid, file);
      results.push(r);
      const off = r.offset !== null ? `+${r.offset}` : "unknown";
      const reported = r.printedPageReported !== null ? `p.${r.printedPageReported}` : "none";
      process.stdout.write(
        `physical ${r.samplePhysicalPage}/${r.totalPhysicalPages} shows printed ${reported} -> offset ${off}\n`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        sourceId: sid,
        pdfFile: file,
        totalPhysicalPages: 0,
        samplePhysicalPage: 0,
        printedPageReported: null,
        offset: null,
        note: `Error: ${msg}`,
      });
      process.stdout.write(`FAIL: ${msg}\n`);
    }
  }

  const offsets: Record<string, number> = {};
  for (const r of results) {
    if (r.offset !== null) offsets[r.sourceId] = r.offset;
  }

  const out = { generatedAt: new Date().toISOString(), offsets, results };
  await fs.writeFile(OFFSETS_PATH, JSON.stringify(out, null, 2), "utf-8");
  process.stdout.write(`\nWrote offsets to ${OFFSETS_PATH}\n`);
  process.stdout.write(`Detected offsets: ${JSON.stringify(offsets)}\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${msg}\n`);
  process.exit(1);
});
