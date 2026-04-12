# NBA IP Remediation — 2026-04-12

Not legal advice. Technical audit + mechanical scrub. Consult counsel before shipping.

## Phases 1, 2, 4 — complete

### Phase 1 — Code (`src/`)
- `src/data/plays/lakers-flare-slip.ts` → `src/data/plays/weakside-flare-slip.ts`
- Export `lakersFlareSlip` → `weaksideFlareSlip`
- All slug references propagated (registry, assembly, landing, AutoPlayViewer, comments)
- Roster names: `D'Angelo / Austin / Rui / AD / LeBron` → `Guard 1 / Shooter 2 / Wing 3 / Forward 4 / Post 5`
- Mock opponent roster (formerly Celtics starting 5: Jrue/Derrick/Jaylen/Jayson/Al) → `Opp PG / SG / SF / PF / C`
- Scheduled opponents (Celtics / Warriors / Knicks / Suns) → generic (Rivals / Visitors / Opponent)
- Gameday AI adjustments stripped of player name-drops (AD, LeBron, Reed, Thomas, Jackson, Rui)
- Landing hero play swapped to `23-flare`
- Mentions of "Lakers 5 roster" etc. in UI text → generic

### Phase 2 — Wiki (`knowledge-base/wiki/`)
- **File renames (33 total)**:
  - 4 `play-jazz-*.md` → generic action names
  - 4 `play-ucla-*.md` / `concept-ucla-*.md` → high-post / rub / double-curls
  - 15 `play-princeton-*.md` / `concept-princeton-*.md` → continuity-offense variants
  - 3 `concept-*-kareem.md` → stripped suffix
  - 2 `concept-*-phil-johnson.md` → stripped suffix
  - `concept-phil-johnson-offensive-principles.md` → `concept-motion-offense-principles.md`
  - `source-nba-coaches-playbook.md` → `source-coaches-playbook.md`
  - `north-carolina-press.md` → `press-continuity-1.md`
  - `concept-avery-johnson-attacking-offense.md` → `concept-attacking-offense.md`
  - `concept-productive-practices-lawrence-frank.md` → `concept-productive-practices.md`
  - `drill-closeout-1-2-lawrence-frank.md` → `drill-closeout-1-2.md`
- **All `team:` frontmatter lines stripped** (10 pages affected)
- **Page titles rewritten** across 30+ pages (`# Utah Jazz Pick-and-Roll` → `# Motion Offense Pick-and-Roll`, etc.)
- **Body text scrubbed** for: NBA teams (Lakers, Celtics, Jazz, Bulls, Pistons, Hawks, Suns, Nuggets, Spurs, Mavericks, Nets, Bucks, 76ers, Raptors, Wizards, Sonics), colleges (UCLA, Princeton, North Carolina), top NBA stars (Jordan, Kobe, LeBron, Shaq, Kareem, Pippen, Curry, Durant, Giannis, Luka, Jokic, Tatum, Embiid, Kawhi, Bird, Magic Johnson, Dave Hopla, Andrew Toney, Ben Wallace, Jack Sikma, Manu Ginobili), specific coaches when tied to teams (Phil Johnson, Hubie Brown, Dean Smith, George Karl, Doug Moe, Avery Johnson, Lawrence Frank, Mike D'Antoni, Ruben Magnano)
- **Internal `[[wiki-links]]` updated** to point to new slugs
- **Kept**: book-author attribution in `[Sn, pp.X-Y]` citation footers (internal use, source-crediting)

### Phase 4 — Regression lint
- `scripts/check-nba-terms.ts` — scans `src/` + `knowledge-base/wiki/`, exits 1 on any denylist match
- `npm run check:nba-terms` — **currently clean**
- Denylist: 30 NBA teams, 9 college programs, 20+ NBA star names, plus qualified phrases ("Miami Heat", "Orlando Magic", etc. for ambiguous team words)
- Whitelist: `log.md` (historical append-only), `scripts/check-nba-terms.ts` itself
- CLAUDE.md rule updated with `npm run check:nba-terms` enforcement pointer

## Phase 3 — Paraphrasing audit (PARTIAL — needs human review)

Mechanical content comparison against source PDFs is beyond automated scope. Instead, below is a **risk scan** identifying pages most likely to be close paraphrases of book text. Review against source PDFs at `knowledge-base/raw/`.

### High-risk: pages with 25+ granular page-level citations

These have dense `[Sn, p.XX]` density — almost certainly tracking source book structure closely:

| File | Citation count |
|------|---|
| `basketball-glossary-offensive-terms.md` | 80 |
| `trapping-and-double-teaming.md` | 56 |
| `defending-specific-plays.md` | 43 |
| `concept-three-point-shooting.md` | 32 |
| `defensive-checklist-principles.md` | 30 |
| `concept-offensive-practice-philosophy-s6.md` | 29 |
| `defensive-practice-culture.md` | 28 |
| `shooting-hand-grip-and-elbow.md` | 27 |
| `concept-jump-shot-mechanics.md` | 27 |
| `concept-defensive-box-out-footwork.md` | 26 |

Glossary-style pages are the highest risk — if the wiki glossary mirrors the book's glossary entry order, that's close to verbatim reproduction even with rewording.

### Medium-risk: pages with 4+ verbatim quoted passages (`> "..."`)

| File | Quote blocks |
|------|---|
| `source-basketball-shooting.md` | 6 |
| `concept-post-v-cut-get-open.md` | 6 |
| `source-lets-talk-defense.md` | 5 |
| `running-technique-errors.md` | 5 |
| `concept-defensive-rebound-outlet-pass-pivot.md` | 5 |
| `concept-continuity-offense-implementing.md` | 5 |
| `source-herb-brown-defense.md` | 4 |
| `source-footwork-balance-pivoting.md` | 4 |
| `play-loop-fly-slob.md` | 4 |
| `diamond-zone-press.md` | 4 |

### Recommended Phase 3 actions

1. **Audit the top 10 high-risk pages** against source PDFs — if large blocks closely track, rewrite in your own voice
2. **Move inline `[Sn, p.X]` cites to a bibliography footer** so body text reads as commentary, not annotated reproduction
3. **Consider rebuilding the glossary page** from your own coach's vocabulary rather than book-derived entries
4. **Counsel review** of: fair-use posture, how the AI engine surfaces wiki content to end users, whether book-author attribution in `[Sn]` footers is sufficient

## Phase 5 — External legal verification (pending)

Get counsel to review:
- Remaining book-derived content (internal wiki use vs AI-surfaced-to-user risk)
- Nominative fair use applicability for coach references (some were scrubbed aggressively; may be permissible to restore specific ones with counsel approval)
- Archetype system (8 shape-based archetypes) — confirm clear of right-of-publicity
- Search/AI output paths that could include paraphrased passages in user-facing responses

## Verification

All gates green as of 2026-04-12:

```
✓ npx tsc --noEmit                   (zero errors)
✓ npm run synthesize:revalidate      (5 pass / 0 fail / 1 skip)
✓ npm run check:nba-terms            (zero violations)
```

Visual audit baselines may need regeneration — the play file rename changed the slug; Playwright test harness auto-discovers.
