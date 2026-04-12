// Copyright: Your Name. Apache 2.0
// Signal collection — reads from localStorage (client) or injected store (server).
// Keep this module pure: no React, no side effects at import time. This lets
// the same signal shape be built on the server (cookies) or client (localStorage).

import type {
  CompetitionLevel,
  EngagementPattern,
  GameRecord,
  RosterPlayer,
  RulesFramework,
  ScheduledEvent,
  SeasonPhase,
  Signals,
  UserRole,
} from "./types";

/** localStorage keys. Namespaced "motion:" to avoid collisions. */
export const STORE_KEYS = {
  role: "motion:role",
  season_phase: "motion:season_phase",
  level: "motion:level",
  rules: "motion:rules",
  roster: "motion:roster",
  schedule: "motion:schedule",
  recent_activity: "motion:recent_activity",
  game_history: "motion:game_history",
  engagement: "motion:engagement",
} as const;

/** Minimal safe JSON parse — returns fallback on any error. */
function readJSON<T>(key: string, fallback: T | null): T | null {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

/**
 * Collect all signals from browser storage.
 * Pure read — never writes. Server-side callers can override via the
 * overrides parameter (used for SSR preview, tests, and mock mode).
 */
export function collectSignals(overrides: Partial<Signals> = {}): Signals {
  const now = overrides.now ?? new Date().toISOString();
  return {
    now,
    role: overrides.role ?? (readString(STORE_KEYS.role) as UserRole | null),
    season_phase:
      overrides.season_phase ??
      (readString(STORE_KEYS.season_phase) as SeasonPhase | null),
    level:
      overrides.level ??
      (readString(STORE_KEYS.level) as CompetitionLevel | null),
    rules:
      overrides.rules ??
      (readString(STORE_KEYS.rules) as RulesFramework | null),
    roster:
      overrides.roster ?? readJSON<RosterPlayer[]>(STORE_KEYS.roster, null),
    schedule:
      overrides.schedule ??
      readJSON<ScheduledEvent[]>(STORE_KEYS.schedule, null),
    recent_activity:
      overrides.recent_activity ??
      readJSON<string[]>(STORE_KEYS.recent_activity, null),
    game_history:
      overrides.game_history ??
      readJSON<GameRecord[]>(STORE_KEYS.game_history, null),
    engagement:
      overrides.engagement ??
      readJSON<EngagementPattern>(STORE_KEYS.engagement, null),
  };
}

// --- Derived signal helpers used by the engine ---------------------------

/** Hours until the next scheduled event of the given kind, or null. */
export function hoursUntilNext(
  signals: Signals,
  kind: "game" | "practice",
): number | null {
  if (!signals.schedule) return null;
  const nowMs = new Date(signals.now).getTime();
  const upcoming = signals.schedule
    .filter((e) => e.kind === kind)
    .map((e) => new Date(e.at).getTime() - nowMs)
    .filter((ms) => ms >= 0);
  if (upcoming.length === 0) return null;
  return Math.min(...upcoming) / (1000 * 60 * 60);
}

/** Hours since the last event of the given kind began (can be negative). */
export function hoursSinceLast(
  signals: Signals,
  kind: "game" | "practice",
): number | null {
  if (!signals.schedule) return null;
  const nowMs = new Date(signals.now).getTime();
  const past = signals.schedule
    .filter((e) => e.kind === kind)
    .map((e) => nowMs - new Date(e.at).getTime())
    .filter((ms) => ms >= 0);
  if (past.length === 0) return null;
  return Math.min(...past) / (1000 * 60 * 60);
}

/**
 * Is the user in the "halftime window" — game started but not finished?
 * Approximation: within 0-2.5h of a scheduled game start. Real implementation
 * will flip to true when coach taps "Start game" and flip back on "End game".
 */
export function isHalftimeWindow(signals: Signals): boolean {
  const since = hoursSinceLast(signals, "game");
  if (since === null) return false;
  return since >= 0.3 && since <= 2.5;
}

/** Local hour-of-day (0-23) in the client timezone implied by `now`. */
export function localHour(signals: Signals): number {
  return new Date(signals.now).getHours();
}
