# Teach-Progression Generator — Spec

Generated: 2026-04-12
Status: Draft, not yet built
Dependencies: coach profile (docs/specs/coach-profile.md), hand signals (docs/specs/hand-signals.md), practice planner, wiki drill library

## Why this exists

Play installation is where most youth basketball teams fail — not because the plays are bad, not because the kids are lazy, but because coaches skip the install progression. A coach opens Motion, sees "Weakside Flare Slip," taps "add to playbook," and tries to run it live the next practice. Team doesn't get it. Coach blames "execution." Actually blames a missing prerequisite: the team has never practiced a slip, a flare screen, or weak-side spacing. The play requires concepts the team hasn't been taught.

A teach-progression is the structured 3-5 practice plan that turns a Motion-recommended play into an actually-runnable play. It's the missing link between "here's a play" and "our team runs this play in games."

Key moat: this is the "coach coaches the coach" product surface. No competitor ships this. It's also why youth retention for Motion would exceed every competitor — volunteer coaches desperately need teach help, and the product literally walks them through it.

## What it generates

Given (play, team context), produce a structured plan like:

```
Play: Weakside Flare Slip
Team: U12, 8 players, 2 practices/week, 90 min each
Days until first game: 10

PROGRESSION (3 practices):

Practice 1 — Foundational drills (15 min of 90)
  1. Screen angles drill — 2 min teach, 8 min rep (drill-screen-angles)
  2. Weak-side spacing walkthrough — 5 min (concept-off-ball-spacing)
  Purpose: kids experience the mechanics without a play name

Practice 2 — Walkthrough (20 min of 90)
  1. 5-on-0 shell run-through — 3 reps each phase, pause between (8 min)
  2. 5-on-2 (two defenders tag the ball side only) — 6 min
  3. Introduce signal: "Red" — coach flashes, team calls it back 10x (2 min)
  4. 5-on-5 half-speed — 4 min
  Purpose: pattern recognition at thinking speed

Practice 3 — Live (25 min of 90)
  1. 5-on-5 full speed, 10 reps — coach calls "Red" 3x per rep, team runs
  2. Live scrimmage: coach calls Red when team is on the right side only
  3. Post-practice debrief: what went right, what confused you
  Purpose: game-speed muscle memory; identify remaining confusion

READINESS: run in your next game if 80%+ of Practice 3 reps completed
successfully. Otherwise, repeat Practice 3 before installing.
```

## Data inputs

The generator receives a structured input:

```typescript
interface TeachProgressionInput {
  playSlug: string;
  team: {
    id: string;
    level: "u10" | "u12" | "u14" | "u16" | "hs" | "college" | "pro";
    rosterSize: number;
    practicesPerWeek: number;
    practiceDurationMin: number;
    conceptMastery: Record<string, "locked" | "introduced" | "mastered">;
    installedPlays: string[]; // other plays already in the playbook
  };
  daysUntilFirstUse: number | null; // null = development focus, no deadline
  coachLevel: "beginner" | "intermediate" | "advanced";
  availableDrills: string[]; // coach's installed drills + "use any from wiki"
}
```

Output is a `TeachProgression`:

```typescript
interface TeachProgression {
  playSlug: string;
  totalPractices: number;
  practices: TeachPractice[];
  readinessCriteria: string; // "80% of last-practice reps successful"
  estimatedDurationPerPractice: number; // minutes
  prerequisiteGaps: string[]; // concepts not yet mastered that this relies on
}

interface TeachPractice {
  practiceIndex: number; // 1, 2, 3, ...
  phase: "foundational" | "walkthrough" | "live";
  durationMin: number;
  segments: TeachSegment[];
  purpose: string;
}

interface TeachSegment {
  segmentIndex: number;
  type: "drill" | "walkthrough" | "signal-introduction" | "live" | "debrief";
  drillSlug?: string;
  concept?: string;
  durationMin: number;
  instructions: string;
  reps?: number;
}
```

## Algorithm

Three-step hybrid — deterministic planning layer + Claude-backed content generation.

### Step 1 — Concept dependency check (deterministic)

From the play's `requiredConcepts[]` (wiki frontmatter), intersect with `team.conceptMastery`. For each missing/introduced concept:
- Include a foundational drill targeting that concept in Practice 1
- Add to `prerequisiteGaps[]` so the coach sees what's being bootstrapped

### Step 2 — Practice count calibration (deterministic)

```
coach_level × days_until_first_use → practice_count

beginner + ≥7 days → 3 practices
beginner + 3-6 days → 2 practices (condensed; flag risk)
beginner + <3 days → refuse; surface "not enough time" warning
intermediate + ≥5 days → 3 practices
intermediate + 2-4 days → 2 practices
advanced + any → 2 practices default, 3 for complex plays
```

### Step 3 — Content generation (Claude-backed)

Claude receives:
- Play wiki body
- Prerequisite concept pages (wiki bodies)
- Candidate drill pages from `team.availableDrills` + wiki `drill-*`
- Team context as above

Claude emits the structured `TeachProgression` via tool use. System prompt enforces:
- Prefer drills the coach already has installed over net-new ones
- Respect per-segment time budgets (sum ≤ `practiceDurationMin * 0.3` — leave 70% of practice for everything else)
- Explicit pauses between reps for beginner-coach teams
- Each segment has concrete `instructions` (2-3 sentences) — no hand-waving
- Final practice always ends with a debrief segment

Cost per generation: ~$0.05 (Sonnet, moderate prompt, small tool output). Cached per (play, team-level, coach-level) tuple so re-generation is free.

