# Wiki Cleanup Report — 2026-04-12

> Triage + fix pass for the 220 error-level findings surfaced by
> `npm run lint:wiki` against `knowledge-base/wiki/` (1,032 pages).
> Zero Claude API calls. Pure text manipulation.

## Before / after

| Severity | Before | After |
|----------|-------:|------:|
| **error**   | 220 | **0** |
| warning | 2974 | 3003 |
| info    | 1465 | 1452 |
| total   | 4659 | 4455 |

The 0 errors beats the "under 30" target from the triage brief.

Warning count rose by 29 because new bidirectional-link failures surfaced —
when a dead link `[[X]]` was repointed to an existing page `Y`, the linter
now expects `Y` to link back. Bidirectional remediation is deferred to a
future agent pass per the original scope.

## Gate verification

- `npm run lint:wiki` — 0 errors (exit 0)
- `npm run check:nba-terms` — clean
- `npx tsc --noEmit` — clean

## Errors fixed by category

### 1. Dead wikilinks: 197 → 0

- **Repointed**: 79 link instances across 25 unique targets mapped to existing pages.
- **Removed**: 99 link instances across 63 unique targets with no plausible match. Removal preserved surrounding prose: bullet-style `- [[target]] — description` entries were dropped entirely; inline `[[target]]` tokens in paragraphs were deleted in place.
- 122 wiki pages touched.

Representative repoint mappings (dead target → existing page):

| Dead target | Mapped to |
|---|---|
| `concept-continuity-basic-action` | `concept-high-post-continuity-basic-action` |
| `concept-continuity-backdoor-cut` | `concept-backdoor-cut-continuity` |
| `concept-continuity-reverse-dribble` | `concept-reverse-dribble-continuity` |
| `play-continuity-pass-screen-away` | `play-pass-and-screen-away` |
| `play-continuity-pass-cut-away` | `play-pass-and-cut-away` |
| `play-continuity-high-split` | `play-high-split-action` |
| `play-continuity-reverse-dribble` | `play-reverse-dribble-options` |
| `play-continuity-chin` | `play-chin-series` |
| `late-game-defensive-strategy` | `concept-late-game-defensive-strategy` |
| `concept-transition-defense` | `transition-defense` |
| `concept-jab-step-perimeter` | `concept-jab-step` |
| `concept-triple-threat` / `triple-threat-position` | `concept-triple-threat-position` |
| `jab-step` | `concept-jab-step` |
| `shooting-on-the-move` | `concept-shooting-on-the-move` |
| `concept-defensive-rebounding` / `defensive-rebounding` | `concept-defensive-rebounding-footwork` |
| `pull-up-jump-shot` | `drill-pull-up-jump-shot` |
| `jump-shot-mechanics` | `concept-jump-shot-mechanics` |
| `reading-screens-off-ball` | `concept-reading-screens-off-ball` |
| `pick-overload` | `play-pick-overload` |
| `play-high-post` | `play-high-post-double-screen` |
| `concept-agility-training-basketball` | `concept-agility-training` |
| `concept-screen-the-screener` | `concept-screen-the-screener-footwork` |
| `concept-help-defense` | `weak-side-help-defense` |
| `crossover-shuffle-ladder` | `drill-crossover-shuffle-ladder` |

Removed (no plausible target — 63 unique): `drill-russian-hamstring-curl`,
`jump-stop`, `turnaround-post-moves`, `concept-help-defense-rotations`,
`post-defense`, `concept-ball-reversal-weak-side`, `concept-lob-pass`,
`concept-shot-fake`, `defending-backdoor-cuts`, `concept-closeout-defense`,
`concept-front-pivot`, `concept-boxing-out`, `concept-pivoting-basketball`,
`drill-dantoni-step-up`, `drill-spinouts`, `catch-and-shoot-footwork`,
`concept-on-ball-screen-reads-phil-johnson`, `concept-pivoting-for-post-moves`,
`concept-sky-hook`, `concept-v-cut`, `concept-front-pivot-and-triple-threat`,
`concept-post-pivots-with-ball`, `concept-flash-post`, `drill-post-getting-open`,
`concept-post-swim-move`, `concept-dribble-handoff`, `concept-pick-and-roll-offense`,
`concept-pivoting-for-shooters`, `concept-duck-in-footwork`,
`concept-pull-up-jump-shot`, `concept-pinch-post`, `upper-body-pulling-exercises`,
`basketball-kinetic-chain`, `help-defense-rotations`,
`help-defense-rotation-principles`, `help-and-recover-defense`,
`defensive-slide-drill-herb-brown`, `defensive-floor-balance`,
`concept-fast-break-defense`, `concept-tandem-defense`, `concept-fast-break-offense`,
`full-court-press-matchup`, `shooting-fundamentals-shot-line`,
`concept-defensive-stance`, `concept-ball-pressure`, `concept-ball-protection`,
`drill-follow-leader-live-ball-moves`, `basketball-defensive-stance`,
`basketball-rebounding-positioning`, `lower-body-strength-basketball`,
`basketball-training-program-design`, `pick-and-pop-defense`, `play-stack-double`,
`offensive-skill-development-philosophy`, `blob-loop-fly-slob`,
`shot-line-alignment`, `one-three-one-zone-defense`,
`basketball-explosive-weightlifting`, `basketball-plyometrics`,
`basketball-strength-training-legs`, `basketball-injury-prevention`,
`zone-press-and-combination-defenses`.

