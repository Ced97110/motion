// Copyright: Your Name. Apache 2.0
// Thin localStorage-backed coach store. Wraps read/write for each signal
// shape behind typed helpers so the call sites stay readable. Not a repo
// abstraction — just enough to unblock the frontend until FastAPI is in.

"use client";

import { STORE_KEYS } from "../intent/signals";
import type {
  CompetitionLevel,
  EngagementPattern,
  GameRecord,
  RosterPlayer,
  RulesFramework,
  ScheduledEvent,
  SeasonPhase,
  UserRole,
} from "../intent/types";
import {
  MOCK_GAME_HISTORY,
  MOCK_RECENT_ACTIVITY,
  MOCK_ROSTER,
  buildMockSchedule,
} from "./mock-data";

function setJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function setString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export const coachStore = {
  setRole(role: UserRole): void {
    setString(STORE_KEYS.role, role);
  },
  setSeasonPhase(phase: SeasonPhase): void {
    setString(STORE_KEYS.season_phase, phase);
  },
  setLevel(level: CompetitionLevel): void {
    setString(STORE_KEYS.level, level);
  },
  setRules(rules: RulesFramework): void {
    setString(STORE_KEYS.rules, rules);
  },
  setRoster(roster: RosterPlayer[]): void {
    setJSON(STORE_KEYS.roster, roster);
  },
  setSchedule(schedule: ScheduledEvent[]): void {
    setJSON(STORE_KEYS.schedule, schedule);
  },
  setRecentActivity(activity: string[]): void {
    setJSON(STORE_KEYS.recent_activity, activity);
  },
  setGameHistory(history: GameRecord[]): void {
    setJSON(STORE_KEYS.game_history, history);
  },
  setEngagement(engagement: EngagementPattern): void {
    setJSON(STORE_KEYS.engagement, engagement);
  },

  /**
   * Seed the store with the mock coach so the intent engine has data to
   * reason about on first run. Idempotent — safe to call on every mount.
   */
  seedMockCoach(): void {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORE_KEYS.role)) return; // already seeded
    this.setRole("coach");
    this.setSeasonPhase("regular");
    this.setLevel("u14");
    this.setRules("fiba");
    this.setRoster(MOCK_ROSTER);
    this.setSchedule(buildMockSchedule(new Date().toISOString()));
    this.setGameHistory(MOCK_GAME_HISTORY);
    this.setRecentActivity(MOCK_RECENT_ACTIVITY);
    this.setEngagement({
      sessions_30d: 18,
      top_modules: ["playbook", "practice", "wiki"],
      avg_session_min: 12,
    });
  },

  /** Wipe everything — used by the Settings "Reset demo data" button. */
  reset(): void {
    if (typeof window === "undefined") return;
    for (const key of Object.values(STORE_KEYS)) {
      window.localStorage.removeItem(key);
    }
  },
};
