// Copyright: Your Name. Apache 2.0
// Mock roster + schedule + history — used until the backend is wired.
// Seeded from the Weakside Flare Slip reference so the first-run demo feels
// cohesive (same 5 player names and positions as the hero animation).

import type {
  GameRecord,
  RosterPlayer,
  ScheduledEvent,
} from "../intent/types";

/**
 * Mock opponent in MOCK_SCHEDULE. Seeded with slightly
 * different skill shapes so advantage scoring has something to decide:
 * their 5 is weaker on REB, their 2 is hot from three (SHT 10).
 */
export const MOCK_OPPONENT: RosterPlayer[] = [
  {
    id: "o1",
    name: "Opp PG",
    position: "PG",
    number: 4,
    skills: { SHT: 7, PAS: 7, IQ: 8, HND: 8, DEF: 9, PST: 4, REB: 5, ATH: 7, SPD: 7 },
  },
  {
    id: "o2",
    name: "Opp SG",
    position: "SG",
    number: 9,
    skills: { SHT: 10, PAS: 5, IQ: 6, HND: 6, DEF: 6, PST: 3, REB: 4, ATH: 6, SPD: 6 },
  },
  {
    id: "o3",
    name: "Opp SF",
    position: "SF",
    number: 7,
    skills: { SHT: 8, PAS: 6, IQ: 7, HND: 7, DEF: 7, PST: 5, REB: 6, ATH: 9, SPD: 8 },
  },
  {
    id: "o4",
    name: "Opp PF",
    position: "PF",
    number: 0,
    skills: { SHT: 9, PAS: 7, IQ: 8, HND: 8, DEF: 7, PST: 7, REB: 7, ATH: 9, SPD: 7 },
  },
  {
    id: "o5",
    name: "Opp C",
    position: "C",
    number: 42,
    skills: { SHT: 6, PAS: 6, IQ: 8, HND: 4, DEF: 7, PST: 6, REB: 6, ATH: 6, SPD: 4 },
  },
];

export const MOCK_ROSTER: RosterPlayer[] = [
  {
    id: "1",
    name: "Guard 1",
    position: "PG",
    number: 1,
    skills: { SHT: 7, PAS: 9, IQ: 8, HND: 9, DEF: 6, PST: 4, REB: 4, ATH: 7, SPD: 8 },
  },
  {
    id: "2",
    name: "Shooter 2",
    position: "SG",
    number: 2,
    skills: { SHT: 9, PAS: 6, IQ: 7, HND: 7, DEF: 7, PST: 4, REB: 5, ATH: 7, SPD: 7 },
  },
  {
    id: "3",
    name: "Wing 3",
    position: "SF",
    number: 3,
    skills: { SHT: 7, PAS: 6, IQ: 7, HND: 6, DEF: 8, PST: 6, REB: 7, ATH: 8, SPD: 7 },
  },
  {
    id: "4",
    name: "Forward 4",
    position: "PF",
    number: 4,
    skills: { SHT: 6, PAS: 5, IQ: 8, HND: 5, DEF: 9, PST: 8, REB: 9, ATH: 9, SPD: 7 },
  },
  {
    id: "5",
    name: "Post 5",
    position: "C",
    number: 5,
    skills: { SHT: 7, PAS: 9, IQ: 10, HND: 8, DEF: 8, PST: 8, REB: 8, ATH: 9, SPD: 7 },
  },
];

/** Schedule — seeded as "game in 5h, practice yesterday". Dynamic at runtime. */
export function buildMockSchedule(nowIso: string): ScheduledEvent[] {
  const now = new Date(nowIso);
  const inHours = (h: number) =>
    new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
  return [
    { at: inHours(5), kind: "game", opponent: "Rivals", location: "Home" },
    { at: inHours(-24), kind: "practice" },
    { at: inHours(48), kind: "practice" },
    { at: inHours(168), kind: "game", opponent: "Visitors", location: "Away" },
  ];
}

export const MOCK_GAME_HISTORY: GameRecord[] = [
  {
    date: "2026-04-09",
    opponent: "Opponent",
    result: "loss",
    our_score: 88,
    their_score: 94,
    breakdowns: ["pnr_defense", "transition_d", "offensive_rebounding"],
    successes: ["three_point_shooting", "ball_movement"],
  },
  {
    date: "2026-04-06",
    opponent: "Visitors",
    result: "win",
    our_score: 102,
    their_score: 97,
    breakdowns: ["turnovers"],
    successes: ["paint_scoring", "defensive_rebounding", "free_throws"],
  },
];

export const MOCK_RECENT_ACTIVITY = [
  "opened_play_library",
  "viewed_weakside_flare_slip",
  "opened_wiki_pick_and_roll",
];
