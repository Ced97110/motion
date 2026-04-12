// Copyright: Your Name. Apache 2.0
// Scoring functions for Motion's two AI features.
//
// These functions are pure — no I/O, no Claude calls — so they can be unit
// tested and run in --offline mode against already-registered plays.
//
// Scoring philosophy: each scorer accumulates weighted sub-checks and
// returns a fraction in [0, 1]. A case passes only when the score is 1.0
// (every expectation satisfied). Partial-credit scores exist to make
// regressions visible between iterations rather than being a binary fail.

import {
  findCollisions,
  validateSemanticPlay,
  type SemanticAction,
  type SemanticPlay,
} from "../court/synthesize";
import {
  isProseDerived,
  parseDiagramPositions,
  validateDiagramPositions,
  type DiagramPositions,
} from "../court/diagram-positions";
import {
  clamp01,
  type EvalFailure,
  type EvalResult,
  PASS_THRESHOLD,
} from "./types";

// ── Synthesizer scorer ──────────────────────────────────────────────────

/** Matches the collision-error sentence format from validateSemanticPlay. */
const COLLISION_ERR_RE = /within [\d.]+ units/;

export interface SynthExpectations {
  min_phases: number;
  expected_players: readonly string[];
  must_have_action_types: readonly SemanticAction["type"][];
  must_avoid_collisions: boolean;
}

/**
 * Score a SemanticPlay against a golden case's expectations.
 *
 * Sub-checks (equally weighted):
 *   1. Semantic schema validates (no position/player errors).
 *   2. Phase count ≥ min_phases.
 *   3. Every expected player id present in `players`.
 *   4. Every required action type appears at least once across phases.
 *   5. Collision-free at every phase boundary.
 */
