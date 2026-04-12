// Copyright: Your Name. Apache 2.0
// POST /api/halftime — Claude-backed 3-bullet adjustment generator.
//
// The request body carries the observation chip ids selected by the coach
// plus an optional partial box score. We build the exact prompt defined in
// src/lib/halftime/prompt.ts (mirror of lib/halftime.py) and ask Claude for
// a terse bulleted response.
//
// Returns JSON { bullets: string[3], source: "claude" | "stub" }.
// On any API failure we fall back to the deterministic stub so the UX
// never dead-ends. This is explicit in the response `source` field so the
// UI can show a "fallback mode" indicator if we ever need it.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CHIP_MAP,
  buildHalftimePrompt,
  stubAdjustments,
} from "@/lib/halftime/prompt";

// Force dynamic — this route has side effects (external API) and must not
// be cached at the edge.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 512;

interface HalftimeRequest {
  observations: string[];
  level: string;
  partial_box?: Record<string, unknown>;
}

/**
 * Runtime type check — we cannot trust the client.
 * Returns the validated body on success, an Error on failure.
 */
function validate(body: unknown): HalftimeRequest | Error {
  if (!body || typeof body !== "object") {
    return new Error("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.observations)) {
    return new Error("observations must be an array");
  }
  if (b.observations.length === 0) {
    return new Error("observations must have at least one chip");
  }
  if (b.observations.length > 6) {
    return new Error("observations capped at 6");
  }
  for (const o of b.observations) {
    if (typeof o !== "string") return new Error("observations must be strings");
    // Defense-in-depth: reject chip ids we don't know about so a malicious
    // caller can't smuggle arbitrary text into the prompt.
    if (!(o in CHIP_MAP)) {
      return new Error(`unknown observation id: ${o}`);
    }
  }
  if (typeof b.level !== "string" || b.level.length === 0) {
    return new Error("level must be a non-empty string");
  }
  if (b.level.length > 32) {
    return new Error("level too long");
  }
  if (
    b.partial_box !== undefined &&
    (typeof b.partial_box !== "object" ||
      b.partial_box === null ||
      Array.isArray(b.partial_box))
  ) {
    return new Error("partial_box must be an object when provided");
  }
  return {
    observations: b.observations as string[],
    level: b.level,
    partial_box: b.partial_box as Record<string, unknown> | undefined,
  };
}

/**
 * Extract bullet lines from Claude's text output. Claude typically
 * returns "- bullet one\n- bullet two\n- bullet three" but we guard
 * against small format drift (asterisks, numbered lists).
 */
function parseBullets(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const bullets: string[] = [];
  for (const line of lines) {
    const match = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (match) bullets.push(match[1].trim());
  }
  // If the model didn't bullet at all, split on newlines as fallback.
  if (bullets.length === 0) return lines.slice(0, 3);
  return bullets.slice(0, 3);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = validate(body);
  if (parsed instanceof Error) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  // No API key → honest fallback to the local stub. This keeps dev loops
  // cheap and unblocks UX work even when the key is rotated.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      bullets: stubAdjustments(parsed.observations),
      source: "stub" as const,
      reason: "ANTHROPIC_API_KEY not configured",
    });
  }

  const prompt = buildHalftimePrompt(parsed);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new Error("no text block in model response");
    }
    const bullets = parseBullets(textBlock.text);
    if (bullets.length === 0) {
      throw new Error("model returned zero bullets");
    }
    // Pad to exactly 3 — the UI contract is "3 adjustments".
    while (bullets.length < 3) {
      bullets.push("Maintain composure — one stop, one good shot, repeat.");
    }
    return NextResponse.json({
      bullets,
      source: "claude" as const,
      model: MODEL,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Stub-on-error rather than surfacing a 500 — the user is mid-halftime,
    // the last thing they need is a server error page.
    return NextResponse.json({
      bullets: stubAdjustments(parsed.observations),
      source: "stub" as const,
      reason: `claude error: ${message}`,
    });
  }
}
