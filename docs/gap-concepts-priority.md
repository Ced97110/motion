# Gap Concepts — Priority Report

> **Purpose**: Rank the 101 gap concepts surfaced by `scripts/lint-wiki.ts` so
> the next ingest / stub-generation pass targets high-impact gaps first.
> **Generated**: 2026-04-12 (read-only analysis, zero Claude API calls)
> **Source data**: `docs/wiki-lint-2026-04-12.md`, `knowledge-base/wiki/` (1,032 pages),
> analysis script `scripts/.gap-concept-analysis.ts`, JSON `scripts/.gap-concept-analysis.json`.

---

## 1. Methodology

For each of the 101 gap-concept terms emitted by the linter, the analysis script
computed four signals against the live wiki corpus:

| Signal | How it's computed | Why it matters |
|--------|-------------------|----------------|
| `distinctPages` | # of distinct `.md` files that contain the term in body prose (mirrors lint-wiki's gap heuristic) | How widely the concept is referenced |
| `citations` | Total raw occurrences of the term across all bodies **after stripping `[[wikilinks]]`** | Signal strength inside unlinked prose |
| `basketballSpecific` | True if the term contains any of: screen, defense, drill, offense, zone, ball, post, shoot, shot, dribble, cut, rebound, guard, block, steal, transition, pick, roll, fade, flare, help, closeout, box, spacing, pace, tempo, pass, handle, jump, hook, stance, pivot, seal, lob, slip, curl, stagger, hedge, trap, rotate, denial, rim | Filters out generic headings from domain-specific terminology |
| `alreadyCovered` | Min Levenshtein distance to any existing slug ≤ 3 | Prevents proposing duplicates |

Composite score (from the spec):

```
score = distinct_page_count * 3
      + citation_count       * 0.5
      + (basketball_specific ? 5 : 0)
      - (already_covered     ? 100 : 0)
      - (multiline_artefact  ? 50  : 0)   // added: artefacts of the regex capture
```

Two additional filters were applied after scoring:

- **Schema-section false positives** — Terms like `"Concepts Taught"`, `"Player
  Responsibilities"`, `"Key Coaching Points"`, `"Muscles Involved"`, `"Common
  Mistakes"`, `"Complex Variations"` are **required section headings** defined
  in `knowledge-base/SCHEMA.md`. The TitleCase regex captures them; they are
  not real concept gaps. Excluded from Top 10.
- **Multiline artefacts** — `"Objective\nDevelop"`, `"Summary\nThe"`,
  `"Formation\nBox"` etc. are artefacts of the TitleCase regex spanning a
  markdown section boundary (`## Summary\nThe ...`). They inflate distinct-page
  counts but represent no coaching concept. Excluded.

After filtering, 69 of 101 gap terms remain as candidate real concepts.

---

## 2. Top 10 — highest-priority gaps to stub first

Each row includes the source book(s) where the concept is most likely drawn
from (per `knowledge-base/SCHEMA.md` source map S1–S9).

