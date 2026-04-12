# Resynth Plan — 2026-04-12

Planning artifact for the next `scripts/synthesize-plays.ts` run. **Not a
synthesis execution.** Produced by `npx tsx scripts/resynth-manifest.ts`
(read-only scan). Budget is not greenlit for today; this document
prioritizes where the next Claude API spend should go.

## Scope at a glance

| Metric | Count |
|---|---|
| Wiki pages with `type: play` frontmatter | **68** |
| Already registered in `src/data/plays/` | **6** (appear as 5 duplicates here — `weakside-flare-slip` has no wiki page) |
| Quarantined in `src/data/plays/_review/` | **1** (`blob-4-low-flex-updated`) |
| Net new synthesis candidates | **62** |

The wiki holds 1,034 pages total; the vast majority are concepts, drills,
principles, glossaries, and coaching points — not plays. The 68 `type:
play` pages are the only meaningful input to the synthesizer.

## Category breakdown (all 68 play pages)

| Category | Pages | Candidate |
|---|---:|---:|
| offense-set | 26 | 26 |
| BLOB | 22 | 18 (4 already registered/quarantined) |
| SLOB | 10 | 10 |
| zone-offense | 10 | 8 (2 registered as 23-flare/32-lob surface as offense variants) |
| press-break | 0 | 0 |
| transition | 0 | 0 |
| defense | 0 | 0 |
| drill | 0 | 0 |
| **Total** | **68** | **62** |

**Notable gap:** zero press-break, transition, or dedicated defense
*plays* have been ingested as `type: play`. The wiki has plenty of
concepts in those domains (e.g., `press-continuity-1.md`, but tagged
`type: concept`). Synthesizing them would require changing the wiki's
ingestion policy — out of scope for this manifest.

## Scoring model (recap)

Max 90 (no bonuses beyond the rule set):

| Signal | Points | Penalty |
|---|---:|---:|
| `type: play` frontmatter | +20 | |
| `## Phases` with 3+ subsections | +20 | |
| Specific `## Formation` | +15 | |
| Non-empty `## Counters` | +15 | |
| `[Sn, p.XX]` citation present | +10 | |
| 2+ `[[backlinks]]` | +10 | |
| Unresolved `<!-- DIAGRAM: ... -->` | | -30 |
| Already in `src/data/plays/` | | -20 |
| Already in `src/data/plays/_review/` | | -10 |

**Practical ceiling observed: 60.** Every authored play page carries at
least one `DIAGRAM:` marker (diagram-extraction placeholder from the
ingestion pass). That is a known trait, not a defect — the synthesizer
is prose-only and ignores diagrams. Treat score 60 as the **A-tier**.

## Top 40 candidates

All top-40 entries score 60 (full prose signal, one DIAGRAM marker). The
only blocker shared across them is the diagram marker, which the
synthesizer tolerates. Tiebreaker: citation density, then backlink
density, then slug.

| # | Score | Category | Slug | Phases | Citations | Backlinks | DIAGRAM | Notes |
|---:|---:|---|---|---:|---:|---:|---:|---|
| 1 | 60 | BLOB | blob-box-gate | 3 | 7 | 3 | 1 | clean prose, high signal |
| 2 | 60 | BLOB | blob-box-gate-updated | 3 | 8 | 4 | 1 | revised version — prefer over base |
| 3 | 60 | BLOB | blob-double-skip | 3 | 6 | 3 | 1 | |
| 4 | 60 | BLOB | blob-flip | 4 | 8 | 3 | 1 | |
| 5 | 60 | BLOB | blob-flip-updated | 3 | 9 | 4 | 1 | revised; prefer over base |
| 6 | 60 | BLOB | blob-stack-double | 4 | 7 | 3 | 1 | |
| 7 | 60 | BLOB | blob-stack-double-updated | 3 | 6 | 4 | 1 | revised; prefer over base |
| 8 | 60 | BLOB | blob-stack-man | 3 | 7 | 3 | 1 | |
| 9 | 60 | BLOB | blob-stack-man-spread | 3 | 7 | 4 | 1 | |
| 10 | 60 | BLOB | blob-two-inside | 4 | 11 | 3 | 1 | densest citations in BLOB |
| 11 | 60 | BLOB | blob-two-inside-updated | 4 | 9 | 4 | 1 | revised |
| 12 | 60 | BLOB | blob-yo-yo | 4 | 10 | 3 | 1 | |
| 13 | 60 | BLOB | blob-yo-yo-updated | 4 | 11 | 4 | 1 | revised; prefer over base |
| 14 | 60 | offense-set | play-1-4-quick-floppy | 5 | 10 | 3 | 1 | 5 phases — verify fits animation |
| 15 | 60 | offense-set | play-back-screen-post | 4 | 9 | 3 | 1 | |
| 16 | 60 | offense-set | play-black | 3 | 9 | 3 | 1 | |
| 17 | 60 | SLOB | play-box-loop-post | 3 | 9 | 4 | 1 | |
| 18 | 60 | offense-set | play-chin-series | 4 | 2 | 6 | **5** | five DIAGRAM markers, citations thin — defer |
| 19 | 60 | SLOB | play-deception-slob | 3 | 10 | 3 | 1 | |
| 20 | 60 | offense-set | play-diagonal-screen | 3 | 3 | 4 | 3 | three DIAGRAMs, thin citations |
| 21 | 60 | SLOB | play-diamond-slob | 3 | 9 | 4 | 1 | |
| 22 | 60 | offense-set | play-double-curls | 3 | 9 | 4 | 1 | |
| 23 | 60 | offense-set | play-drive-hammer | 3 | 10 | 3 | 1 | |
| 24 | 60 | offense-set | play-flex-warrior | 3 | 10 | 3 | 1 | |
| 25 | 60 | offense-set | play-flip-gate | 3 | 12 | 4 | 1 | highest citation density |
| 26 | 60 | offense-set | play-high-post-double-screen | 3 | 9 | 4 | 1 | |
| 27 | 60 | offense-set | play-inside-isolate | 3 | 9 | 3 | 1 | |
| 28 | 60 | offense-set | play-iverson-ram | 3 | 10 | 4 | 1 | |
| 29 | 60 | SLOB | play-loop-fly-slob | 3 | 10 | 4 | 1 | |
| 30 | 60 | SLOB | play-option-slob | 3 | 9 | 4 | 1 | |
| 31 | 60 | offense-set | play-pass-and-screen-away | 6 | 3 | 6 | 2 | 6 phases, thin citations — may need splitting |
| 32 | 60 | offense-set | play-pick-and-roll-layered | 3 | 2 | 5 | 3 | thin citations |
| 33 | 60 | offense-set | play-piston-elevator | 3 | 11 | 4 | 1 | |
| 34 | 60 | SLOB | play-prowl-slob | 3 | 9 | 3 | 1 | |
| 35 | 60 | offense-set | play-reverse-dribble-options | 4 | 2 | 6 | **5** | five DIAGRAMs — defer |
| 36 | 60 | offense-set | play-side-blaze | 3 | 9 | 3 | 1 | |
| 37 | 60 | offense-set | play-swinger | 3 | 10 | 3 | 1 | |
| 38 | 60 | SLOB | play-triangle-slob | 3 | 10 | 4 | 1 | |
| 39 | 60 | SLOB | slob-x | 3 | 9 | 5 | 1 | |
| 40 | 40 | BLOB | blob-box-flash | 1 | 7 | 3 | 1 | only 1 phase — likely needs wiki rewrite first |

