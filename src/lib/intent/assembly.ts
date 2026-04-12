// Copyright: Your Name. Apache 2.0
// Assembly descriptor — translates an Intent into a concrete list of atoms.
//
// This is the "same building blocks, different views" layer from CLAUDE.md.
// The view renders atoms; the engine decides which atoms and in what order.
// Keep this module data-only — no React imports.

import type {
  Assembly,
  AtomSpec,
  Intent,
  RosterPlayer,
  Signals,
} from "./types";
import { buildMatchupRows } from "../recommend/matchup";

/** A handful of "answer-style" copy helpers, not user-visible in full. */
function countBy<T, K extends string | number>(
  arr: T[],
  key: (t: T) => K,
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of arr) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Top-N strengths from a roster — used for play recommendations. */
export function topStrengths(
  roster: RosterPlayer[] | null,
  n = 3,
): string[] {
  if (!roster || roster.length === 0) return [];
  const agg: Record<string, number> = {};
  for (const p of roster) {
    for (const [skill, value] of Object.entries(p.skills)) {
      agg[skill] = (agg[skill] ?? 0) + value;
    }
  }
  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([skill]) => skill);
}

// ── Per-intent assembly builders ────────────────────────────────────────

function buildGameDay(intent: Intent, signals: Signals): Assembly {
  const ctx = intent.context as {
    hours_until_game?: number;
    scheduled?: { opponent?: string; at?: string };
    opponent_roster?: RosterPlayer[];
  };
  const opponent = ctx.scheduled?.opponent ?? "Opponent";
  const strengths = topStrengths(signals.roster);
  const matchupRows =
    signals.roster && ctx.opponent_roster
      ? buildMatchupRows(signals.roster, ctx.opponent_roster)
      : (signals.roster ?? []).map((p) => ({
          our: { id: p.id, name: p.name, pos: p.position, number: p.number },
          their: { name: "?", pos: p.position, number: 0 },
          advantage: "even" as const,
          note: "Opponent roster not loaded.",
        }));
  const advantageCount = matchupRows.reduce(
    (acc, r) => {
      if (r.advantage === "us") acc.us += 1;
      else if (r.advantage === "them") acc.them += 1;
      return acc;
    },
    { us: 0, them: 0 },
  );
  const atoms: AtomSpec[] = [
    {
      id: "stat_cells",
      heading: "Tonight",
      props: {
        cells: [
          { label: "Opponent", value: opponent },
          {
            label: "Tip-off",
            value:
              ctx.hours_until_game != null
                ? `${ctx.hours_until_game.toFixed(1)}h`
                : "TBD",
          },
          {
            label: "Edge",
            value:
              advantageCount.us > advantageCount.them
                ? `+${advantageCount.us - advantageCount.them} us`
                : advantageCount.us < advantageCount.them
                  ? `+${advantageCount.them - advantageCount.us} them`
                  : "Even",
          },
        ],
      },
    },
    {
      id: "matchup_rows",
      heading: "Matchups",
      props: { rows: matchupRows },
    },
    {
      id: "play_cards",
      heading: "Run these 4 plays",
      props: {
        // The play ranker will fill this — for now we surface the 4 most
        // relevant plays from the wiki-indexed library by tag heuristic.
        recommend_tags: ["Ball Screen", "Flare", "Pin Down", "Horns"],
        count: 4,
      },
    },
    {
      id: "court_diagram",
      heading: "Top play",
      props: { play_slug: "weakside-flare-slip", autoplay: true },
    },
    {
      id: "timer",
      heading: "Pre-game warmup",
      props: { duration_min: 15, preset: "warmup_pnr" },
    },
  ];
  return {
    intent,
    title: `Game Day — ${opponent}`,
    subtitle: `Run these 4 plays tonight. Your roster's strongest attribute is ${strengths[0] ?? "balanced"}.`,
    atoms,
  };
}

