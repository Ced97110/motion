// Copyright: Your Name. Apache 2.0
// Generic eval harness types.
//
// Every AI feature in Motion ships with a structured eval (input → task →
// scoring function → 0-1 score). These types are deliberately small so new
// features can plug in without touching the runner.

/** A single golden case: opaque input + expectation payload. */
export interface EvalCase<TInput, TExpectations> {
  case_id: string;
  input: TInput;
  expectations: TExpectations;
}

/** One failed expectation for a case — used to render failure details. */
export interface EvalFailure {
  kind: string;
  detail: string;
}

/** Result of scoring a single case. `score` is clamped to [0, 1]. */
export interface EvalResult {
  case_id: string;
  score: number;
  passed: boolean;
  failures: EvalFailure[];
  /** Optional diagnostic breadcrumbs (e.g. counts, validator issues). */
  notes?: string[];
}

/** A pure scoring function. Must not throw on malformed output. */
export type Scorer<TOutput, TExpectations> = (
  case_id: string,
  output: TOutput,
  expectations: TExpectations,
) => EvalResult;

/** Minimum score to consider a case passing. */
export const PASS_THRESHOLD = 1.0;

/** Clamp utility so scorers can compose partial-credit checks safely. */
export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
