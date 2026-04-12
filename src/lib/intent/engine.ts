// Copyright: Your Name. Apache 2.0
// Intent inference engine.
//
// Given a Signals snapshot, produce a single best Intent with confidence +
// rationale. The rules below are deliberately boring and explicit: a scoring
// loop, not a model. This keeps the "answer" auditable — the coach can
// always see *why* the app chose this view, which is a product requirement
// (reflective-level design: the coach must trust what the app picked).

import type { Intent, IntentKind, Signals } from "./types";
import {
  hoursSinceLast,
  hoursUntilNext,
  isHalftimeWindow,
  localHour,
} from "./signals";

interface ScoredIntent {
  kind: IntentKind;
  score: number;
  reason: string;
  context: Record<string, unknown>;
}

/**
 * Score each candidate intent against the signals. Highest score wins.
 * Scores are on an open scale (higher = stronger signal) and normalized to
 * a 0-1 confidence at the end by softmax.
 */
function scoreIntents(signals: Signals): ScoredIntent[] {
  const scored: ScoredIntent[] = [];
  const role = signals.role ?? "coach";

  // ── Intent 4: quick_adjustments (halftime) ──────────────────────────
  // Strongest signal: we're mid-game. Short-circuits everything else.
  if (role === "coach" && isHalftimeWindow(signals)) {
    scored.push({
      kind: "quick_adjustments",
      score: 10,
      reason: "Game is in progress — halftime window detected.",
      context: { hours_into_game: hoursSinceLast(signals, "game") },
    });
  }

  // ── Intent 1: prepare_for_game (game day) ────────────────────────────
  // Fires when a game is scheduled within the next 12 hours.
  if (role === "coach") {
    const untilGame = hoursUntilNext(signals, "game");
    if (untilGame !== null && untilGame <= 12) {
      // Closer to tip-off → higher urgency.
      const urgency = Math.max(0, 12 - untilGame) / 12;
      scored.push({
        kind: "prepare_for_game",
        score: 4 + 4 * urgency,
        reason: `Game in ${untilGame.toFixed(1)}h — prep view.`,
        context: {
          hours_until_game: untilGame,
          scheduled: signals.schedule?.find(
            (e) => e.kind === "game" && new Date(e.at) >= new Date(signals.now),
          ),
        },
      });
    }
  }

  // ── Intent 2: run_practice (practice day) ────────────────────────────
  // Fires when a practice is within 6 hours on either side of now.
  if (role === "coach") {
    const untilPractice = hoursUntilNext(signals, "practice");
    const sincePractice = hoursSinceLast(signals, "practice");
    const nearPractice =
      (untilPractice !== null && untilPractice <= 6) ||
      (sincePractice !== null && sincePractice <= 2);
    if (nearPractice) {
      scored.push({
        kind: "run_practice",
        score: 5,
        reason:
          untilPractice !== null
            ? `Practice in ${untilPractice.toFixed(1)}h — plan ready.`
            : "Practice in progress — timer view.",
        context: {
          hours_until_practice: untilPractice,
          hours_since_practice: sincePractice,
          last_game_breakdowns:
            signals.game_history?.[0]?.breakdowns ?? [],
        },
      });
    }
  }

  // ── Intent 5: personal_development (always-on, player) ──────────────
  if (role === "player") {
    scored.push({
      kind: "personal_development",
      score: 4,
      reason: "Player role — personal development is the home view.",
      context: { roster_self: signals.roster?.[0] ?? null },
    });
  }

  // ── Intent 3: study_and_prepare (off day / evening fallback) ─────────
  // Always in the pool at a low base score. Boosted when it's evening
  // (20:00-23:59) or when no game/practice is within a 48h window.
  const hour = localHour(signals);
  const evening = hour >= 20 && hour <= 23;
  const hasNothingNearby =
    hoursUntilNext(signals, "game") === null &&
    hoursUntilNext(signals, "practice") === null;
  scored.push({
    kind: "study_and_prepare",
    score: 1 + (evening ? 1.5 : 0) + (hasNothingNearby ? 1.5 : 0),
    reason: evening
      ? "Evening — study mode."
      : hasNothingNearby
        ? "No game or practice scheduled — browse and study."
        : "Off day default.",
    context: {},
  });

  return scored;
}

/** Softmax confidence normalization — stable against wide score ranges. */
function softmaxConfidence(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Infer the single best intent for this moment.
 * Never returns null — the fallback is always study_and_prepare.
 */
export function inferIntent(signals: Signals): Intent {
  const scored = scoreIntents(signals);
  const confidences = softmaxConfidence(scored.map((s) => s.score));
  let bestIdx = 0;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > scored[bestIdx].score) bestIdx = i;
  }
  const best = scored[bestIdx];
  return {
    kind: best.kind,
    confidence: confidences[bestIdx],
    reason: best.reason,
    context: best.context,
  };
}

/** Expose all candidates for debug UI (the "Why this view?" drawer). */
export function debugRankIntents(signals: Signals): Intent[] {
  const scored = scoreIntents(signals);
  const confidences = softmaxConfidence(scored.map((s) => s.score));
  return scored
    .map((s, i) => ({
      kind: s.kind,
      confidence: confidences[i],
      reason: s.reason,
      context: s.context,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
