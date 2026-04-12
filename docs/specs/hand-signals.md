# Hand Signals — Spec

Generated: 2026-04-12
Status: Draft, not yet built
Dependencies: coach profile (docs/specs/coach-profile.md), play library, game day flow

## Why this exists

Youth basketball reality: coaches cannot yell "Weakside Flare Slip" across a gym and expect 11-year-olds to execute. Kids miss the call, mishear it, forget it, or lose focus locating the ball-handler. Every successful youth coach develops a private signal vocabulary — a closed fist, a raised pinky, a thumb-up — that maps to their installed plays. Motion's AI-powered playbook should generate that vocabulary automatically, not leave every coach to invent it on their own.

Secondary use case: referees, noise, and stadium crowds make signaling preferable at every level up to and including college. A play-recommendation system that hands a coach 12 plays without signals is not usable mid-game.

## Data model

Per-team, not per-coach. Signals stick with the team across seasons so returning players don't relearn.

```sql
CREATE TABLE team_play_signal (
  team_id           UUID NOT NULL,
  play_slug         TEXT NOT NULL,
  signal_kind       TEXT NOT NULL,        -- 'finger_count' | 'closed_fist' | 'open_palm' | 'body_touch' | 'verbal_shorthand' | 'combined'
  signal_detail     JSONB NOT NULL,       -- kind-specific payload (see below)
  verbal_label      TEXT,                 -- short word shown on coach card and player card (e.g. "Red", "Blue-2")
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by       TEXT NOT NULL,        -- 'ai' | 'coach' | 'team'
  PRIMARY KEY (team_id, play_slug)
);

CREATE UNIQUE INDEX team_signal_uniqueness
  ON team_play_signal (team_id, signal_kind, (signal_detail->>'value'));
```

Second index enforces uniqueness: no two active plays on a team may share the same signal.

`signal_detail` payloads by `signal_kind`:

```jsonc
// finger_count
{ "value": "3", "hand": "right" }

// closed_fist
{ "value": "chest_high", "hand": "right" }

// body_touch
{ "value": "head", "tap_count": 1 }

// verbal_shorthand
{ "value": "red" }

// combined
{ "primary": { ... }, "secondary": { ... } }
```

## Signal taxonomy

Five base signal kinds, chosen to be mutually-distinguishable at ~30 feet:

| Kind | Example | Capacity | Best for |
|---|---|---|---|
| `finger_count` | 1-5 fingers held overhead | 5 | Ordered set (Play 1, Play 2, Play 3) |
| `closed_fist` | Fist at waist / chest / shoulder / overhead | 4 | Binary-style categories (zone offense vs man offense) |
| `open_palm` | Palm down, up, out, sideways | 4 | Half-court sets |
| `body_touch` | Tap head / ear / shoulder / chest / hip | 5 | Quick-hitters, counters |
| `verbal_shorthand` | 1-syllable color or number | unlimited (in theory) | Primary call when noise is low |

Total non-combined capacity: ~18 signals per team. More than enough for a typical 8-12 play install. `combined` signals (finger_count + verbal) extend if needed.

## Auto-generation algorithm

Given a team's installed playbook:

1. **Group by role**: plays split into `half_court_set`, `blob`, `slob`, `atos`, `transition`, `press_break`, `zone_offense`, `baseline_out_of_bounds`, etc. (from wiki play metadata).
2. **Assign signal kinds per role** using a fixed mapping — e.g., BLOB plays always use `body_touch` so they're distinct from half-court sets.
3. **Assign individual signals** in priority order (most-used play gets simplest signal: "Red" for the go-to set).
4. **Generate verbal_label** using simple words: one-syllable colors (Red, Blue, Green, Black, White), numbers (One, Two, Three), or body-part shortcuts (Head, Chest).
5. **Uniqueness gate**: if a generated signal collides with an existing team assignment, skip + retry with next option.
6. **Coach review**: AI-generated proposals land in a review screen; coach drags to reorder, edits verbal labels, or rejects individual suggestions.

Example output for a 6-play team:

| Play | Signal | Verbal |
|---|---|---|
| Weakside Flare Slip | Closed fist at chest | "Red" |
| Horns Flare | Closed fist overhead | "Sky" |
| BLOB Cross | Tap head once | "Dome" |
| BLOB Stack | Tap head twice | "Double" |
| Press Break: 1-4 | 4 fingers overhead | "Four" |
| Zone Offense: 32 | 3 fingers + 2 fingers combo | "Three-Two" |

