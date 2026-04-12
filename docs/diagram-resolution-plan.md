# Diagram Resolution Plan

Generated: 2026-04-12T22:12:19.931Z

## Marker Inventory

- Total DIAGRAM markers: **342**
- Resolvable (source + page known): **327**
- Unresolvable without manual help: **15**

## Distribution by Source

| Source | Markers | PDF |
|--------|---------|-----|
| S7 | 146 | nba-coaches-playbook.pdf |
| S4 | 58 | basketball-for-coaches.pdf |
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
| 1 | blob-belmont-flash | play | S4 | 5,6 | yes | 165 |
| 2 | blob-cross | play | S4 | 9,10 | yes | 165 |
| 3 | 23-flare | play | S4 | 33 | yes | 150 |
| 4 | 32-lob | play | S4 | 35 | yes | 150 |
| 5 | blob-4-low-flex | play | S4 | 20 | yes | 150 |
| 6 | blob-box-flash | play | S4 | 7,8 | no | 65 |
| 7 | blob-double-skip | play | S4 | 11,12 | no | 65 |
| 8 | blob-hawk | play | S4 | 13,14 | no | 65 |
| 9 | blob-side-cross-elevator | play | S4 | 15,16 | no | 65 |
| 10 | play-1-4-quick-floppy | play | S4 | 52,53 | no | 65 |
| 11 | play-back-screen-post | play | S4 | 54,55 | no | 65 |
| 12 | play-baseline-swing | play | S4 | 37,38 | no | 65 |
| 13 | play-black | play | S4 | 56 | no | 65 |
| 14 | play-box-loop-post | play | S4 | 81,82 | no | 65 |
| 15 | play-box-spin | play | S4 | 83,84 | no | 65 |
| 16 | play-deception-slob | play | S4 | 85,86 | no | 65 |
| 17 | play-diamond-slob | play | S4 | 87,88 | no | 65 |
| 18 | play-doubles | play | S4 | 39 | no | 65 |
| 19 | play-flare-overload | play | S4 | 40,41 | no | 65 |
| 20 | play-loop-fly-slob | play | S4 | 89,90 | no | 65 |

## Recommended Next Batch

1. Resolve all markers on registered plays in `src/data/plays/` first — these directly feed the SVG viewer and fidelity gates.
2. Then resolve play-type wiki pages whose source + pages are known (S4, S7 plays).
3. Finally, resolve concept pages with visual extraction markers (S6 footwork, S1 defense).

Run a sample with:

```bash
npx tsx scripts/resolve-diagrams.ts --sample 23-flare,32-lob,blob-cross
```
