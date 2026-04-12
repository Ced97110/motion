// Copyright: Your Name. Apache 2.0
// Utilities for reading diagram-positions JSON blocks from wiki pages.
//
// The scripts/resolve-diagrams.ts pipeline replaces book DIAGRAM markers
// with fenced code blocks of shape:
//
//     ```json name=diagram-positions
//     {"players":[{"role":"1","x":0,"y":24},...],"actions":[...],"notes":"..."}
//     ```
//
// The synthesizer reads this as a structured hint and prefers it over
// prose-derived coordinates. Downstream consumers should treat the JSON
// as authoritative unless its `notes` field explicitly says the data was
// reconstructed from prose (e.g., when the cited PDF page had no diagram).

export interface DiagramPlayer {
  role: string;
  x: number;
  y: number;
}

export interface DiagramAction {
  from: string;
  to: string;
  type: string;
}

export interface DiagramPositions {
  players: DiagramPlayer[];
  actions: DiagramAction[];
  notes?: string;
}

const DIAGRAM_FENCE_RE =
  /```json\s+name=diagram-positions\s*\n([\s\S]*?)\n```/m;

/**
 * Locate and parse the first `diagram-positions` fenced code block in a
 * wiki page body. Returns the raw JSON string (validated parse) if found,
 * otherwise null. Call `parseDiagramPositions` for a structured result.
 */
export function extractDiagramPositionsRaw(body: string): string | null {
  const match = DIAGRAM_FENCE_RE.exec(body);
  if (!match) return null;
  const raw = match[1].trim();
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

/**
 * Parse the `diagram-positions` block into a typed object. Returns null on
 * missing or malformed JSON. Performs shape validation (players array,
 * actions array) but does NOT validate that coordinates are inside the
 * viewBox — use `validateDiagramPositions` for that.
 */
export function parseDiagramPositions(body: string): DiagramPositions | null {
  const raw = extractDiagramPositionsRaw(body);
  if (raw == null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.players)) return null;
  const actions = Array.isArray(obj.actions) ? obj.actions : [];

  const players: DiagramPlayer[] = [];
  for (const p of obj.players) {
    if (typeof p !== "object" || p === null) continue;
    const rec = p as Record<string, unknown>;
    if (
      typeof rec.role === "string" &&
      typeof rec.x === "number" &&
      typeof rec.y === "number"
    ) {
      players.push({ role: rec.role, x: rec.x, y: rec.y });
    }
  }

  const typedActions: DiagramAction[] = [];
  for (const a of actions) {
    if (typeof a !== "object" || a === null) continue;
    const rec = a as Record<string, unknown>;
    if (
      typeof rec.from === "string" &&
      typeof rec.to === "string" &&
      typeof rec.type === "string"
    ) {
      typedActions.push({ from: rec.from, to: rec.to, type: rec.type });
    }
  }

  return {
    players,
    actions: typedActions,
    ...(typeof obj.notes === "string" ? { notes: obj.notes } : {}),
  };
}

export interface ValidationIssue {
  kind: "out-of-viewbox" | "duplicate-role" | "invalid-coord" | "no-players";
  detail: string;
}

/**
 * Validate a parsed diagram-positions block against the court viewBox
 * (-28 -3 56 50). Returns an empty array if the block is clean, otherwise
 * a list of specific issues. Non-fatal — the synthesizer can still run on
 * a block with issues, but the fidelity signal is degraded.
 */
export function validateDiagramPositions(
  diagram: DiagramPositions
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (diagram.players.length === 0) {
    issues.push({ kind: "no-players", detail: "players array is empty" });
    return issues;
  }
  const seenRoles = new Set<string>();
  for (const p of diagram.players) {
    if (seenRoles.has(p.role)) {
      issues.push({
        kind: "duplicate-role",
        detail: `role "${p.role}" appears more than once`,
      });
    }
    seenRoles.add(p.role);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      issues.push({
        kind: "invalid-coord",
        detail: `role "${p.role}" has non-finite coordinates (x=${p.x}, y=${p.y})`,
      });
      continue;
    }
    if (p.x < -28 || p.x > 28 || p.y < -3 || p.y > 47) {
      issues.push({
        kind: "out-of-viewbox",
        detail: `role "${p.role}" at (${p.x}, ${p.y}) is outside viewBox [-28..28, -3..47]`,
      });
    }
  }
  return issues;
}

/**
 * Returns true if the diagram's `notes` field claims the positions were
 * reconstructed from prose rather than an actual book diagram. Used by
 * the synthesizer to decide whether to trust the JSON as ground truth.
 *
 * Heuristic: the resolver writes a variety of honest-fallback phrasings
 * when the cited PDF page had no usable diagram. Rather than enumerate
 * every sentence, we look for the combination of a "no diagram / not
 * present / wrong play" admission OR a "derived from prose / wiki"
 * admission. Either signal is enough to flag the data as low-fidelity.
 */
export function isProseDerived(diagram: DiagramPositions): boolean {
  if (!diagram.notes) return false;
  const n = diagram.notes.toLowerCase();

  const noDiagramAdmission =
    /no (actual )?(basketball )?(court )?diagram/.test(n) ||
    /no diagram (is )?(present|available|provided)/.test(n) ||
    /not (present|available|provided|matching)/.test(n) ||
    /does not (match|contain|include)/.test(n);

  const proseDerivedAdmission =
    /(reconstructed|inferred|based)\s+(entirely|solely|only)?\s*(from|on)\s+(the\s+)?(wiki\s+)?(prose|marker|description|text)/.test(
      n
    ) ||
    n.includes("based solely on the wiki") ||
    n.includes("reconstructed from prose") ||
    n.includes("from prose");

  return noDiagramAdmission || proseDerivedAdmission;
}
