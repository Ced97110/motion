# Diagram Resolution Plan

Generated: 2026-04-12T22:16:16.094Z

## Marker Inventory

- Total DIAGRAM markers: **337**
- Resolvable (source + page known): **322**
- Unresolvable without manual help: **15**

## Distribution by Source

| Source | Markers | PDF |
|--------|---------|-----|
| S7 | 146 | nba-coaches-playbook.pdf |
| S4 | 53 | basketball-for-coaches.pdf |
| S6 | 46 | footwork-balance-pivoting.pdf |
| S8 | 38 | speed-agility-quickness.pdf |
| S1 | 32 | lets-talk-defense.pdf |
| UNKNOWN | 15 | — |
| S5 | 5 | basketball-shooting.pdf |
| S9 | 2 | explosive-calisthenics.pdf |

## Top 20 Highest-Value Markers

Score rewards registered plays (synthesized SVG exists), play-type pages, resolvable citations, and explicit "needs visual extraction" notes.

| # | Slug | Type | Source | Pages | Registered play | Score |
|---|------|------|--------|-------|-----------------|-------|
| 1 | blob-box-flash | play | S4 | 7,8 | no | 65 |
| 2 | blob-double-skip | play | S4 | 11,12 | no | 65 |
| 3 | blob-hawk | play | S4 | 13,14 | no | 65 |
| 4 | blob-side-cross-elevator | play | S4 | 15,16 | no | 65 |
| 5 | play-1-4-quick-floppy | play | S4 | 52,53 | no | 65 |
| 6 | play-back-screen-post | play | S4 | 54,55 | no | 65 |
| 7 | play-baseline-swing | play | S4 | 37,38 | no | 65 |
| 8 | play-black | play | S4 | 56 | no | 65 |
| 9 | play-box-loop-post | play | S4 | 81,82 | no | 65 |
| 10 | play-box-spin | play | S4 | 83,84 | no | 65 |
| 11 | play-deception-slob | play | S4 | 85,86 | no | 65 |
| 12 | play-diamond-slob | play | S4 | 87,88 | no | 65 |
| 13 | play-doubles | play | S4 | 39 | no | 65 |
| 14 | play-flare-overload | play | S4 | 40,41 | no | 65 |
| 15 | play-loop-fly-slob | play | S4 | 89,90 | no | 65 |
| 16 | play-low-split | play | S4 | 42,43 | no | 65 |
| 17 | play-option-slob | play | S4 | 91,92 | no | 65 |
| 18 | play-pick-overload | play | S4 | 44,45 | no | 65 |
| 19 | play-prowl-slob | play | S4 | 93,94 | no | 65 |
| 20 | play-skipper | play | S4 | 46 | no | 65 |

## Recommended Next Batch

1. Resolve all markers on registered plays in `src/data/plays/` first — these directly feed the SVG viewer and fidelity gates.
2. Then resolve play-type wiki pages whose source + pages are known (S4, S7 plays).
3. Finally, resolve concept pages with visual extraction markers (S6 footwork, S1 defense).

Run a sample with:

```bash
npx tsx scripts/resolve-diagrams.ts --sample 23-flare,32-lob,blob-cross
```
