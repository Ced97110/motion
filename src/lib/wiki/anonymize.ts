// Anonymization layer for coach-submitted patches.
//
// SCOPE: broader than `scripts/check-nba-terms.ts` (which covers
// NBA / college / NBA-star names). This scrubs user-entered team,
// opponent, coach, and player names plus relative dates and
// locations — categories that only appear when a human typed
// them into a query. It preserves general coaching language.
//
// Approach: regex-based replacement with explicit context. No LLM,
// no I/O — safe to run in tests and CI.

import type { AnonymizeContext } from "./types";

const DEFAULT_DATE_WINDOW_DAYS = 30;

const PLACEHOLDERS = {
  team: "[TEAM]",
  opponent: "[OPPONENT]",
  player: "[PLAYER]",
  coach: "[COACH]",
  location: "[LOCATION]",
  date: "[DATE]",
  phone: "[PHONE]",
  email: "[EMAIL]",
} as const;

type Placeholder = (typeof PLACEHOLDERS)[keyof typeof PLACEHOLDERS];

interface ReplaceRule {
  readonly pattern: RegExp;
  readonly placeholder: Placeholder;
  /** Label used for the `removed` audit log (what was scrubbed). */
  readonly label: string;
}

/** Escape a string for use as a literal inside a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a case-insensitive, word-boundary regex for an exact phrase. */
function phraseRegex(phrase: string): RegExp {
  // Word-boundary at the edges; spaces inside the phrase stay literal.
  return new RegExp(`\\b${escapeRegex(phrase)}\\b`, "gi");
}

/**
 * Expand a full name (e.g. "Tommy Jones") into component patterns so
 * that first-name-only, last-name-only, and full references are all
 * caught. Single-word inputs are used verbatim.
 */
function expandPlayerPatterns(name: string): RegExp[] {
  const trimmed = name.trim();
  if (trimmed.length === 0) return [];
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return [phraseRegex(parts[0])];
  // Full name first (longer match wins if we apply in order).
  return [
    phraseRegex(trimmed),
    phraseRegex(parts[0]),
    phraseRegex(parts[parts.length - 1]),
  ];
}

/** Build the full rule list for a given context. */
function buildRules(ctx: AnonymizeContext): ReplaceRule[] {
  const rules: ReplaceRule[] = [];

  for (const team of ctx.teamNames) {
    if (team.trim().length === 0) continue;
    rules.push({
      pattern: phraseRegex(team),
      placeholder: PLACEHOLDERS.team,
      label: `team:${team}`,
    });
  }

  for (const opp of ctx.opponentNames) {
    if (opp.trim().length === 0) continue;
    rules.push({
      pattern: phraseRegex(opp),
      placeholder: PLACEHOLDERS.opponent,
      label: `opponent:${opp}`,
    });
  }

  for (const coach of ctx.coachNames) {
    for (const pat of expandPlayerPatterns(coach)) {
      rules.push({
        pattern: pat,
        placeholder: PLACEHOLDERS.coach,
        label: `coach:${coach}`,
      });
    }
  }

  for (const player of ctx.playerNames) {
    for (const pat of expandPlayerPatterns(player)) {
      rules.push({
        pattern: pat,
        placeholder: PLACEHOLDERS.player,
        label: `player:${player}`,
      });
    }
  }

  for (const loc of ctx.locations) {
    if (loc.trim().length === 0) continue;
    rules.push({
      pattern: phraseRegex(loc),
      placeholder: PLACEHOLDERS.location,
      label: `location:${loc}`,
    });
  }

  // Generic high-risk PII patterns (always applied).
  rules.push({
    // Email: simple RFC-ish pattern, good enough for scrubbing.
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: PLACEHOLDERS.email,
    label: "email",
  });
  rules.push({
    // NA-style phone: 10 digits with optional separators, or +<country>.
    pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    placeholder: PLACEHOLDERS.phone,
    label: "phone",
  });

  return rules;
}

/** Parse YYYY-MM-DD or "Month D, YYYY" into a Date, or null if unparseable. */
function parseDateString(raw: string): Date | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Date scrub: strip dates within ±windowDays of referenceDate. */
function scrubDates(
  input: string,
  referenceDate: Date,
  windowDays: number,
  removed: string[],
): string {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const minTime = referenceDate.getTime() - windowMs;
  const maxTime = referenceDate.getTime() + windowMs;

  let output = input;

  // YYYY-MM-DD
  output = output.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (match) => {
    const d = parseDateString(match);
    if (d && d.getTime() >= minTime && d.getTime() <= maxTime) {
      removed.push(`date:${match}`);
      return PLACEHOLDERS.date;
    }
    return match;
  });

  // "Month D, YYYY" / "Month DD, YYYY"
  const months =
    "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
  const monthDay = new RegExp(`\\b${months}\\s+\\d{1,2},\\s+\\d{4}\\b`, "g");
  output = output.replace(monthDay, (match) => {
    const d = parseDateString(match);
    if (d && d.getTime() >= minTime && d.getTime() <= maxTime) {
      removed.push(`date:${match}`);
      return PLACEHOLDERS.date;
    }
    return match;
  });

  return output;
}

/** Deduplicate an audit-log array while preserving insertion order. */
function uniq(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * Scrub sensitive tokens from `text` using the supplied context.
 * Returns the anonymized text and an audit list of what was removed.
 * Pure function: does not mutate its inputs.
 */
export function anonymize(
  text: string,
  context: AnonymizeContext,
): { text: string; removed: string[] } {
  const removed: string[] = [];
  const rules = buildRules(context);

  let output = text;
  for (const rule of rules) {
    const before = output;
    output = output.replace(rule.pattern, () => {
      removed.push(rule.label);
      return rule.placeholder;
    });
    // If nothing changed, still fine — loop continues.
    if (before === output) continue;
  }

  const refDate =
    context.referenceDate != null
      ? parseDateString(context.referenceDate) ?? new Date()
      : new Date();
  const windowDays = context.dateWindowDays ?? DEFAULT_DATE_WINDOW_DAYS;
  output = scrubDates(output, refDate, windowDays, removed);

  return { text: output, removed: uniq(removed) };
}

/** Placeholder tokens that indicate anonymization has run (used by lint). */
export const ANON_PLACEHOLDERS: readonly string[] =
  Object.values(PLACEHOLDERS);

/**
 * Heuristic: look for residual PII-shaped patterns AFTER anonymization.
 * Used by the promotion pipeline to reject patches that slipped through.
 */
export function findResidualPII(text: string): string[] {
  const hits: string[] = [];

  // Raw email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text)) {
    hits.push("residual-email");
  }
  // Raw phone
  if (
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(
      text,
    )
  ) {
    hits.push("residual-phone");
  }
  return hits;
}
