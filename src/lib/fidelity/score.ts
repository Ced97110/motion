// Copyright: Your Name. Apache 2.0
//
// Per-play fidelity score — a 0.0-1.0 confidence that a registered play
// matches its source-book diagram. Public-facing telemetry for coaches
// (e.g., "Weakside Flare Slip: 0.92 confident"). Also used internally
// to rank plays in the library and surface low-fidelity plays for review.
//
// The score is a weighted sum of six independent, verifiable signals:
//
//   diagram_grounded   +0.30   diagram-positions present AND not prose-derived
//   diagram_validates  +0.20   parsed diagram passes validateDiagramPositions
//   revalidates        +0.20   semantic form passes the current synthesizer rules
//   has_sources        +0.10   wiki frontmatter source_count >= 2
//   has_semantic       +0.10   play exports *Semantic (re-translatable)
//   not_quarantined    +0.10   play lives in src/data/plays/ (not _review/)
//
// The weights are deliberately front-loaded on diagram signals: a diagram
// that came from the actual book page is the strongest evidence that the
// play faithfully represents its source. Sources and semantic form are
// tie-breakers. This function is pure — callers gather the inputs from
// disk / the revalidator / module inspection and pass them in.
//
// Pure function. Zero I/O. Deterministic. Unit-tested in __tests__/score.test.ts.

import {
  parseDiagramPositions,
  validateDiagramPositions,
  isProseDerived,
} from "../court/diagram-positions";

export interface FidelityInputs {
  slug: string;
  hasRegisteredPlay: boolean;
  hasWikiPage: boolean;
  wikiBody?: string;
  sourceCount?: number;
  revalidates?: boolean;
  hasSemanticExport?: boolean;
  isQuarantined?: boolean;
}

export interface FidelityBreakdown {
  diagram_grounded: number;
  diagram_validates: number;
  revalidates: number;
  has_sources: number;
  has_semantic: number;
  not_quarantined: number;
}

export interface FidelityScore {
  slug: string;
  score: number;
  breakdown: FidelityBreakdown;
  reasons: string[];
}

const W = {
  diagram_grounded: 0.3,
  diagram_validates: 0.2,
  revalidates: 0.2,
  has_sources: 0.1,
  has_semantic: 0.1,
  not_quarantined: 0.1,
} as const;

/**
 * Compute a 0.0-1.0 fidelity score for a single play. All inputs are optional
 * except `slug` and the `hasRegisteredPlay` / `hasWikiPage` flags — when a
 * signal's input is missing, that component contributes 0 to the score.
 *
 * The score is clamped to [0, 1] and rounded to two decimal places for
 * display. The `reasons` array explains every positive and negative
 * contribution in human-readable form.
 */
export function computeFidelity(inputs: FidelityInputs): FidelityScore {
  const reasons: string[] = [];
  const breakdown: FidelityBreakdown = {
    diagram_grounded: 0,
    diagram_validates: 0,
    revalidates: 0,
    has_sources: 0,
    has_semantic: 0,
    not_quarantined: 0,
  };

  // --- diagram signals (derived from wiki body if present) ---
  if (!inputs.hasWikiPage || !inputs.wikiBody) {
    reasons.push("no wiki page — diagram signals unavailable");
  } else {
    const diagram = parseDiagramPositions(inputs.wikiBody);
    if (!diagram) {
      reasons.push("wiki page has no diagram-positions block");
    } else if (isProseDerived(diagram)) {
      reasons.push(
        "diagram-positions block is prose-derived (no book diagram)"
      );
    } else {
      breakdown.diagram_grounded = W.diagram_grounded;
      reasons.push(
        `+${W.diagram_grounded.toFixed(2)} diagram grounded in book diagram`
      );

      const issues = validateDiagramPositions(diagram);
      if (issues.length === 0) {
        breakdown.diagram_validates = W.diagram_validates;
        reasons.push(
          `+${W.diagram_validates.toFixed(2)} diagram passes validation`
        );
      } else {
        reasons.push(
          `diagram has ${issues.length} validation issue(s): ${issues
            .map((i) => i.kind)
            .join(", ")}`
        );
      }
    }
  }

  // --- revalidator signal ---
  if (inputs.revalidates === true) {
    breakdown.revalidates = W.revalidates;
    reasons.push(`+${W.revalidates.toFixed(2)} revalidator passes`);
  } else if (inputs.revalidates === false) {
    reasons.push("revalidator fails on current rules");
  } else {
    reasons.push("revalidator not run for this slug");
  }

  // --- sources signal ---
  if (typeof inputs.sourceCount === "number" && inputs.sourceCount >= 2) {
    breakdown.has_sources = W.has_sources;
    reasons.push(
      `+${W.has_sources.toFixed(2)} source_count=${inputs.sourceCount} (>=2)`
    );
  } else if (typeof inputs.sourceCount === "number") {
    reasons.push(`source_count=${inputs.sourceCount} (need >=2)`);
  } else {
    reasons.push("source_count missing from frontmatter");
  }

  // --- semantic export signal ---
  if (inputs.hasSemanticExport === true) {
    breakdown.has_semantic = W.has_semantic;
    reasons.push(
      `+${W.has_semantic.toFixed(2)} has *Semantic export (re-translatable)`
    );
  } else {
    reasons.push("no *Semantic export (hand-authored or legacy)");
  }

  // --- quarantine signal ---
  if (inputs.isQuarantined === true) {
    reasons.push("play is quarantined in _review/");
  } else {
    breakdown.not_quarantined = W.not_quarantined;
    reasons.push(`+${W.not_quarantined.toFixed(2)} not quarantined`);
  }

  const raw =
    breakdown.diagram_grounded +
    breakdown.diagram_validates +
    breakdown.revalidates +
    breakdown.has_sources +
    breakdown.has_semantic +
    breakdown.not_quarantined;

  const score = Math.max(0, Math.min(1, Math.round(raw * 100) / 100));

  return { slug: inputs.slug, score, breakdown, reasons };
}