function buildPractice(intent: Intent, signals: Signals): Assembly {
  const ctx = intent.context as {
    hours_until_practice?: number;
    last_game_breakdowns?: string[];
  };
  const targetsText =
    (ctx.last_game_breakdowns ?? []).length > 0
      ? `Targets ${ctx.last_game_breakdowns!.slice(0, 2).join(", ")}`
      : "Balanced practice";
  const atoms: AtomSpec[] = [
    {
      id: "timer",
      heading: "Practice",
      props: {
        duration_min: 90,
        blocks: [
          { name: "Warmup", minutes: 10 },
          { name: "Ball handling", minutes: 15 },
          { name: "Shooting", minutes: 20 },
          { name: "PnR defense", minutes: 20 },
          { name: "Scrimmage", minutes: 20 },
          { name: "Cooldown", minutes: 5 },
        ],
      },
    },
    {
      id: "drill_blocks",
      heading: "Drills",
      props: {
        drills: [
          {
            name: "Zig-zag dribbling",
            minutes: 10,
            muscles: ["quads", "calves"],
          },
          {
            name: "Form shooting 3×5",
            minutes: 10,
            muscles: ["deltoids", "triceps"],
          },
          {
            name: "3-on-3 closeouts",
            minutes: 15,
            muscles: ["quads", "hip_abductors"],
          },
        ],
      },
    },
    {
      id: "muscle_map",
      heading: "Fatigue monitor",
      props: {
        load: {
          quads: 0.6,
          calves: 0.4,
          deltoids: 0.5,
          triceps: 0.3,
          hip_abductors: 0.5,
        },
      },
    },
    {
      id: "court_diagram",
      heading: "Today's play",
      props: { play_slug: "weakside-flare-slip", autoplay: false },
    },
  ];
  return {
    intent,
    title: "Practice Day",
    subtitle: `Here's your 90-min plan. ${targetsText}.`,
    atoms,
  };
}

function buildHalftime(intent: Intent, _signals: Signals): Assembly {
  const atoms: AtomSpec[] = [
    {
      id: "observation_chips",
      heading: "What's happening? (tap 3-4)",
      props: {
        chips: [
          { id: "their_3_is_hot", label: "Their 3 is hot" },
          { id: "their_3_is_cold", label: "Their 3 is cold" },
          { id: "our_pnr_working", label: "Our PnR working" },
          { id: "our_pnr_not_working", label: "Our PnR blocked" },
          { id: "foul_trouble", label: "Foul trouble" },
          { id: "their_post_dominant", label: "Their post is dominating" },
          { id: "our_fast_break", label: "Fast break is working" },
          { id: "turnovers_killing_us", label: "Turnovers killing us" },
          { id: "rebounding_edge", label: "Rebounding edge" },
          { id: "rebounding_problem", label: "Rebounding problem" },
          { id: "energy_low", label: "Energy low" },
          { id: "defense_solid", label: "Defense solid" },
        ],
      },
    },
    {
      id: "ai_answer",
      heading: "3 adjustments",
      props: {
        placeholder: "Tap 3-4 chips above, then press 'Get adjustments'.",
      },
    },
  ];
  return {
    intent,
    title: "Halftime",
    subtitle: "Tap what you're seeing — 60s AI adjustment.",
    atoms,
  };
}

function buildStudy(intent: Intent, _signals: Signals): Assembly {
  return {
    intent,
    title: "Study",
    subtitle: "Browse the playbook, search the wiki, run scenarios.",
    atoms: [
      {
        id: "toggle_group",
        heading: "Modules",
        props: {
          options: ["Playbook", "Body", "Drills", "Game IQ"],
          active: "Playbook",
        },
      },
      {
        id: "play_cards",
        heading: "Featured plays",
        props: { count: 6, recommend_tags: null },
      },
      {
        id: "ai_answer",
        heading: "Ask anything",
        props: { placeholder: "How do I defend a ball screen?" },
      },
    ],
  };
}

function buildPlayerHome(intent: Intent, signals: Signals): Assembly {
  const me = signals.roster?.[0];
  return {
    intent,
    title: me ? `Hey ${me.name}` : "Your development",
    subtitle: "Your skill gaps, drills, and next level.",
    atoms: [
      {
        id: "progress_bars",
        heading: "My skills",
        props: { skills: me?.skills ?? null },
      },
      {
        id: "drill_blocks",
        heading: "Today's drills",
        props: { drills: [] },
      },
      {
        id: "muscle_map",
        heading: "Body map",
        props: { load: {} },
      },
    ],
  };
}

/**
 * Top-level dispatch. Given an Intent + Signals, produce an Assembly.
 * Adding a new intent kind is a matter of adding one case here and one
 * builder above — no changes to the engine or types on the view side.
 */
export function buildAssembly(intent: Intent, signals: Signals): Assembly {
  switch (intent.kind) {
    case "prepare_for_game":
      return buildGameDay(intent, signals);
    case "run_practice":
      return buildPractice(intent, signals);
    case "quick_adjustments":
      return buildHalftime(intent, signals);
    case "personal_development":
      return buildPlayerHome(intent, signals);
    case "study_and_prepare":
    default:
      return buildStudy(intent, signals);
  }
}

export { countBy };
