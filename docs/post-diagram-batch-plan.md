# Post-Diagram-Batch Plan

Generated: 2026-04-12

After the S7+S4 diagram resolution batch (~207 markers) completes, several workstreams unlock. This doc sequences them so budget and quality gates stay tight.

## Immediate (zero API cost)

### 1. Verify batch results

```bash
# Count resolved vs remaining markers
npm run lint:wiki              # stale-marker count should drop from 344 to ~140
grep -l "diagram-positions" knowledge-base/wiki/*.md | wc -l
```

Expected outcomes:
- Stale DIAGRAM markers: 344 → ~140 (S7+S4 resolved; S1/S2/S3/S5/S6/S8/S9 remain)
- Wiki pages with `diagram-positions` code fences: 8 → ~200
- All gates green (tsc, lint:wiki, check:nba-terms)

### 2. Commit the batch

Single commit — `feat(wiki): diagram-ground 207 S7+S4 play markers` — including:
- ~200 wiki page modifications (marker → diagram-positions JSON)
- Updated `docs/diagram-resolution-plan.md` (rerun picks up changes)
- `scripts/resolve-diagrams.ts` patched with `--source` / `--limit` flags

### 3. Re-run the resynthesis manifest

```bash
npx tsx scripts/resynth-manifest.ts
```

The existing manifest scored every play-type page with a -30 DIAGRAM penalty. After the batch, that penalty vanishes for ~200 plays. Expected ranking change:
- Top-5 before: blob-box-gate, blob-box-gate-updated, blob-double-skip, blob-flip, blob-flip-updated (all score 60, capped)
- Top-5 after: likely some S7 plays we just resolved (score 90+ since DIAGRAM penalty gone + diagram-grounded)

This re-ranking is why we resolve diagrams BEFORE resynthesizing.

## Near term (small API cost: ~$3-8)

### 4. Resynthesize top 10-20 plays using grounded diagrams

Priority: plays where `diagram-positions` JSON now exists. The synthesizer should read the resolved JSON as a position hint, not re-derive from prose.

**Required synthesizer patch** (if not already there): teach `scripts/synthesize-plays.ts` to prefer `diagram-positions` JSON over prose-parsed coordinates when the wiki page has it.

Expected: 10-20 new plays land in `src/data/plays/`, pass `synthesize:revalidate`, show fidelity-score > 0.8 (vs ~0.5 for prose-only synthesis).

Cost estimate: 10-20 plays × ~$0.08 each × 1.5x for retries = **$1-2.50**.

### 5. Run visual audit + commit

```bash
npm run test:visual             # pixel regression on old + new plays
npm run visual-audit:report     # aggregate to docs/visual-audit-<date>.md
```

Commit: `feat(plays): resynth 10-20 plays from grounded diagrams`.

## Medium term (larger API cost: ~$10-20)

### 6. Resolve remaining 138 markers from S1, S2, S3, S5, S6, S8, S9

Blocker: S3, S5, S9 have unknown offsets (blank mid-book pages); S6 has a suspicious +141.

Pre-work (done in this session): re-probe those 4 with multi-point sampling. Once offsets verified, run `--source S1,S2,S3,S5,S6,S8,S9`.

Cost: ~138 × $0.03 = **$4-7**.

### 7. Full resynthesis pass

After all diagrams grounded, pick the top 40-60 manifest candidates and resynthesize. Expected: 40-60 plays registered, up from 6 today.

Cost: 40-60 × $0.08 × 1.5 = **$5-8**.

## Longer term (no API cost yet)

### 8. Wire compounding query capture to UI

The scaffold at `src/lib/wiki/` is untethered. Required:
- Clerk auth → real `coachId`
- UI hook in game plan generator + halftime endpoint
- `AnonymizeContext` populated from coach's roster profile
- Cron: `promote-patches` nightly

### 9. Two-tier wiki split (personal + canonical)

Blocked on #8. Requires per-coach overlay directory + resolver.

### 10. Synthetic data generation + fine-tuning

Karpathy's endgame. Walk the wiki, emit Q/A pairs in JSONL, fine-tune Haiku 4.5 on domain. Months out.

## Budget sequencing

At ~$50 starting budget:

| Step | Cost | Cumulative | Remaining |
|---|---|---|---|
| Diagram batch (S7+S4, running now) | ~$6-9 | $6-9 | $41-44 |
| Manifest re-run | $0 | $6-9 | $41-44 |
| Resynth top 10-20 | $1-3 | $7-12 | $38-43 |
| Visual audit | $0 | $7-12 | $38-43 |
| Remaining diagram markers | $4-7 | $11-19 | $31-39 |
| Full resynth | $5-8 | $16-27 | $23-34 |

**Headroom for iteration: $23-34.** Comfortable for prompt tuning on the synthesizer, second-pass diagram resolution if fidelity is spotty, and ~200 live coach queries for testing.

## Risks / open questions

- **Synthesizer may not yet read `diagram-positions` JSON.** If so, step #4 requires a small patch first. Verify before committing resynth budget.
- **S6 +141 offset** — if multi-probe confirms, trust it. If it flips to a sensible value (e.g., +20), the old offset was a chapter-local-numbering artifact.
- **Visual regression on resolved pages** — the SVG renderer reads from `src/data/plays/*.ts`, not wiki JSON. So resolving wiki diagrams is invisible to the viewer until resynth lands. No visual regression expected from the batch itself.