export function scoreSemanticPlay(
  case_id: string,
  play: SemanticPlay,
  expectations: SynthExpectations,
): EvalResult {
  const failures: EvalFailure[] = [];
  const notes: string[] = [];

  // 1. Schema validation — structural only. `validateSemanticPlay` also
  // includes collision messages when no structural errors are found; we
  // split those off so the collision sub-check owns them and the schema
  // sub-check doesn't double-count.
  const allErrs = validateSemanticPlay(play);
  const structuralErrs = allErrs.filter((e) => !COLLISION_ERR_RE.test(e));
  const schemaOk = structuralErrs.length === 0 ? 1 : 0;
  if (!schemaOk) {
    for (const err of structuralErrs) {
      failures.push({ kind: "schema-invalid", detail: err });
    }
  }
  notes.push(`schema_errors=${structuralErrs.length}`);

  // 2. Phase count
  const phaseOk = play.phases.length >= expectations.min_phases ? 1 : 0;
  if (!phaseOk) {
    failures.push({
      kind: "min-phases",
      detail: `got ${play.phases.length} phases, expected ≥ ${expectations.min_phases}`,
    });
  }
  notes.push(`phases=${play.phases.length}`);

  // 3. Expected players
  const presentIds = new Set(Object.keys(play.players));
  const missingPlayers = expectations.expected_players.filter(
    (id) => !presentIds.has(id),
  );
  const playersOk = missingPlayers.length === 0 ? 1 : 0;
  if (!playersOk) {
    failures.push({
      kind: "missing-players",
      detail: `missing player ids: ${missingPlayers.join(", ")}`,
    });
  }

  // 4. Required action types
  const seenActionTypes = new Set<SemanticAction["type"]>();
  for (const phase of play.phases) {
    for (const action of phase.actions) {
      seenActionTypes.add(action.type);
    }
  }
  const missingActionTypes = expectations.must_have_action_types.filter(
    (t) => !seenActionTypes.has(t),
  );
  const actionsOk = missingActionTypes.length === 0 ? 1 : 0;
  if (!actionsOk) {
    failures.push({
      kind: "missing-action-types",
      detail: `missing action types: ${missingActionTypes.join(", ")}`,
    });
  }
  notes.push(`action_types=${[...seenActionTypes].sort().join("|")}`);

  // 5. Collisions. Run `findCollisions` directly so this sub-check is
  // independent of `schemaOk`. findCollisions can throw when referenced
  // positions are unknown (structural failure), so we guard with try/catch.
  let collisionOk = 1;
  if (expectations.must_avoid_collisions) {
    try {
      const collisions = findCollisions(play);
      if (collisions.length > 0) {
        collisionOk = 0;
        for (const c of collisions) {
          failures.push({
            kind: "collision",
            detail: `${c.phaseLabel}: players ${c.playerA} and ${c.playerB} within ${c.distance.toFixed(2)} units`,
          });
        }
      }
      notes.push(`collisions=${collisions.length}`);
    } catch (err: unknown) {
      collisionOk = 0;
      failures.push({
        kind: "collision-uncheckable",
        detail: `collision check threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const score = clamp01(
    (schemaOk + phaseOk + playersOk + actionsOk + collisionOk) / 5,
  );

  return {
    case_id,
    score,
    passed: score >= PASS_THRESHOLD,
    failures,
    notes,
  };
}

// ── Diagram resolver scorer ─────────────────────────────────────────────

export interface ResolverExpectations {
  must_not_be_prose_derived: boolean;
  min_players: number;
  max_validation_issues: number;
}

/**
 * Score a diagram-positions block. Input is the raw wiki body (or a bare
 * JSON string that parseDiagramPositions can extract). Missing/malformed
 * blocks score 0.
 *
 * Sub-checks (equally weighted):
 *   1. Block parses successfully.
 *   2. Player count ≥ min_players.
 *   3. Validation issues ≤ max_validation_issues.
 *   4. `isProseDerived` matches the must-not flag.
 */
export function scoreDiagramResolution(
  case_id: string,
  wikiBodyOrJson: string,
  expectations: ResolverExpectations,
): EvalResult {
  const failures: EvalFailure[] = [];
  const notes: string[] = [];

  const diagram = parseDiagramOrFallback(wikiBodyOrJson);

  // 1. Parsed
  const parseOk = diagram !== null ? 1 : 0;
  if (!parseOk) {
    failures.push({
      kind: "parse-failed",
      detail: "no diagram-positions block found or JSON invalid",
    });
    return {
      case_id,
      score: 0,
      passed: false,
      failures,
      notes: ["parsed=false"],
    };
  }

  const parsed = diagram as DiagramPositions;
  notes.push(`players=${parsed.players.length}`);

  // 2. Player count
  const playersOk = parsed.players.length >= expectations.min_players ? 1 : 0;
  if (!playersOk) {
    failures.push({
      kind: "min-players",
      detail: `got ${parsed.players.length} players, expected ≥ ${expectations.min_players}`,
    });
  }

  // 3. Validation issues
  const issues = validateDiagramPositions(parsed);
  const issuesOk = issues.length <= expectations.max_validation_issues ? 1 : 0;
  if (!issuesOk) {
    for (const issue of issues) {
      failures.push({
        kind: `validator:${issue.kind}`,
        detail: issue.detail,
      });
    }
  }
  notes.push(`validator_issues=${issues.length}`);

  // 4. Prose-derived flag
  const proseDerived = isProseDerived(parsed);
  notes.push(`prose_derived=${proseDerived}`);
  let fidelityOk = 1;
  if (expectations.must_not_be_prose_derived && proseDerived) {
    fidelityOk = 0;
    failures.push({
      kind: "prose-derived",
      detail: `notes indicate prose-derived reconstruction: "${parsed.notes ?? ""}"`,
    });
  }

  const score = clamp01((parseOk + playersOk + issuesOk + fidelityOk) / 4);

  return {
    case_id,
    score,
    passed: score >= PASS_THRESHOLD,
    failures,
    notes,
  };
}

/**
 * Accept either a full wiki body (with the fenced code block) or a bare
 * JSON string. Bare JSON is convenient for tests and golden-file fixtures.
 */
function parseDiagramOrFallback(input: string): DiagramPositions | null {
  const viaBody = parseDiagramPositions(input);
  if (viaBody !== null) return viaBody;
  // Try bare JSON.
  try {
    const parsed = JSON.parse(input) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.players)) return null;
    const wrapped = `\`\`\`json name=diagram-positions\n${input}\n\`\`\``;
    return parseDiagramPositions(wrapped);
  } catch {
    return null;
  }
}