### 2. Duplicate index entries: 23 → 0

61 duplicate lines removed from `knowledge-base/wiki/index.md`. For each
repeated slug, the longer (more descriptive) line was kept; ties resolved to
the first occurrence.

Biggest consolidations:

| Slug | Duplicates removed |
|---|---:|
| `source-explosive-calisthenics` | 16 |
| `source-coaches-playbook` | 9 |
| `source-footwork-balance-pivoting` | 9 |
| `source-herb-brown-defense` | 4 |
| `source-speed-agility-quickness` | 2 |
| `source-offensive-skill-development` | 2 |
| `source-basketball-anatomy` | 2 |
| `source-basketball-shooting` | 2 |
| `concept-post-play-fundamentals` | 1 |
| `concept-post-getting-open` | 1 |
| `concept-triangle-offense` | 1 |
| `concept-attacking-offense` | 1 |
| `concept-power-pushup-chain` | 1 |
| `concept-front-flip-chain` | 1 |
| `concept-power-vs-skill-training` | 1 |
| `concept-whole-part-whole-teaching` | 1 |
| `concept-saq-program-design` | 1 |
| `concept-rip-step` | 1 |
| `drill-help-and-recover-2v2` | 1 |
| `drill-55-second-shooting-drill` | 1 |
| `drill-sf-hop-back-crossover-workout` | 1 |
| `drill-single-leg-hurdle-jump` | 1 |
| `play-x-cross` | 1 |

### 3. Filename whitespace violations: 0 actual, 5 broken md-link targets

The triage brief flagged 5 filenames with spaces, but on inspection no files
on disk had whitespace in their names. The whitespace was in the *link
targets* inside `index.md` (markdown `[text](file.md)` syntax pointing at
nonexistent space-containing paths). These were treated as broken index
links and rewritten — no file renames were necessary.

Rewrites applied in `index.md` (whitespace + nonexistent → existing):

| Broken link target | Rewritten to |
|---|---|
| `concept-motion offense-offensive-philosophy.md` | `concept-motion-offense-philosophy.md` |
| `play-motion offense-cross-screen.md` | `play-cross-screen.md` |
| `play-motion offense-up-screen.md` | `play-up-screen.md` |
| `play-motion offense-diagonal-screen.md` | `play-diagonal-screen.md` |
| `play-motion offense-pick-and-roll.md` | `play-pick-and-roll-layered.md` |
| `concept-continuity-backdoor-cut.md` | `concept-backdoor-cut-continuity.md` |
| `concept-continuity-basic-action.md` | `concept-high-post-continuity-basic-action.md` |
| `concept-continuity-reverse-dribble.md` | `concept-reverse-dribble-continuity.md` |
| `concept-continuity-chin-action.md` | `concept-chin-action.md` |
| `concept-continuity-implementing.md` | `concept-continuity-offense-implementing.md` |
| `concept-continuity-philosophy.md` | `concept-continuity-offense-philosophy.md` |
| `concept-high-post-rub-off-screen-footwork.md` | `concept-rub-off-screen-footwork.md` |
| `play-continuity-pass-screen-away.md` | `play-pass-and-screen-away.md` |
| `play-continuity-pass-cut-away.md` | `play-pass-and-cut-away.md` |
| `play-continuity-high-split.md` | `play-high-split-action.md` |
| `play-continuity-reverse-dribble.md` | `play-reverse-dribble-options.md` |
| `play-continuity-chin.md` | `play-chin-series.md` |
| `play-continuity-high-pick-sets.md` | `play-high-pick-series.md` |
| `play-high-post-double-curls.md` | `play-double-curls.md` |

Total: 19 `index.md` links rewritten.

## Findings intentionally NOT fixed

Per the original scope, these remain for future passes:

| Check | Count | Why deferred |
|---|---:|---|
| Bidirectional link failures | 2964 | Too large for this pass; each fix requires editing the *target* page's Related section. A dedicated bidirectional-link agent should batch these. |
| Stale DIAGRAM markers | 344 | Resolution requires Claude API to interpret the `<!-- DIAGRAM: ... -->` placeholder and render a textual description. Out of scope (zero API calls). |
| Missing citations | 1020 | Requires source lookup and author judgment per page. |
| Orphan pages | 13 | Each needs a product decision (inbound-link from a relevant concept page, or delete). Not a mechanical fix. |
| Gap concepts | 101 | Requires Claude API to generate new concept pages. |
| Schema section non-compliance | 26 | Requires per-page regeneration of the missing `## When to Use` / `## Key Principles` / etc. sections. |

## Files modified

- `knowledge-base/wiki/index.md` — 61 duplicate lines removed, 19 link targets rewritten.
- `knowledge-base/wiki/*.md` — 122 files touched for wikilink repoints/removals (see list via `git status`).

No files were renamed. No files were deleted. No new wiki pages were created.
