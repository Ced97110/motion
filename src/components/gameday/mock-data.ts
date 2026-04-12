// Mock data for Game Day Flow. Lives here so the main component stays
// focused on presentation + state. Replace with live data from the store or
// API endpoints once wired.

import {
  ACCENT,
  COLOR_GREEN,
  COLOR_AMBER,
  TEXT_DIM,
} from "@/lib/design-tokens";

export interface ChipOption {
  id: string;
  label: string;
}

export interface GameSnapshot {
  opponent: string;
  score: { us: number; them: number };
  quarter: string;
  plan: { scheme: string; plays: string[] };
}

export interface Adjustment {
  type: "offense" | "defense" | "situational" | "offline";
  priority?: "high" | "medium" | "low";
  text: string;
  color: string;
}

export interface LiveExploit {
  text: string;
  urgency: "critical" | "warning" | "info";
  time: string;
}

export interface BoxRow {
  num: string;
  name: string;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  to: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  fls: number;
}

export const GAME: GameSnapshot = {
  opponent: "Opponent",
  score: { us: 28, them: 31 },
  quarter: "Halftime",
  plan: {
    scheme: "Man with ICE on PnR",
    plays: ["Weakside Flare Slip", "Horns Elbow Pop", "Spain PnR", "Floppy Double"],
  },
};

export const CHIP_DATA: Record<"offense" | "defense" | "situational", ChipOption[]> = {
  offense: [
    { id: "pnr_working", label: "Our PnR is working" },
    { id: "3pt_cold", label: "Cold from three" },
    { id: "post_mismatch", label: "Post mismatch" },
    { id: "transition_open", label: "Transition is open" },
    { id: "turnovers", label: "Too many turnovers" },
    { id: "fts_missing", label: "Missing free throws" },
  ],
  defense: [
    { id: "their_3_hot", label: "Their 3 is hot" },
    { id: "key_player_hot", label: "Their key guard getting left" },
    { id: "boards_losing", label: "Losing the boards" },
    { id: "foul_trouble", label: "Foul trouble" },
    { id: "our_d_working", label: "Our D is working" },
    { id: "fast_break_leak", label: "Leaking fast breaks" },
  ],
  situational: [
    { id: "timeout_play", label: "Need a timeout play" },
    { id: "end_quarter", label: "End of quarter set" },
    { id: "press_break", label: "They're pressing" },
    { id: "stall", label: "Need to run clock" },
  ],
};

export const AI_ADJ: Adjustment[] = [
  {
    type: "offense",
    priority: "high",
    text: "Switch to Horns Elbow Pop. You're 1-7 from three — attack mid-range. Your 3's elbow pull-up is 3-4.",
    color: ACCENT,
  },
  {
    type: "defense",
    priority: "high",
    text: "Double their key guard on left-side PnR. He's 5-6 from the left floater. Trap and rotate — give up the corner three, #12 is 0-3.",
    color: COLOR_GREEN,
  },
  {
    type: "situational",
    priority: "medium",
    text: "Attack their 4 in the post. Their center has 3 fouls — be aggressive, draw the 4th.",
    color: COLOR_AMBER,
  },
];

export const FALLBACK_ADJ: Adjustment[] = [
  {
    type: "offline",
    text: "If their 3 is hot → switch to 2-3 zone for 2-3 possessions, then switch back.",
    color: TEXT_DIM,
  },
  {
    type: "offline",
    text: "If foul trouble → sub pattern: rotate your 4 with a bench big, keep your 5 in.",
    color: TEXT_DIM,
  },
  {
    type: "offline",
    text: "If turnovers → slow pace, run half-court sets only. No transition pushing.",
    color: TEXT_DIM,
  },
];

export const LIVE_EXPLOITS: LiveExploit[] = [
  { text: "Their center has 4 fouls — attack the post NOW", urgency: "critical", time: "3:42 Q3" },
  { text: "You're 2-14 from three — drive and kick to mid-range", urgency: "warning", time: "5:10 Q3" },
  { text: "Their #12 is 0-4 — sag off, help on their key guard", urgency: "info", time: "6:20 Q3" },
];

export const BOX: BoxRow[] = [
  { num: "1", name: "Guard 1", min: 16, pts: 8, reb: 1, ast: 4, to: 2, fgm: 3, fga: 7, tpm: 1, tpa: 4, fls: 1 },
  { num: "2", name: "Shooter 2", min: 16, pts: 3, reb: 2, ast: 0, to: 1, fgm: 1, fga: 5, tpm: 0, tpa: 3, fls: 2 },
  { num: "3", name: "Wing 3", min: 14, pts: 9, reb: 3, ast: 1, to: 0, fgm: 4, fga: 6, tpm: 0, tpa: 0, fls: 1 },
  { num: "4", name: "Forward 4", min: 16, pts: 6, reb: 5, ast: 0, to: 1, fgm: 2, fga: 4, tpm: 0, tpa: 0, fls: 2 },
  { num: "5", name: "Post 5", min: 16, pts: 2, reb: 4, ast: 3, to: 1, fgm: 1, fga: 3, tpm: 0, tpa: 0, fls: 0 },
];
