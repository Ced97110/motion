// Copyright: Your Name. Apache 2.0
// Position-weighted matchup advantage scorer.
//
// Given two players at the same position, return a verdict + a one-phrase
// reason. This is intentionally interpretable, not a black-box model —
// every advantage call is a product of visible, coachable skills.

import type { PlayerSkills, RosterPlayer } from "../intent/types";

/** Which skills matter most at each position, and by how much. */
const POSITION_WEIGHTS: Record<
  RosterPlayer["position"],
  Partial<Record<keyof PlayerSkills, number>>
> = {
  PG: { HND: 3, IQ: 3, PAS: 3, SHT: 2, SPD: 2, DEF: 1 },
  SG: { SHT: 3, DEF: 2, ATH: 2, HND: 2, SPD: 2, IQ: 1 },
  SF: { DEF: 2, SHT: 2, ATH: 2, IQ: 2, REB: 1, SPD: 1, HND: 1 },
  PF: { REB: 3, DEF: 3, PST: 2, ATH: 2, IQ: 1, SHT: 1 },
  C: { PST: 3, REB: 3, DEF: 3, ATH: 2, IQ: 1, PAS: 1 },
};

/** Long-form labels used inside the reason string. */
const SKILL_LABELS: Record<keyof PlayerSkills, string> = {
  SHT: "shooting",
  PAS: "passing",
  IQ: "IQ",
  HND: "handles",
  DEF: "defense",
  PST: "post game",
  REB: "rebounding",
  ATH: "athleticism",
  SPD: "speed",
};

export type Advantage = "us" | "even" | "them";

export interface AdvantageResult {
  verdict: Advantage;
  /** Short phrase used as MatchupRow tooltip / subtext. */
  reason: string;
  /** Weighted net score — positive = us, negative = them. Useful for tests. */
  net: number;
}

/** Margin inside which we call a matchup "even". Tuned on mock rosters. */
const EVEN_MARGIN = 3;

/**
 * Score a one-on-one matchup. The `position` param is the matchup slot,
 * not necessarily either player's primary position (coaches swap assignments).
 */
export function computeAdvantage(
  our: PlayerSkills,
  their: PlayerSkills,
  position: RosterPlayer["position"],
): AdvantageResult {
  const weights = POSITION_WEIGHTS[position];
  let net = 0;
  let topSkill: keyof PlayerSkills | null = null;
  let topAbsContribution = 0;

  for (const [skillKey, weight] of Object.entries(weights) as Array<
    [keyof PlayerSkills, number]
  >) {
    const diff = our[skillKey] - their[skillKey];
    const contribution = diff * weight;
    net += contribution;
    if (Math.abs(contribution) > topAbsContribution) {
      topAbsContribution = Math.abs(contribution);
      topSkill = skillKey;
    }
  }

  let verdict: Advantage;
  if (net > EVEN_MARGIN) verdict = "us";
  else if (net < -EVEN_MARGIN) verdict = "them";
  else verdict = "even";

  const skillName = topSkill ? SKILL_LABELS[topSkill] : "balanced";
  const reason =
    verdict === "even"
      ? `Even matchup — ${skillName} decides.`
      : verdict === "us"
        ? `Our ${skillName} edge (+${net.toFixed(0)}).`
        : `Their ${skillName} edge (${net.toFixed(0)}).`;

  return { verdict, reason, net };
}

/**
 * Build all 5 matchup rows given our roster + their roster.
 * Assumes both rosters are sorted by position order (PG, SG, SF, PF, C)
 * and have exactly 5 players each. Extra/missing entries are dropped.
 */
export function buildMatchupRows(
  ours: RosterPlayer[],
  theirs: RosterPlayer[],
) {
  const orderKey: Record<RosterPlayer["position"], number> = {
    PG: 0,
    SG: 1,
    SF: 2,
    PF: 3,
    C: 4,
  };
  const sortFn = (a: RosterPlayer, b: RosterPlayer) =>
    orderKey[a.position] - orderKey[b.position];
  const sortedOurs = [...ours].sort(sortFn);
  const sortedTheirs = [...theirs].sort(sortFn);
  const count = Math.min(sortedOurs.length, sortedTheirs.length);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const our = sortedOurs[i];
    const their = sortedTheirs[i];
    const adv = computeAdvantage(our.skills, their.skills, our.position);
    rows.push({
      our: {
        id: our.id,
        name: our.name,
        pos: our.position,
        number: our.number,
      },
      their: {
        name: their.name,
        pos: their.position,
        number: their.number,
      },
      advantage: adv.verdict,
      note: adv.reason,
    });
  }
  return rows;
}
