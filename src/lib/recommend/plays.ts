// Copyright: Your Name. Apache 2.0
// Play recommender — heuristic ranker that maps roster strengths + a set
// of recommended tags to wiki play pages. Runs server-side only (reads
// the filesystem-backed wiki).
//
// This is intentionally not ML: we use weighted tag matching so the
// "Why this play?" reason is human-readable. The ML layer (cosine-
// similarity archetypes in lib/ml) kicks in later once user behavior
// data exists.

import { loadAllPages } from "../wiki-loader";
import type { PlayerSkills, RosterPlayer } from "../intent/types";
import { topStrengths } from "../intent/assembly";

export interface RecommendedPlay {
  slug: string;
  name: string;
  tag: string;
  /** Ranked reason surfaced in the UI. */
  reason: string;
  /** Internal score — higher is better. */
  score: number;
}

/** Skill → tag affinity. Matches the 9 SKILL_KEYS from lib/ml/archetypes.py. */
const SKILL_TO_TAGS: Record<keyof PlayerSkills, string[]> = {
  SHT: ["flare", "pin down", "off-ball", "catch and shoot", "three point"],
  PAS: ["motion", "horns", "delay", "handoff"],
  IQ: ["read", "option", "counter"],
  HND: ["ball screen", "pick and roll", "iso", "dribble handoff"],
  DEF: ["press", "trap", "switch"],
  PST: ["post up", "high post", "low post"],
  REB: ["offensive rebound", "crash"],
  ATH: ["lob", "alley-oop", "transition"],
  SPD: ["fast break", "transition", "push"],
};

function normalize(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Recommend top N plays for a roster + optional tag bias.
 * @param roster - the coach's roster (null → no skill bias, tag-only)
 * @param recommendTags - seed tags from the assembly (e.g. Ball Screen)
 * @param limit - cap on returned plays
 */
export function recommendPlays(
  roster: RosterPlayer[] | null,
  recommendTags: string[] | null,
  limit = 4,
): RecommendedPlay[] {
  const pages = loadAllPages().filter((p) => p.type === "play");
  const strengths = topStrengths(roster, 3) as Array<keyof PlayerSkills>;
  const strengthTags = new Set<string>();
  for (const s of strengths) {
    for (const t of SKILL_TO_TAGS[s] ?? []) strengthTags.add(normalize(t));
  }
  const seedTags = new Set(
    (recommendTags ?? []).map((t) => normalize(t)),
  );

  const scored: RecommendedPlay[] = pages.map((p) => {
    const pageTags = new Set(p.tags.map(normalize));
    let score = 0;
    const matchedSeed: string[] = [];
    const matchedStrength: string[] = [];
    for (const t of seedTags) {
      if (pageTags.has(t)) {
        score += 3;
        matchedSeed.push(t);
      }
    }
    for (const t of strengthTags) {
      if (pageTags.has(t)) {
        score += 1;
        matchedStrength.push(t);
      }
    }
    // Small tie-breaker based on source count — more-sourced plays are
    // better-documented and more trustworthy as recommendations.
    score += Math.min(0.5, (p.source_count ?? 0) * 0.1);

    const reasonParts: string[] = [];
    if (matchedSeed.length > 0) {
      reasonParts.push(`Matches tonight's scheme (${matchedSeed[0]})`);
    }
    if (matchedStrength.length > 0 && strengths.length > 0) {
      reasonParts.push(
        `Leverages your ${strengths[0]} strength`,
      );
    }
    if (reasonParts.length === 0) {
      reasonParts.push("Foundational play from the library");
    }

    return {
      slug: p.slug,
      name: p.title,
      tag: p.tags[0] ?? p.category ?? "Play",
      reason: reasonParts.join(" — "),
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
