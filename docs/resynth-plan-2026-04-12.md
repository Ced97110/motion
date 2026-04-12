# Resynthesis Plan — 2026-04-12

Generated: 2026-04-12T22:48:30.866Z  
Regenerated post-diagram-batch (S7+S4 199 markers resolved).

## Summary

- **Total wiki play pages**: 68
- **Already registered**: 6 (23-flare, 32-lob, blob-4-low-flex, blob-belmont-flash, blob-cross, weakside-flare-slip)
- **Quarantined**: 1 (blob-4-low-flex-updated)
- **Synthesis candidates**: 62

## Score distribution (candidates)

| Score | Count |
|---:|---:|
| 90 | 39 |
| 70 | 23 |

## Category breakdown

| Category | Candidates |
|---|---:|
| offense-set | 26 |
| BLOB | 18 |
| SLOB | 10 |
| zone-offense | 8 |

## Scoring model (recap)

| Signal | Points |
|---|---:|
| type: play frontmatter | +20 |
| ## Phases with 3+ subsections | +20 |
| Specific ## Formation | +15 |
| Non-empty ## Counters | +15 |
| [Sn, p.XX] citation present | +10 |
| 2+ [[backlinks]] | +10 |
| Unresolved <!-- DIAGRAM --> | -30 (CLEARED post-batch for S7/S4) |

Previous run observed ceiling 60 (every play had a DIAGRAM marker).
Post-batch ceiling is 90 for S7+S4 pages (markers resolved).

## Top 40 synthesis candidates

| # | Score | Category | Slug |
|---:|---:|---|---|
| 1 | 90 | BLOB | `blob-box-gate` |
| 2 | 90 | BLOB | `blob-box-gate-updated` |
| 3 | 90 | BLOB | `blob-double-skip` |
| 4 | 90 | BLOB | `blob-flip` |
| 5 | 90 | BLOB | `blob-flip-updated` |
| 6 | 90 | BLOB | `blob-stack-double` |
| 7 | 90 | BLOB | `blob-stack-double-updated` |
| 8 | 90 | BLOB | `blob-stack-man` |
| 9 | 90 | BLOB | `blob-stack-man-spread` |
| 10 | 90 | BLOB | `blob-two-inside` |
| 11 | 90 | BLOB | `blob-two-inside-updated` |
| 12 | 90 | BLOB | `blob-yo-yo` |
| 13 | 90 | BLOB | `blob-yo-yo-updated` |
| 14 | 90 | offense-set | `play-1-4-quick-floppy` |
| 15 | 90 | offense-set | `play-back-screen-post` |
| 16 | 90 | offense-set | `play-black` |
| 17 | 90 | SLOB | `play-box-loop-post` |
| 18 | 90 | offense-set | `play-chin-series` |
| 19 | 90 | SLOB | `play-deception-slob` |
| 20 | 90 | offense-set | `play-diagonal-screen` |
| 21 | 90 | SLOB | `play-diamond-slob` |
| 22 | 90 | offense-set | `play-double-curls` |
| 23 | 90 | offense-set | `play-drive-hammer` |
| 24 | 90 | offense-set | `play-flex-warrior` |
| 25 | 90 | offense-set | `play-flip-gate` |
| 26 | 90 | offense-set | `play-high-post-double-screen` |
| 27 | 90 | offense-set | `play-inside-isolate` |
| 28 | 90 | offense-set | `play-iverson-ram` |
| 29 | 90 | SLOB | `play-loop-fly-slob` |
| 30 | 90 | SLOB | `play-option-slob` |
| 31 | 90 | offense-set | `play-pass-and-screen-away` |
| 32 | 90 | offense-set | `play-pick-and-roll-layered` |
| 33 | 90 | offense-set | `play-piston-elevator` |
| 34 | 90 | SLOB | `play-prowl-slob` |
| 35 | 90 | offense-set | `play-reverse-dribble-options` |
| 36 | 90 | offense-set | `play-side-blaze` |
| 37 | 90 | offense-set | `play-swinger` |
| 38 | 90 | SLOB | `play-triangle-slob` |
| 39 | 90 | SLOB | `slob-x` |
| 40 | 70 | BLOB | `blob-box-flash` |

## Recommended batch order

1. Score 90 BLOB batch (10 plays) — DONE 2026-04-12 (6 synthesized, 4 failed, retry pending)
2. Score 90 remainder (~29): SLOB + offense-set + zone-offense — run next
3. Score 70 (1 play): blob-box-flash (thin phase structure)
4. Score 60 (~22): backlog for future sessions

Run a batch with:

```bash
npx tsx scripts/synthesize-plays.ts --slugs <comma-separated-list>
```
