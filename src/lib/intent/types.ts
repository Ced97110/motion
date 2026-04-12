// Copyright: Your Name. Apache 2.0
// Intent engine — types
//
// Architecture (per CLAUDE.md):
//   signals (passive) → intent inference → dynamic assembly descriptor → UI
// The intent engine does NOT render UI. It outputs a structured assembly
// descriptor that the view layer translates into atoms/components.

export type UserRole = "coach" | "player";

export type SeasonPhase =
  | "preseason"
  | "regular"
  | "playoffs"
  | "offseason";

export type CompetitionLevel =
  | "u10"
  | "u12"
  | "u14"
  | "u16"
  | "u18"
  | "senior"
  | "nba";

export type RulesFramework = "fiba" | "nba";

export interface PlayerSkills {
  SHT: number; // shooting 1-10
  PAS: number;
  IQ: number;
  HND: number;
  DEF: number;
  PST: number;
  REB: number;
  ATH: number;
  SPD: number;
}

export interface RosterPlayer {
  id: string;
  name: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  number: number;
  skills: PlayerSkills;
}

export interface GameRecord {
  /** ISO date string (e.g. "2026-04-09") */
  date: string;
  opponent: string;
  result: "win" | "loss";
  our_score: number;
  their_score: number;
  /** Machine-readable tags of what broke/worked, used for intent/practice assembly */
  breakdowns: string[];
  successes: string[];
}

export interface ScheduledEvent {
  /** ISO date-time string */
  at: string;
  kind: "game" | "practice";
  opponent?: string;
  location?: string;
}

export interface EngagementPattern {
  /** Total sessions in the last 30 days */
  sessions_30d: number;
  /** Modules opened ordered by frequency desc */
  top_modules: string[];
  /** Avg session length in minutes */
  avg_session_min: number;
}

/**
 * The 8 signals collected passively. Each signal is optional — the engine
 * degrades gracefully when signals are missing (e.g., first-time user has
 * no game history).
 */
export interface Signals {
  /** Local time at inference (ISO). Never null — synthesized from clock if absent. */
  now: string;
  role: UserRole | null;
  season_phase: SeasonPhase | null;
  level: CompetitionLevel | null;
  rules: RulesFramework | null;
  roster: RosterPlayer[] | null;
  schedule: ScheduledEvent[] | null;
  recent_activity: string[] | null;
  game_history: GameRecord[] | null;
  engagement: EngagementPattern | null;
}

/** The 5 primary intents. Each maps to a coach- or player-facing assembly. */
export type IntentKind =
  | "prepare_for_game" // game day (coach)
  | "run_practice" // practice day (coach)
  | "study_and_prepare" // off day / evening (either)
  | "quick_adjustments" // halftime (coach)
  | "personal_development"; // always-on (player)

export interface Intent {
  kind: IntentKind;
  /** 0-1 confidence — when < 0.5 the UI should offer a disambiguation row. */
  confidence: number;
  /** Short human-readable rationale surfaced in "Why this view?" tooltip. */
  reason: string;
  /**
   * Contextual payload for the assembly — e.g. for prepare_for_game this
   * contains the scheduled game; for quick_adjustments it is empty (chips
   * are the input). Keyed by intent kind for type-safety at call sites.
   */
  context: Record<string, unknown>;
}

/**
 * Assembly descriptor — a declarative list of atoms the view layer must
 * render, in order. The engine chooses atoms; the view renders them. This
 * separation is what lets the same 14 atoms recompose into any intent.
 */
export type AtomId =
  | "matchup_rows"
  | "stat_cells"
  | "play_cards"
  | "court_diagram"
  | "drill_blocks"
  | "timer"
  | "muscle_map"
  | "observation_chips"
  | "ai_answer"
  | "progress_bars"
  | "roster_grid"
  | "phase_tabs"
  | "breadcrumb"
  | "toggle_group";

export interface AtomSpec {
  id: AtomId;
  /** Arbitrary per-atom props the view layer knows how to interpret. */
  props: Record<string, unknown>;
  /** Optional heading shown above the atom. */
  heading?: string;
}

export interface Assembly {
  intent: Intent;
  /** Title shown at the top of the assembled view. */
  title: string;
  /** Short subtitle — the "answer" the app is delivering. */
  subtitle: string;
  atoms: AtomSpec[];
}
