// Copyright: Your Name. Apache 2.0
// TS mirror of lib/halftime.py — chip → natural language + Claude prompt.
// Kept 1:1 with the Python implementation so server and client can share
// the same chip taxonomy. Update both together.

export const CHIP_MAP: Record<string, string> = {
  their_3_is_hot: "Opponent is hitting three-pointers at a high rate",
  their_3_is_cold: "Opponent is missing three-pointers",
  our_pnr_working: "Our pick-and-roll action is generating good looks",
  our_pnr_not_working: "Our pick-and-roll is being defended well",
  foul_trouble: "Key player(s) in foul trouble",
  their_post_dominant: "Their post player is dominating inside",
  our_fast_break: "We are scoring in transition",
  turnovers_killing_us: "Too many turnovers — giving away possessions",
  rebounding_edge: "We have a rebounding advantage",
  rebounding_problem: "They are out-rebounding us significantly",
  energy_low: "Team energy and effort is down",
  defense_solid: "Our defense is holding up well",
};

export interface HalftimeInput {
  observations: string[];
  level: string;
  partial_box?: Record<string, unknown>;
  game_plan?: Record<string, unknown>;
}

export function buildHalftimePrompt(input: HalftimeInput): string {
  const obsText = input.observations
    .map((o) => `- ${CHIP_MAP[o] ?? o}`)
    .join("\n");
  const box = JSON.stringify(input.partial_box ?? {});
  return `You are a basketball coaching assistant generating halftime adjustments.

LEVEL: ${input.level}
HALF-TIME STATS: ${box}
COACH'S OBSERVATIONS:
${obsText}

Generate exactly 3 bullet-point adjustments. Each must be:
1. Specific and actionable (not "play better defense" but "switch to zone on their PG to take away the drive")
2. Directly responsive to at least one observation
3. Expressed in 1-2 sentences maximum

Calibrate to ${input.level} level — use appropriate terminology and complexity.

Format:
- [Adjustment 1]
- [Adjustment 2]
- [Adjustment 3]`;
}

/**
 * Deterministic local fallback for the 3 adjustments — used when the
 * Claude API key is missing. Prefers observations over box stats.
 * Not a replacement for the model; a sensible stub so the UI never dead-
 * ends in dev.
 */
export function stubAdjustments(observations: string[]): string[] {
  const pool: Record<string, string> = {
    their_3_is_hot:
      "Run their shooters off the line — hard closeouts, funnel to help inside.",
    their_3_is_cold:
      "Keep packing the paint and daring them to keep shooting threes.",
    our_pnr_working:
      "Keep ball-screen attacks — set them higher to force switch or drop.",
    our_pnr_not_working:
      "Counter with slip screens and short rolls to punish aggressive hedges.",
    foul_trouble:
      "Attack your opposing player in foul trouble — drive at them early.",
    their_post_dominant:
      "Double on the catch from the top, rotate with the weak-side wing.",
    our_fast_break:
      "Gamble on one possession per quarter — deny the outlet to extend the break.",
    turnovers_killing_us:
      "Simplify the first action — two passes before any dribble, no cross-court.",
    rebounding_edge:
      "Crash two on the offensive glass — kick-out to shooters if it's not there.",
    rebounding_problem:
      "Hit first. Box out with a forearm, nobody chases long — guards pinch down.",
    energy_low:
      "10-second full-court sprint on the inbound to reset effort before tip.",
    defense_solid:
      "Stay in this coverage — we're controlling tempo, don't overreach.",
  };
  const out: string[] = [];
  for (const o of observations) {
    const tip = pool[o];
    if (tip && !out.includes(tip)) out.push(tip);
    if (out.length === 3) break;
  }
  while (out.length < 3) {
    out.push("Maintain composure — one stop, one good shot, repeat.");
  }
  return out;
}