## Complexity progression

Tied to `coach_profile.level`:

| Coach level | Signal vocabulary cap | UI | Rationale |
|---|---|---|---|
| Beginner | 3 signals max | "Red / Blue / Green" verbal-only, visual icon | Kids U10-U12 saturate at 3 calls; more adds confusion not plays |
| Intermediate | 6-8 signals | Verbal + visual mix | U14-U16 can handle more; start introducing hand-signal variety |
| Advanced | Full 12-18 | Full taxonomy | HS+ can hold the full vocabulary |

If the coach's playbook exceeds the cap for their level, the signal generator refuses to assign signals for the overflow and flags: "Your team has 12 plays but we recommend only 6 active signals for U12. Pick 6 to signal; the others will be verbal-only."

## UI touchpoints

- **Play card in library**: signal badge in upper right (e.g., 🔴 "Red")
- **Game day flow — halftime recommendations**: signal shown beneath play name so coach knows what to flash
- **Game day flow — live timeout**: "Call Red" prompt with a visual of the hand position
- **Player card (spotlight mode)**: each player sees the signal for THEIR role only
- **Print lineup card** (existing feature): signal column added

## Special cases

- **Counter-play chains**: primary play's signal followed by a second signal indicates the counter (e.g., "Red" then flash 2 fingers = "Red Option 2"). Not auto-generated; coach opt-in.
- **Decoy signal**: one slot per team reserved for "we're calling something but actually just running flow." Prevents advanced opponents from scouting call patterns.
- **Timeout-only calls**: some plays are timeout-exclusive and don't need mid-game signals. Flagged in metadata.
- **Left-right symmetric plays**: a single play with "left side" and "right side" variants uses one signal plus a direction indicator (left fist vs right fist).

## Cross-team transfer

When a coach moves teams (new season, new club), the system offers:

1. **Import previous vocabulary** — same signals for the same plays, new team inherits
2. **Adapt to team level** — re-generate signals from scratch for the new team's level cap
3. **Hybrid** — keep the coach's 3-5 favorite calls, regenerate the rest

## Generation complexity + cost

Pure rule-based, no Claude call needed. Deterministic:
- Input: playbook + coach level + existing team assignments
- Output: signal map
- Runtime: <10ms for any realistic playbook size

Claude is only used for:
- Suggesting **verbal labels** that feel natural for a specific region/culture ("Red/Blue/Green" vs European equivalents) — cached per region
- Generating a **teach script** for each signal (how to introduce it to a team in practice) — integrates with teach-progressions spec

## Integration with practice planner

When a new play is installed, practice planner auto-adds:
- **Practice 1**: Introduce signal before running the drill. Coach flashes signal 10 times while kids say the verbal label. 2 minutes.
- **Practice 2**: Run the drill with signal-call entry. Coach says "on my signal" then flashes. 5 minutes.
- **Practice 3**: Live scrimmage with signal-only call (no verbal backup).

## Privacy + IP

- Signals are per-team, not shared across users (no aggregation to global wiki).
- Verbal labels are common vocabulary; no IP claim.
- The AI-generated teach script IS shareable anonymized across coaches (Karpathy flywheel — contributions to the wiki as concept pages tagged "signal-introduction-drill").

## Build order

1. **Signal taxonomy + data model** — PostgreSQL migration, one week.
2. **Auto-generator** — pure rule-based TS module in `src/lib/signals/`. Deterministic tests.
3. **Review UI** — coach sees proposed signals, edits, confirms. One page.
4. **Play card badge** — add signal display to existing play library + game day flow.
5. **Player card spotlight** — filter signals shown to only the player's role.
6. **Verbal label generator (Claude-backed)** — regional customization.
7. **Teach script generator** — integrates with practice planner.
8. **Cross-team transfer flow** — season-rollover UI.
9. **Decoy signal + counter-chain support** — advanced coach features.

MVP = steps 1-4. Steps 5-9 are progressive polish.

## Success metrics

- % of coaches who accept the AI-generated vocabulary vs re-roll (target: 70%+ accept on first generation)
- Time from play install to first in-game use (target: <2 practices)
- Coach-reported "play execution rate" before vs after signal install (proxy via post-game survey — not built yet)
- Signal retention across seasons (do returning players remember last year's? Aggregate only with consent)

## Out of scope

- Video capture of signals for coach review
- Integration with referee signals (distinct domain, different vocabulary)
- Player-initiated signals (e.g., captain calling off a play) — bigger product decision