## Integration points

| Surface | How teach-progression plugs in |
|---|---|
| Play library | "Install this play" button → generates progression → shows summary → coach confirms |
| Practice planner | Future practices auto-include the progression segments until play is marked "mastered" |
| Game plan generator | If play hasn't completed its progression, flagged with "team hasn't fully installed this — run only if desperate" |
| Coach profile | Tracks which progressions coach has completed — informs future recommendations |
| Hand signals | Signal introduction happens in Practice 2 always |

## Adaptive re-planning

After each practice, the coach logs which segments hit (> 80% of reps completed cleanly) and which didn't. The generator re-plans based on results:

- If all segments hit → advance to next practice
- If <50% of segments hit → repeat the same practice (new drill variants to re-engage)
- If 50-80% → add remediation segments for the weak areas, then advance

This is the "success-rate telemetry" feature from the brainstorm — automatic progression management.

## Beginner-coach guardrails

When `coachLevel === "beginner"`:
- **Limit to 2 concepts introduced per practice** (beginner coach teams saturate fast)
- **Mandatory signal-introduction segment** in Practice 2 (verbalize + hand flash 10x)
- **Longer debrief segments** (3-5 min vs 1-2 for advanced)
- **Prose instructions written for a parent volunteer**, not a credentialed coach — avoid "pick-and-pop," use "screen-and-shoot"
- **Refusal to install 3+ plays in a single week** — surface "Install these one at a time; teams retain 1-2 new plays per week."

## Edge cases

- **Condensed schedule (game in 3 days)**: reduce to 2 practices, flag risk explicitly, suggest a fallback simpler play from the same family
- **Team misses a practice (cancellation)**: auto-shift the progression; offer a "recovery" condensed version
- **Player on progression joins mid-week**: track per-player segment completion so a returning player catches up without holding back the team
- **Play installed but never used in a game**: after 4 practices, prompt "Still installing? Or drop?" to prevent playbook bloat
- **Coach wants to skip foundational drills** ("we already run screens"): generator respects coach override but logs it; if Practice 2 success rate is <60%, auto-inserts a foundational practice

## Privacy + IP

- Progression outputs are per-team, private by default
- Anonymized aggregates ("80% of U12 teams took 3 practices to install flare plays") feed the global wiki's concept-difficulty telemetry — opt-in
- Coach-authored edits to progressions (replacing a suggested drill with their own) become candidate wiki patches via the compounding-query pipeline

## Build order

1. **Schema + type definitions** — `src/lib/teach/types.ts`. No I/O.
2. **Deterministic planner** — `src/lib/teach/plan.ts` — concept gap detection + practice-count calibration. Pure function, fully tested offline.
3. **Wiki reader** — fetches play + concepts + drill candidates from the wiki. Read-only.
4. **Claude prompt + tool definition** — in `scripts/generate-progression.ts`. Testable with golden inputs via eval harness.
5. **Cache layer** — `knowledge-base/progressions/<team-level>/<play-slug>.json`. Reduces regen cost.
6. **Play library integration** — "Install" button wiring + summary screen.
7. **Practice planner integration** — read progressions, schedule segments into upcoming practices.
8. **Feedback loop** — per-segment success logging + adaptive re-plan.
9. **Beginner-coach guardrails** — progressive disclosure per coach profile.
10. **Anonymized aggregates** — opt-in contribution to wiki-level difficulty telemetry.

MVP = steps 1-6. Steps 7-10 are progressive polish.

## Cost model

- Per-generation: ~$0.05 (cached per team-level × play tuple)
- 62 future plays × 4 team-levels = ~248 unique cache entries needed for full coverage → ~$12.40 one-shot build of cache
- Cache hit rate after warmup: expected 85%+ (teams within a level share cached progressions)
- Ongoing per-team cost: ~$0.50 per season (re-plans + adaptive segments)

## Success metrics

- **Play mastery rate**: % of installed plays the team successfully executes in games within 4 weeks (target: 70%+, current coaching app benchmark ~35%)
- **Coach retention signal**: beginner coaches who complete 3+ progressions retain at 3x the rate of those who install plays ad-hoc (hypothesis)
- **Progression completion**: % of coaches who finish all practices in a progression (target: 60%+)
- **Per-segment success rate**: aggregate across coaches to identify which drills/segments struggle — feed back into generator
- **Time-to-install-delta**: compare coach-reported install time before/after Motion

## Out of scope

- Video-based segment guides (CV roadmap territory)
- Live practice coaching (AR overlay, etc.)
- Cross-team practice sharing (different product surface)
- Automatic bench rotation during practice drills (eventually, but not MVP)

## Open questions

- **Who authors the drill-to-concept mapping?** Currently relies on wiki `drill-*.md` pages tagging concepts they teach. If a drill is untagged, the planner can't pick it. Need a lint check + curation pass to ensure every drill page has `concepts_taught[]` in frontmatter.
- **How do we handle coaches who customize their playbook language?** If a coach calls a pick-and-roll "the Pistol," the generated progression should respect that vocabulary. Depends on coach-profile vocabulary telemetry maturity.
- **Cross-sport spillover**: should we flag concepts from the anatomy layer (e.g., "teach proper balance before teaching the pivot drill")? Likely yes, but adds generator complexity.
- **Install stacking**: if a coach installs 3 plays simultaneously, should progressions be interleaved or sequential? Beginner coaches should be sequential; advanced can interleave.