## Top 5 per category (candidates only)

**BLOB (18 candidates)**
1. blob-box-gate (60)
2. blob-box-gate-updated (60)
3. blob-double-skip (60)
4. blob-flip (60)
5. blob-flip-updated (60)

**SLOB (10 candidates)**
1. play-box-loop-post (60)
2. play-deception-slob (60)
3. play-diamond-slob (60)
4. play-loop-fly-slob (60)
5. play-option-slob (60)

**offense-set (26 candidates)**
1. play-1-4-quick-floppy (60)
2. play-back-screen-post (60)
3. play-black (60)
4. play-chin-series (60)
5. play-diagonal-screen (60)

**zone-offense (8 candidates)**
1. play-baseline-swing (40)
2. play-flare-overload (40)
3. play-low-split (40)
4. play-pick-overload (40)
5. play-skipper (40)

**press-break, transition, defense, drill: 0 candidates.** Expand
ingestion to cover these domains before future synthesis runs.

## Blockers across top 40

| Blocker | Count |
|---|---:|
| 1 unresolved DIAGRAM marker | 35 |
| 3 unresolved DIAGRAM markers | 2 |
| 5 unresolved DIAGRAM markers | 2 |
| 2 unresolved DIAGRAM markers | 1 |
| Only 1 phase subsection | 1 (blob-box-flash) |

## Recommended synthesis ordering

Given the synthesizer is prose-only and ignores DIAGRAM markers, the
practical next run can target **all 38 top-tier score-60 candidates** in
batch. Slug priority within the batch:

1. **BLOB revised variants first** (highest citation counts, cleanest
   prose): `blob-yo-yo-updated`, `blob-two-inside-updated`,
   `blob-flip-updated`, `blob-stack-double-updated`,
   `blob-box-gate-updated`, `blob-stack-man-spread`.
2. **SLOB set** (small, cohesive, all score 60): full sweep of 10.
3. **Offense-sets with ≥9 citations** (avoid the thin-citation
   outliers `play-chin-series`, `play-reverse-dribble-options`,
   `play-pick-and-roll-layered`, `play-pass-and-screen-away`,
   `play-diagonal-screen` until their wiki pages gain citations).

Defer until the wiki ingestion is revisited:
- `blob-box-flash` — only 1 phase subsection.
- All zone-offense candidates stuck at score 40 — typically missing
  `## Counters` or formation specificity.
- The 0-candidate categories (press-break, transition, defense, drill).

## Quarantined & duplicates

- **Duplicates (skip):** `23-flare`, `32-lob`, `blob-4-low-flex`,
  `blob-belmont-flash`, `blob-cross`.
- **Quarantined (fix, do not resynthesize):**
  `blob-4-low-flex-updated` — needs revalidator triage, not a new Claude
  call.
- `weakside-flare-slip` is registered but has **no matching wiki page**
  (intentional — it was authored without a wiki source).

## How to run

```bash
npx tsx scripts/resynth-manifest.ts             # top 40 default
npx tsx scripts/resynth-manifest.ts --top 60    # widen
npx tsc --noEmit                                # verify types
```

Manifest JSON is written to `scripts/.resynth-manifest.json`
(gitignored). It is the source of truth for any downstream batch runner.
