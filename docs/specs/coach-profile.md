# Coach Profile — Spec

Generated: 2026-04-12
Status: Draft, not yet built

## Why this exists

Motion's moat is AI-coaching-the-coach, not just AI-coaching-the-team. A beginner volunteer coaching U10 needs a different product than a 10-year varsity coach — different play surface, different terminology, different teach-progressions. Today the app treats every coach the same: full wiki vocabulary, no progressive disclosure, no concept scaffolding.

This spec defines the **coach profile** — a user-scoped data layer that captures the coach's level, vocabulary, and learning trajectory, and lets every downstream surface (play filter, practice planner, game plan generator, concept cards) adapt to it.

## Data model

Postgres-first (per the FastAPI + Postgres decision). One `coach_profile` row per authenticated user.

```sql
CREATE TABLE coach_profile (
  coach_id        UUID PRIMARY KEY,                       -- Clerk user id
  level           TEXT NOT NULL DEFAULT 'unknown',        -- 'beginner' | 'intermediate' | 'advanced'
  years_coaching  SMALLINT,                               -- self-reported
  level_coached   TEXT,                                   -- 'u10' | 'u12' | 'u14' | 'u16' | 'hs' | 'college' | 'pro' | 'mixed'
  region          TEXT,                                   -- 'us-west' | 'eu-fr' | 'eu-be' ... for terminology localization
  onboarded_at    TIMESTAMPTZ,                            -- null until quiz complete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coach_concept_progress (
  coach_id        UUID REFERENCES coach_profile(coach_id),
  concept_slug    TEXT NOT NULL,                          -- matches wiki concept slug
  status          TEXT NOT NULL,                          -- 'locked' | 'introduced' | 'mastered'
  introduced_at   TIMESTAMPTZ,
  mastered_at     TIMESTAMPTZ,
  PRIMARY KEY (coach_id, concept_slug)
);

CREATE TABLE coach_vocab_event (
  id              BIGSERIAL PRIMARY KEY,
  coach_id        UUID REFERENCES coach_profile(coach_id),
  term            TEXT NOT NULL,                          -- e.g. 'flare-screen'
  event_type      TEXT NOT NULL,                          -- 'definition-tap' | 'play-used' | 'concept-search'
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX coach_vocab_event_coach_idx ON coach_vocab_event(coach_id, occurred_at DESC);
```

Read path: the UI loads `(coach_profile, recent_vocab_events[0:100], concept_progress)` as one bundle per session. Small payload; cache-friendly.

## Onboarding quiz — 5 questions, 90 seconds

Goal: calibrate `level` without asking self-rate (people overrate). Questions are multiple-choice, one right answer, instant feedback.

| # | Question | Answers | What it measures |
|---|---|---|---|
| 1 | What's a flare screen? | A) Screen set **away** from the ball / B) Screen set **on** the ball / C) Any off-ball screen | Screen taxonomy awareness |
| 2 | When do you ICE a pick-and-roll? | A) Force ball-handler middle / B) Force ball-handler **sideline** / C) Switch automatically | Defensive scheme vocabulary |
| 3 | A 2-3 zone is weakest against… | A) Isolation drives / B) **Ball reversal + skip passes** / C) Post-ups | Offense vs zone intuition |
| 4 | What does "spacing" mean? | A) 15-foot gaps minimum / B) **Players occupying distinct areas so defenders can't help** / C) Running plays in order | Core offensive concept |
| 5 | If your PG has 4 fouls, you should… | A) Sub them out immediately / B) Sub them out late Q3 / C) **Depends on score + matchup** | Game management nuance |

Scoring:
- 0-1 correct → `level = 'beginner'`
- 2-3 correct → `level = 'intermediate'`
- 4-5 correct → `level = 'advanced'`

Also asks: years coaching, level coached, region. All optional; skipping gates the coach at `beginner` default.

Re-quiz trigger: coach taps "calibrate me again" or we detect pattern-change (e.g., repeated definition-taps for advanced terms → prompt a re-quiz).

## Concept graph

50-ish canonical concepts, each with prerequisites. Matches existing wiki concept pages.

```typescript
// src/lib/coach/concept-graph.ts
interface ConceptNode {
  slug: string;            // matches wiki slug
  label: string;           // user-facing short label
  level: "beginner" | "intermediate" | "advanced";
  prereqs: string[];       // slugs
}

// Example subset
const CONCEPT_GRAPH: ConceptNode[] = [
  { slug: "spacing", label: "Spacing", level: "beginner", prereqs: [] },
  { slug: "screening-fundamentals", label: "Screens", level: "beginner", prereqs: ["spacing"] },
  { slug: "flare-screen", label: "Flare screen", level: "intermediate", prereqs: ["screening-fundamentals"] },
  { slug: "pnr-coverage-options", label: "PnR coverage", level: "intermediate", prereqs: ["screening-fundamentals"] },
  { slug: "ice-coverage", label: "ICE coverage", level: "advanced", prereqs: ["pnr-coverage-options"] },
  // ...
];
```

A play is "installable" by a coach only if they have mastered every concept in its `requiredConcepts[]` field. Below that bar, the play shows as locked with a "Install these concepts first: [list]" message.

