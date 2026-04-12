# Motion — Basketball Coaching Intelligence Platform

> **Vision**: "Brilliant for basketball" — AI-native platform democratizing coaching expertise
> **Status**: 3/30 screens approved. B+C merge design system approved.
> **Aesthetic**: B+C merge (dark chrome + editorial bold). See `docs/specs/design-system.md`

---

## Quick reference

### What this project is

An intent-driven coaching platform that delivers ANSWERS not OPTIONS. Coach opens app on game day → gets a complete game plan. No browsing, no building from scratch. Two separate experiences: Coach (16 screens) and Player (14 screens).

### Architecture (one paragraph)

8 passive signals → Intent Engine (5 intents) → Dynamic Assembly (14 atoms, 7 components) → Knowledge Wiki (Karpathy LLM pattern, 7 books, 2,440 pages) → AI Intelligence Engine → Delivered as answers. See `docs/specs/architecture.md` for full details.

### Where to find specs

| Spec file | What it covers | When to load |
|-----------|---------------|--------------|
| `docs/specs/architecture.md` | Intent engine, signals, atoms, components, dynamic assembly | Building core framework |
| `docs/specs/design-system.md` | B+C merge tokens, BallButton, color rules, typography | Any UI work |
| `docs/specs/play-viewer.md` | SVG court, 6-layer z-order, 3-phase animation, 3 game-changers | Play viewer work |
| `docs/specs/game-plan.md` | Game plan generator workflow (17 steps) + opponent intelligence architecture | Game plan features |
| `docs/specs/knowledge-wiki.md` | Karpathy pattern, ingestion pipeline, page types, wiki structure | Wiki/AI work |
| `docs/specs/gamification.md` | 8 archetypes, skill trees, XP, badges, convergence tracking | Player features |
| `docs/specs/screen-inventory.md` | 30 screens with status, priority, module assignment | Planning/navigation |
| `docs/specs/data-strategy.md` | Datasets, SportsSettBasketball, flywheel, privacy, international | Data/compliance work |
| `docs/specs/cv-roadmap.md` | Computer vision phases, tech stack, cost estimates | CV features |
| `docs/specs/competitive.md` | Hoops Geek reverse-engineering, market landscape | Competitive context |
| `docs/specs/knowledge-domains.md` | 7 knowledge domains and their source books | Domain-specific features |
| `spec/SPORTSETT_INTEGRATION.md` | 10-step NBA dataset pipeline (internal) | Data ingestion work |

### Approved screens (reference implementations)

Located at `docs/reference-screens/`:

| Screen | File | Status |
|--------|------|--------|
| Play library | `PlayLibrary.jsx` | Approved |
| Play viewer | `PlayViewer.jsx` | Approved (3 game-changers + ghost fix) |
| Game plan generator | `GamePlanGenerator.jsx` | Approved |
| Game day flow (3-tab) | `GameDayFlow.jsx` | Approved — ported to `src/components/gameday/GameDayFlow.tsx` |

### Tech stack

- **Web**: Next.js 16 (App Router, Turbopack), Tailwind CSS, Vercel (dev on port 3001)
- **SVG**: Custom React components (play viewer, court diagrams)
- **AI**: Claude API directly via `@anthropic-ai/sdk` (Node) + `anthropic` (Python). NO LangChain, NO LangGraph
- **Backend**: FastAPI + Postgres on Render (NOT Supabase — explicit decision)
- **Mobile CV**: React Native + MediaPipe (companion app)
- **Auth**: Clerk (recommended, not yet implemented) — EU region, parental consent flows for minors

### Design system (B+C merge — quick tokens)

```
Backgrounds:  bg:#0a0a0b  bg2:#111113  bg3:#19191c
Borders:      bd:rgba(255,255,255,0.08)  bd2:0.14  bdS:0.22
Text:         tx:#fafafa  ts:#a1a1aa  td:#63636e  tg:#3e3e45
Accent:       ac:#f97316 (basketball orange — interactive/court elements ONLY)
Semantic:     gn:#22c55e  rd:#ef4444  am:#eab308  pu:#a855f7
Typography:   system sans-serif, weight 800-900 for headlines
Radius:       0px everywhere
The court rule: orange appears ONLY for basketball-related elements
```

Full tokens + BallButton + BallDot components in `docs/specs/design-system.md`.

### Key conventions

- **Answers over options**: never show a blank template. Always deliver a pre-built answer the coach adjusts.
- **Intent-driven**: the app infers what the user needs from 8 signals. Screens assemble dynamically.
- **Court coordinate system**: `viewBox="-28 -3 56 50"`. Origin (0,0) = center-top of half-court.
- **Play data**: phases → actions → paths (SVG Bézier curves). See `docs/specs/play-viewer.md`.
- **Opponent data**: all screens consume `OpponentProfile` interface. Provider-agnostic. See `docs/specs/game-plan.md`.
- **No NBA / institution / player names**: legal compliance. 8 archetypes stand alone. Scrub team names (Lakers, Celtics, UCLA, Princeton, etc.), player first/last names, and specific coach names from `src/` and `knowledge-base/wiki/`. Book-author attribution allowed only inside `[Sn]` source-citation footers (internal use). Enforced by `npm run check:nba-terms`.
- **GDPR as global baseline**: under-16 parental consent. Anonymized stats for AI training.

### Build priority

1. Intent engine + signal system
2. Knowledge wiki (ingest 7 PDFs)
3. Play viewer (v4 — done)
4. Landing page (done)
5. Coach game day flow
6. Game plan generator (approved)
7. Play library (approved)
8. Player experience
9. Defense simulator
10. Body lab / Drill lab / Knowledge search
11. Gamification layer
12. Computer vision (companion mobile app)

### Source materials

7 PDFs at `knowledge-base/raw/`: Let's Talk Defense (274pg), Basketball Anatomy (200pg), Offensive Skills (200pg), Basketball For Coaches (200pg), Skills & Drills (239pg), NBA Playbook (934pg), Coaches Playbook (371pg). Total: 2,440 pages.

### Pricing

Free ($0) | Player ($10/mo) | Coach ($30/mo) | Program ($50/mo)

---

## Visual audit pipeline (Apr 2026)

Play synthesis now has three gates:

- `npm run synthesize:revalidate` — re-validates every registered play's semantic form against current collision rules (CI-grade, ~1s)
- `npm run test:visual` — Playwright pixel regression + bbox collision detection + state assertions across all plays and label modes (#/POS/NAME), ~30s
- `npm run visual-audit:report` — aggregates both into `docs/visual-audit-<date>.md`

Quarantined plays live in `src/data/plays/_review/` (excluded from index). See `docs/specs/play-viewer.md` for the instrumented `window.__motionState` / `window.__motionControls` dev hooks.
