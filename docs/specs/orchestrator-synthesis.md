# Orchestrator Synthesis — Motion Architecture Design Pass

**Date**: 2026-04-12
**Role**: Orchestrator (main thread)
**Subagents**: Distinguished Backend Engineer, Senior Graphic Designer, Senior Software Engineer
**Deliverables bundled**:
- `docs/specs/backend-architecture.md` (745 lines, ~4,200 words)
- `docs/specs/design-revamp.md` (630 lines, ~3,200 words)
- `docs/specs/implementation-roadmap.md` (353 lines, ~3,200 words)
- this synthesis (~1,400 words)

This document is a thin coordination layer. It does not re-write the three specs. It cross-links decisions, surfaces the open questions the engineer-in-chief (Cédric) needs to answer, and ranks recommended next moves.

---

## 1. Executive summary

The three specs stand as a coherent architecture. Backend picks Postgres without hedging and designs a CV pipeline that stays below 1% of revenue at year-3 scale. Design repositions the landing page around "COACHES THE COACH" — the moat thesis from the product brainstorm — and specs 9 new components grounded in existing design tokens. The software engineer resolves the expected parallel-spec frictions (async CV vs live UI, halftime latency vs Claude cost, camelCase vs snake_case) cleanly and produces a 10-epic build sequence with 11 engineer-weeks of critical-path work.

No load-bearing conflicts unresolved. Three decisions need Cédric's input before build begins (see §4).

---

## 2. Cross-spec dependency map

Critical path (ordered; each depends on the previous landing):

```
┌─────────────────────────────────────────────────────────┐
│ E1  Postgres + Alembic scaffold          backend §3,§7  │  ← start
├─────────────────────────────────────────────────────────┤
│ E2  Clerk auth wiring (FE + BE)           backend §8    │
├─────────────────────────────────────────────────────────┤
│ E3  Coach-profile MVP                     coach-profile │
│       ↓ unblocks                                         │
├─────────────────────────────────────────────────────────┤
│ E5  Hand-signal system                    hand-signals  │
├─────────────────────────────────────────────────────────┤
│ E7  Game Day Flow integration             (refactor)    │
├─────────────────────────────────────────────────────────┤
│ E10 Halftime pre-compute cache            roadmap §1.2  │
├─────────────────────────────────────────────────────────┤
│ E14 Observability stack                   backend §10   │
└─────────────────────────────────────────────────────────┘

Off the critical path (parallelizable with a second engineer):
  E4 Landing revamp          design §2
  E6 Teach-progression gen   teach-progressions
  E8 Intent engine wiring    architecture.md
  E9 Compounding UI wire     (scaffold exists)
  E11 CV ingestion pipeline  backend §5  (deferrable past beta)
  E12 Play library UI        design §4
  E13 Fidelity badge UI      design §4, fidelity-2026-04-12
```

**Solo estimate**: ~11 engineer-weeks to the end of E14. **Two-engineer estimate**: ~7 weeks.

**CV is deferrable**: the pipeline is designed async and post-game-only; the product ships without it at beta, adds it as a season-one upgrade.

---

## 3. Decision log

Every material decision made across the three specs, with owner.