Auto-progression rules:
- Coach reads a concept card for >30s → `status = 'introduced'`
- Coach uses the concept in a play/drill 3+ times → `status = 'mastered'`
- Coach taps the definition chip on a term after it's been `mastered` → revert to `introduced` (admits confusion)

## Vocabulary telemetry

Every time the coach taps a jargon chip for a definition, we log an event. Two aggregates feed the UI:

1. **Comprehension floor per concept** — high definition-tap rate for a term across the user base tells us to explain it more patiently by default
2. **This coach's vocabulary** — a coach who's tapped "flare," "horns," "ICE" recently is ready for plays using those terms; otherwise default to simpler synonyms

Per-coach personalization stays in their session; aggregates ship to product-telemetry.

## UI affordances per level

| Level | Play filter default | Concept cards | Plays installed at onboarding | Terminology |
|---|---|---|---|---|
| Beginner | 4-5 foundational sets only | Full explainer cards appear on first encounter of any concept | 0 (must install one, guided) | Plain English: "screen = legal block" |
| Intermediate | Expanding playbook (10-30 plays) | Short tooltips on tap | 3 starter plays seeded | Mix jargon + definitions |
| Advanced | Full wiki | No auto-cards; search-only | User's choice | Full jargon default |

Component ideas (not yet built):
- `<ConceptCard slug={...} />` — compact card with definition, prereqs, "I get it" button
- `<PlayCard slug={...} gatedBy={...} />` — shows lock icon + prereq list if coach-level too low
- `<TeachProgression play={...} days={3} />` — auto-generated 3-day drill → walkthrough → live sequence

## Integration points (what changes downstream)

| Surface | Adapts to coach profile by... |
|---|---|
| Play library | Filter defaults + gating per concept prereqs |
| Game plan generator | Vocabulary calibration in the plan prose; simpler adjustments for beginners |
| Halftime chips | Beginner gets top-3 chips only (8-12 min halftime); advanced gets full grid |
| Practice planner | Drill progressions respect prereq chain + session-count per concept |
| Concept search | Auto-inserts definitions inline for unmastered terms |
| Live timeout | Refuses to suggest plays the coach hasn't installed yet |

## Privacy posture

- Coach profile is per-user, private. No cross-coach sharing by default.
- Region is used for terminology localization (US vs EU vocabulary); not broadcast.
- Vocabulary events are opt-in; coach can disable from settings.
- Anonymized aggregates (e.g., "N% of beginner coaches tap 'flare' for definition") are OK to ship product-side, never tied to individuals.
- Under-16 coaches (rare but possible) get COPPA-safe defaults: no telemetry, no aggregate contribution.

## Build order

1. **Data model + Clerk wiring** — add the 3 tables, plumb `coachId` through the app. Unblocks everything.
2. **Onboarding quiz UI + scoring** — 5-question flow, writes `level` + flags `onboarded_at`. 1-2 day build.
3. **Concept graph seed** — hand-author the 50 canonical concepts with prereqs. Matches existing wiki slugs.
4. **Basic level-gating** — play library filter respects `level`; no per-concept gate yet.
5. **ConceptCard component** — renders a concept with prereqs; taps log events.
6. **Per-concept gating on plays** — upgrade gate from level-based to concept-based.
7. **Vocabulary event logging** — instrument all jargon chips.
8. **Teach-progression generator** — Claude-backed, given a play + coach_level → 3-day install plan.
9. **Re-quiz trigger heuristics** — watch for pattern-change, prompt re-calibration.
10. **Peer aggregates (opt-in)** — "47 coaches at your level found this concept harder than expected."

Steps 1-4 are the MVP. Steps 5-10 are the moat-building layers.

## Dependencies

- **Clerk auth** — hard blocker on step 1
- **FastAPI + Postgres** — hard blocker on step 1
- **Existing wiki** — concept slugs must match (already aligned; wiki has 1,034 pages)
- **Intent engine** — beginners may need stronger inferred intents since they won't know to ask for things. Coordination point, not a blocker.

## Open questions

- **How to seed `level` without a quiz?** If the coach declines onboarding, we default `beginner`. But they might churn before we learn more. A/B test: quiz-first vs app-first with passive inference?
- **Handling roster-size bias?** A coach running a U10 team of 7 players needs different plays than a varsity coach with 15. `level_coached` captures some of this but not roster-size.
- **Cross-season continuity.** When a coach advances their team from U12 → U14, should `level_coached` auto-advance? Or prompt re-calibration?
- **Org tier?** If a club has both varsity and U14 coaches sharing a Motion account, the profile is per-coach not per-team — correct, but needs UI to make that explicit.

## Success metrics

- % of new coaches who complete onboarding (target: 60%+ per industry norms)
- Beginner retention week 1 → week 4 (target: 40%+, benchmark against industry 15-25%)
- Time-to-first-play-installed (target: <10 min for beginners, <2 min for advanced)
- Definition-tap rate decline over time per coach (learning signal)
- Cross-coach agreement on "hard concepts" (aggregate moat signal)

## Not in scope

- Coach-to-coach messaging (social layer is a separate product decision)
- Video upload / review (CV roadmap)
- Certification or badging tied to `level` — would inflate stakes on a quiz meant to be low-pressure
- Automatic level decay if coach is inactive — premature