| # | Term | Citations | Distinct pages | Suggested type | Proposed slug | Recommended source book(s) | Score |
|---|------|-----------|----------------|----------------|---------------|----------------------------|-------|
| 1 | Master Step | 69 | 31 | concept | `concept-master-step` | **S9** (Explosive Calisthenics — defined on p.19 as the terminal progression rung; referenced across the Explosive Six movement families) | 127.5 |
| 2 | Dribble Hop Back | 90 | 18 | concept | `concept-dribble-hop-back` | **S3** (Offensive Skill Development — shot-fake/hop-back family) and **S6** (Footwork, Balance, Pivoting) | 104.0 |
| 3 | Dribble Stride Stop | 62 | 10 | concept | `concept-dribble-stride-stop` | **S6** (Footwork — stride stop family) and **S3** | 66.0 |
| 4 | Spot Shots | 43 | 10 | drill-family concept | `concept-spot-shots` | **S5** (Basketball Shooting) and **S3** | 56.5 |
| 5 | Crossover Dribble | 27 | 9 | concept | `concept-crossover-dribble` | **S3** (Offensive Skill Development) and **S6** | 45.5 |
| 6 | Dribble Big Hop | 20 | 8 | concept | `concept-dribble-big-hop` | **S3**, **S6** | 39.0 |
| 7 | Cone Drill | 24 | 7 | concept (umbrella) | `concept-cone-drill-taxonomy` | **S8** (Speed, Agility, Quickness — many drill-*-cone pages cite S8) | 38.0 |
| 8 | Roll Out Dribble | 20 | 7 | concept | `concept-roll-out-dribble` | **S3**, **S6** | 36.0 |
| 9 | Combination Defenses | 9 | 8 | concept | `concept-combination-defenses` | **S1** (Let's Talk Defense — Herb Brown) and **S4** | 33.5 |
| 10 | Perimeter Moves | 8 | 8 | concept (umbrella) | `concept-perimeter-moves` | **S3** (Offensive Skill Development) and **S7** (NBA Coaches Playbook — Ch 15 Perimeter Offense) | 33.0 |

**Why these 10**: all pass the basketball-specific heuristic **or** are structural
terms for a whole progression chain that is already densely referenced (e.g.,
Master Step anchors the 6 families of the Explosive Six — currently you have
`concept-explosive-six-movement-families.md` using the phrase 6 times without a
backing definition page). Every one has ≥5 distinct citing pages and no existing
slug within Levenshtein 3.

---

## 3. Bottom 10 — likely prune / deprioritise

These rank low on the composite score **or** are schema/narrative artefacts the
linter should ignore rather than stub.

| # | Term | Reason to skip |
|---|------|----------------|
| 1 | Concepts Taught (556 pages) | Required SCHEMA.md section heading for drill pages — not a concept |
| 2 | Player Responsibilities (246 pages) | Required SCHEMA.md section for concept pages — not a concept |
| 3 | Key Coaching Points (76 pages) | Required SCHEMA.md section for play pages — not a concept |
| 4 | Muscles Involved (41 pages) | Anatomy-page section header (S2 convention) — not a concept |
| 5 | Common Mistakes / Complex Variations | SCHEMA.md-driven section headers — not concepts |
| 6 | Objective\\nDevelop, Objective\\nImprove, Objective\\nBuild, Objective\\nTrain (and 7 similar) | Regex artefacts: `## Objective\n{verb}` spans a newline the TitleCase regex shouldn't have crossed. Fix by tightening the regex rather than stubbing pages |
| 7 | Summary\\nThe, Summary\\nWhen, Summary\\nBefore, Summary\\nEvery | Same artefact class (`## Summary` followed by prose) |
| 8 | Formation\\nBox | Same artefact class (`## Formation\nBox formation ...`) |
| 9 | Basketball Application\\nThe, Basketball Transfer\\nThe, Basketball Focus\\nThe | Same artefact class — S2/S8 section-header convention |
| 10 | Notable Quotes, Key Themes, Chapter Breakdown, Unique Contributions | All four are source-summary SCHEMA.md section headings (see `knowledge-base/SCHEMA.md` §Page Type 4) |

**Action recommended**: tighten the TitleCase regex in `scripts/lint-wiki.ts`
to `\b(?:[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,}){1,3})\b` (replace `\s+` with
`[ \t]+`) and extend the `noise` set with the 7 SCHEMA.md required-section
headings. That single change would reduce 101 gaps to roughly 60 real ones.

---

## 4. Manual review pile — likely synonyms / already covered

Ambiguous cases where the term appears to be basketball jargon but a near-neighbour
page already exists. These should be reviewed by hand before creating a new page —
preferred action is usually to add the term as an alias / redirect heading inside
the existing page and add the unlinked mentions as `[[existing-slug]]`.

| Term | Distinct pages | Likely existing coverage | Action |
|------|----------------|--------------------------|--------|
| Crossover Dribble | 9 | `concept-shot-fake-hop-back-crossover`, `drill-crossover-shuffle-ladder`, `concept-hop-back-crossover-combo` (crossover exists as a modifier, not a standalone concept) | Create `concept-crossover-dribble` — confirmed no standalone page; gap is real |
| Cone Drill | 7 | 10+ `drill-*-cone.md` pages but no taxonomy page | Create an umbrella `concept-cone-drill-taxonomy` or add to `source-speed-agility-quickness.md` Key Themes |
| Screen Plays | 9 | 50+ `*-screen-*` pages exist; no umbrella page | Likely merge as a section of existing `concept-screen-taxonomy-nba.md` or `concept-screen-types-reads.md` |
| Set Play | 5 | Many `play-*.md` files; `concept-continuity-offense-philosophy.md` touches the topic | Add a short concept page defining "set play" vs "continuity" vs "motion"; cite S4 + S7 |
| Shooting Techniques | 6 | `shooting-technique-stance.md` (Levenshtein 6 → just above threshold) and `concept-shooting-off-screens.md` | Likely redirect to existing `shooting-technique-stance` or promote it to a parent `concept-shooting-techniques` |
| Free Throws | 10 | No `free-throw*` page exists currently | Real gap — propose `concept-free-throw-shooting` from S5 |
| Chain Step / Power Pushup Step / Prerequisite Step / Power Jump Chain Step | 5–9 each | These are all rungs of the S9 Explosive Six progression; `concept-explosive-six-movement-families.md` lists them | Consolidate into a single `concept-explosive-six-progression-chain` page covering all 5 rungs (not 5 separate pages) |
| Rip Step Series | 5 | `drill-rip-step-workouts.md` and `concept-rip-step`-style pages exist | Likely redirect / backlink — not a new page |
| Ligament Dominance | 5 | `acl-injury-prevention.md`, `acl-and-shoulder-injury-prevention.md` — topic discussed without its own page | Real gap — S8 (SAQ training) neuromuscular chapter |
| Kevin Eastman / Pete Carril / Tex Winter / Phil Jackson / Stan Van Gundy / Hal Wissel / Paul Wade / Rich Dalatri / Mike Fratello / Shawn Nelson / John Wooden / Steve Nash | 5–20 each | Coach / author names. **IP compliance risk** — CLAUDE.md forbids coach-name pages outside `[Sn]` citation footers. These are NOT gaps to stub; they are citations that should stay inside source-summary pages only | **Do not create pages.** Keep attribution confined to `[Sn]` footers per IP policy |

---

## 5. Appendix — raw ranked list

Full 101-row data lives in `scripts/.gap-concept-analysis.json` (gitignored via
the leading-dot filename convention). Regenerate with:

```bash
npx tsx scripts/.gap-concept-analysis.ts
```