| # | Decision | Rationale | Owner | Source |
|---|---|---|---|---|
| 1 | **Postgres, not MongoDB** | Won 10 of 12 axes (relational integrity, GDPR cascade, JSONB for flex, mature migrations, transactional stat entry, pgvector future-proof) | Backend | backend §1 |
| 2 | **FastAPI layered**: routers → services → repositories, strict | No SQL in routers; no HTTP in services. Test doubles per aggregate | Backend | backend §2, §6 |
| 3 | **CV via async queue + R2 + mobile-side MediaPipe** | $0 Phase-1 inference (edge), R2 beats S3 on egress for replay, keeps infra <1% of revenue at 10k scale | Backend | backend §5 |
| 4 | **`cv_game_frame` partitioned 16-way by hash on game_id** | Game-local queries touch one partition; 75M rows/week doesn't bloat a single table | Backend | backend §3 |
| 5 | **Event bus: in-process now, Redis Streams at ~500 concurrent coaches** | Protocol-first interface lets us swap without rewriting handlers | Backend | backend §6 |
| 6 | **Clerk for auth** (JWT via middleware, per-team role deps, parental_consent_at for COPPA) | Offloads hardest parts; minors protected at service layer | Backend | backend §8 |
| 7 | **Unleash self-hosted for feature flags** (vs LaunchDarkly) | Cost at scale; keep control over flag data | Backend | backend §6 |
| 8 | **Landing repositions to "COACHES THE COACH"** | Differentiates from Hudl, FastModel (team-focused incumbents); fidelity badge as trust anchor | Designer | design §2 |
| 9 | **9 new components specced** (Concept, Drill, Fidelity, HandSignal, CoachLevel, OpponentScouting, HalftimeAdjustment, TeachProgression, Lineup cards) | Full anatomy + 8 states + motion per component | Designer | design §4 |
| 10 | **Motion vocabulary extends PlayViewer's DRAW→FADE→MOVE** | Existing baseline, users already parse this choreography | Designer | design §7 |
| 11 | **56×56 primary tap targets on live-game surfaces** (vs Apple's 44×44 floor) | Sweaty hands, sunlight, one-handed reach at courtside | Designer | design §6 |
| 12 | **CV is NOT the live-game data path** | Live UI reads manual tap-to-log stats + optimistic state; CV is post-game replay + season flywheel | Engineer | roadmap §1.1 |
| 13 | **Halftime pre-compute on Q2 transition → Redis cache** | 1s chip-tap budget vs 3–8s Claude latency; tap serves from cache <100ms, SSE fallback | Engineer | roadmap §1.2 |
| 14 | **Pydantic alias_generator = camelCase on wire, snake_case internal** | Zero frontend translation layer; one-time config | Engineer | roadmap §1.3 |
| 15 | **Typed error envelope**: `{error: {code, message, retryable, hint}}` | Every design component's error state has a consumable contract | Engineer | roadmap §1.4 |
| 16 | **10% canary + auto-rollback on error-rate bump** | Render blue-green + Vercel instant previous-deploy | Engineer | roadmap §6 |
| 17 | **Rollout: dogfood → 10 → 100 → all new signups → existing** | Week 0 / 2 / 4 / 6 / 8 / 12 pacing | Engineer | roadmap §8 |

---

## 4. Open questions — RESOLVED 2026-04-12

All 5 recommendations accepted by Cédric.

1. **Event-bus flip threshold** — ✅ ACCEPTED. Ship in-process, instrument event-bus P95, alarm at 200 concurrent-coach mark → ~1 month lead time for Redis Streams swap.

2. **Default tier for new coaches on skipped quiz** — ✅ ACCEPTED. Beginner default + single-tap "I'm already a coach — skip to advanced" chip on first load.

3. **Live-game multi-device presence** — ✅ DEFERRED. Single-device for MVP. WebSocket/CRDT work moves to post-beta backlog.

4. **CV inference hosting at year-2 scale** — ✅ FLAGGED. Mobile-side MediaPipe for phase-1. Heavier model hosting ($1.5k–$5k/mo decision) revisited in year-1 review.

5. **Landing page copy tone** — ✅ ACCEPTED pending legal. "AI coaches the coach" positioning kept; legal pass on Hudl/FastModel naming before ship.

---

## 5. Recommended next concrete steps (ranked by impact × feasibility)

1. **Review all 4 specs together.** Estimated reading time: 45 min. Identify anything you disagree with before engineers start building against it. Anchor decisions now, not after implementation.

2. **Answer the 5 open questions above.** Blocking for several epics (E2 depends on #2, E5 multi-device question on #3).

3. **Lock-in E1+E2 as this session's next build task.** Postgres + Alembic + Clerk. One week of work; unblocks every downstream epic. No ambiguity, no open questions on these two.

4. **Parallelize landing page revamp (E4)** via a subagent once E1/E2 are underway. Landing has zero backend dependency; can ship independently.

5. **Defer CV (E11) to post-beta.** Roadmap §3 already sequences this correctly; confirm and don't get pulled into it early.

6. **Update `MEMORY.md` + `project_deferred_work.md`** with this session's architectural decisions so future sessions pick up cleanly.

---

## 6. Budget forecast (aggregated from all 3 specs)

### Infra (monthly)

| Scale | Render PG + FastAPI | Vercel | Clerk | Anthropic API | R2 (CV) | Total | % of ARR (est $30/coach/mo) |
|---|---|---|---|---|---|---|---|
| **100 coaches** | $80 | $20 | $0 (free tier) | $50 | $5 | ~$155 | ~5% |
| **1k coaches** | $350 | $150 | $75 | $400 | $50 | ~$1,025 | ~3.4% |
| **10k coaches** | $2,500 | $1,200 | $750 | $3,500 | $1,500 | ~$9,450 | ~3.2% |

### Claude-cost lever

Engineer §10 flagged this as biggest risk. **Every 10 percentage points of Claude cache-hit-rate saves ~$750/month at 10k scale.** Content-hash cache + per-coach daily cap + $5/coach/day alert + hard circuit-breaker in `claude.py` — all day-one investments.

### Engineer-weeks

- Solo to end of E14 (critical path): **11 weeks**
- Two engineers (parallelize off-critical epics): **7 weeks**
- Full program including CV + player-facing (30 screens): **~20 weeks solo / 14 weeks dual**

### This orchestration pass

Total API spend: ~$0.80 (3 subagents on Opus, single invocation each, substantial prompts).

---

## Appendix — files referenced

- `/Users/ced/Desktop/motion/courtiq/docs/specs/backend-architecture.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/design-revamp.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/implementation-roadmap.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/coach-profile.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/hand-signals.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/teach-progressions.md`
- `/Users/ced/Desktop/motion/courtiq/docs/fidelity-2026-04-12.md`
- `/Users/ced/Desktop/motion/courtiq/CLAUDE.md`
