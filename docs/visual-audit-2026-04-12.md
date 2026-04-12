# Visual Audit — 2026-04-12

**Semantic revalidation** — 5 pass, 0 fail, 1 skipped (no *Semantic export).
**Visual audit** — 10 passed, 0 failed, 2 skipped (12 total).

| Slug | Semantic | Visual | Notes |
|------|----------|--------|-------|
| `23-flare` | ✅ | ✅ |  |
| `32-lob` | ✅ | ✅ |  |
| `blob-4-low-flex` | ✅ | ✅ |  |
| `blob-belmont-flash` | ✅ | ✅ |  |
| `blob-cross` | ✅ | ✅ |  |
| `lakers-flare-slip` | · | ⚪ | no *Semantic export (predates schema) |

## Artifacts
- HTML report: `playwright-report/index.html`
- Baselines: `tests/visual/__screenshots__/play.spec.ts-snapshots/`
- Failure screenshots: `test-results/` (per-test subdirectories)
