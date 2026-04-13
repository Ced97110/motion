# Implementation Roadmap — Motion

> **Author**: Senior Software Engineer handoff
> **Date**: 2026-04-12
> **Status**: Proposal — the glue layer between `backend-architecture.md` (just produced) and `design-revamp.md` (just produced).
> **Reads first**: `docs/specs/backend-architecture.md`, `docs/specs/design-revamp.md`, `CLAUDE.md`, `docs/specs/architecture.md`, plus feature specs `coach-profile.md`, `hand-signals.md`, `teach-progressions.md`.

This document does not re-synthesize prior docs. It resolves conflicts between them, sets build order, and anchors the project to concrete performance and cost numbers. Where a prior doc stands uncontested, I defer to it and cite it.

---

## 1. Conflict resolution

The backend spec and design spec were written in parallel. Below are the frictions worth naming and resolving before an engineer writes code against either.

### 1.1 Async CV vs "live game" expectations

`design-revamp.md §4.9` (LineupCard) and §2 imply a live in-game view. `backend-architecture.md §5` makes CV explicitly async (upload-after, drain-to-Postgres worker).

**Resolution**: CV is **not the live-game data path**. Live UI reads manual tap-to-log stats (as `GameDayFlow.jsx` already does) + optimistic state. LineupCard reads from `stat_line` + `team_roster`, both hot-writeable from coach taps. CV becomes post-game replay + season flywheel. Update design copy: "post-game detections", never "live CV". Winner: backend.

### 1.2 Live halftime responsiveness

`design-revamp.md §4.7` wants ≤1s on chip tap. Claude synth is 3–8s.

**Resolution**: **Pre-compute**. When `game.status` flips to Q2, a background worker generates the top 3 adjustments from current state + opponent tendencies into Redis `halftime:{game_id}`. Tap on the Halftime tab serves from cache in <100ms; commit writes a single row (<50ms). On pre-compute miss, stream Claude output via SSE behind a skeleton. Winner: design target, via pre-compute + optimistic UI.

### 1.3 camelCase frontend vs snake_case backend

Pydantic v2 is snake_case; TS is camelCase.

**Resolution**: Pydantic alias generator on response schemas — `model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)`. Backend stays snake_case internally; wire is camelCase. No frontend translation layer. One-time config in `backend/src/motion/schemas/__init__.py`.

### 1.4 Typed error contracts for 9 new components

Each `design-revamp.md §4` component has an error state; FastAPI default errors don't map to them.

**Resolution**: one canonical envelope:
```json
{ "error": { "code": "INSUFFICIENT_DATA", "message": "…", "retryable": true, "hint": "Add scouting first" } }
```
Error codes are an exhaustive union generated via OpenAPI → `openapi-typescript`. `OpponentScoutingCard` consumes `INSUFFICIENT_DATA`; `HalftimeAdjustmentCard` consumes `CLAUDE_TIMEOUT`. CI fails on breaking contract changes.

### 1.5 REST vs WebSocket

Design motion implies reactivity; backend is pure REST.

**Resolution**: REST + **SSE on exactly two surfaces** — multi-coach presence (`/teams/{id}/presence`) and teach-progression streaming. Polling at 5s covers low-frequency deltas (final score, opponent refresh). No WebSockets for MVP.

### 1.6 Claude latency vs UX targets

`design-revamp.md §7` wants 200ms transitions; Claude is 3–8s. Three patterns, applied globally:
1. **Optimistic UI** — deterministic writes (signal assign, play-add, "I get it"); reconcile via TanStack Query onError.
2. **Pre-compute** — predictable Claude work (halftime, next-play teach progression, daily summary); keyed on calendar events.
3. **Streaming SSE** — genuinely ad-hoc (compounding query, knowledge/ask); first token <800ms.

No Claude-gated call sits on a critical-path tap.

---

## 2. Trade-off matrix

Rows are architectural decisions (not implementation details). Scores are **1 (poor) → 5 (excellent)** in that column's direction (higher Perf = faster; higher DX = easier; higher Flex = more adaptable; higher Cost = cheaper; higher Risk = **safer**). A higher row-sum means a better option.

| Decision | Perf | DX | Flex | Cost | Risk | Pick | Note |
|---|---|---|---|---|---|---|---|
| Server Components for Play Library + Landing | 5 | 4 | 3 | 5 | 4 | **SC** | Pre-rendered, cacheable; client islands for ConceptCard interactivity only |
| Client Components for Game Day Flow | 3 | 5 | 5 | 3 | 4 | **CC** | Needs tap state, optimistic UI; SC overhead not worth it here |
| Polling vs SSE vs WebSocket (live score) | 4/4/3 | 5/4/2 | 3/4/5 | 5/4/2 | 5/4/3 | **5s poll** | SSE reserved for presence + teach-progression streaming |
| Redis cache vs materialized views (roster aggs) | 5/3 | 5/3 | 5/3 | 4/3 | 4/3 | **Redis** | Rosters change daily, not hourly; Redis TTL simpler than refresh schedule |
| SSR vs ISR vs CSR (landing page) | 4/5/2 | 4/4/5 | 3/4/4 | 4/5/5 | 4/5/3 | **ISR** | 5-min revalidate; zero cost, fast LCP; marketing copy changes weekly max |
| Monolith FastAPI vs split core+cv-worker | 4/5 | 5/3 | 3/5 | 5/3 | 4/3 | **Monolith** | Split at ≥500 concurrent coaches, same trigger as event-bus flip |
| Claude cache: content-hash vs semantic-hash | 5/4 | 5/3 | 3/5 | 4/4 | 4/3 | **Content-hash MVP** | Content-hash is bulletproof; semantic-hash after we have 1k coach corpus |
| Session storage: Clerk JWT only vs Postgres sessions | 5/3 | 5/4 | 3/5 | 5/4 | 4/4 | **Clerk JWT only** | Per backend-architecture.md §8; revocation via Clerk's side, not ours |
| Opponent merge: eager (read-join) vs materialized | 3/5 | 5/3 | 5/3 | 4/3 | 4/3 | **Eager + 1h Redis** | Per backend §6 provider pattern; materialize only if p95 >400ms |
| Blob storage: R2 vs Render-native | 5/4 | 5/5 | 5/4 | 5/3 | 5/4 | **R2** | Zero-egress is decisive for CV replay; backend §5 already commits |
| Feature flag: Unleash self-hosted vs LaunchDarkly | 4/4 | 3/5 | 4/4 | 5/2 | 3/5 | **Unleash** | Per backend §6; LaunchDarkly ~$600/mo at 10k MAU is a hard no |

**Pattern**: optimize for cost and predictability on writes; pay for DX on flags/observability; stay monolithic until scale forces otherwise.

---

## 3. Build order + dependency graph

Engineer-weeks (one senior full-stack). **Critical path bold**.

| # | Epic | Weeks | Depends on |
|---|---|---|---|
| **E1** | **Postgres + Alembic scaffold** | 1 | — |
| **E2** | **Clerk wiring (FE+BE)** | 1 | — (parallel with E1) |
| **E3** | **Coach profile MVP** (quiz + gating) | 2 | E1, E2 |
| E4 | Play Library UI integration + fidelity badge | 1.5 | E1 |
| **E5** | **Hand-signal system** | 2 | E3 |
| E6 | Teach-progression generator (Claude) | 2.5 | E3 + Claude client |
| **E7** | **Game Day Flow integration** | 2 | E4, E5 |
| E8 | Landing page revamp | 1.5 | E3 |
| E9 | Opponent profile MVP (tier-1 manual) | 1.5 | E1 |
| **E10** | **Halftime adjustments pre-compute** | 2 | E6, E7 |
| E11 | CV ingestion pipeline MVP | 3 | E1, R2, RN app |
| E12 | Intent engine wiring (8 signals → 5 intents) | 2 | E3, E4 |
| E13 | Compounding-query UI wiring | 1.5 | E12 |
| **E14** | **Observability stack** | 1 | folds in |
| E15 | Eval harness + visual-regression extension | 1.5 | E4, E5 |
| E16 | Stat flywheel + anonymized training pipeline | 2 | E7, E11 |

**Critical path**: E1 → E2 → E3 → E5 → E7 → E10 → E14 ≈ **11 engineer-weeks** solo; **7 weeks** with two engineers running E4/E6/E8/E9 in parallel.

Dependency graph (simplified):

```
E1 ─┬─> E3 ─┬─> E5 ─┬─> E7 ─> E10 ─> E14
    │       │       │        │
    │       └──> E6─┘        └─> E16
    ├──> E4 ─────────> E7
    ├──> E9 ─────────────────> E10
    │
E2 ─┴──> E3
    │
    └──> E8 (landing)
         │
E7 ──> E11 (CV pipeline, parallelizable after E7 schema stable)
E3 ──> E12 ──> E13
```

Epics E4, E8, E9 can run in parallel on a second engineer without blocking the critical path. E11 (CV) is the largest single epic but doesn't block the MVP coach flow — it can ship after beta.

---

## 4. Observability

### Log schema

Every line (structlog JSON, per backend-architecture.md §10):
```json
{
  "timestamp": "2026-04-12T18:22:04.511Z",
  "level": "info|warn|error|debug",
  "correlation_id": "c_01HWX…",   // propagates to Claude + Clerk outbound
  "coach_id": "u_…" ,
  "team_id": "t_…",
  "endpoint": "POST /games/{id}/adjustments",
  "latency_ms": 184,
  "status": 200,
  "event": "halftime_adjustment_committed",
  "detail": { "play_slug": "weakside-flare-slip", "cached": true }
}
```

### Metric names + labels

- `http_request_duration_seconds{endpoint, status, method}` (histogram)
- `claude_cost_usd_total{coach_id, model, feature}` (counter; feature = `synth|halftime|ask|teach_progression`)
- `claude_latency_seconds{feature, cache_hit}` (histogram)
- `cv_ingest_batch_size{outcome}` (histogram)
- `db_query_duration_seconds{table, op}` + `cache_hits_total{prefix}` / `cache_misses_total{prefix}`
- `event_bus_handler_duration_seconds{event_type, handler}`
- `fidelity_score_gauge{play_slug, metric_kind}` — fed by `fidelity_signal` writes
- `feature_flag_eval_total{flag, variant}` (Unleash)

### Trace spans

Auto: `http.request` (FastAPI), `db.query` (SQLAlchemy). Custom: `claude.generate`, `claude.cache.lookup`, `event.publish`/`event.handle`, `r2.upload`/`r2.signed_url`, `clerk.verify_jwt`.

### Alerts

| Alert | Threshold | Severity | Action |
|---|---|---|---|
| API P95 latency | >2s for 5 min on any non-Claude endpoint | Page | Auto-roll previous deploy |
| Claude P95 latency | >8s for 5 min | Warn | Investigate; may indicate Anthropic degradation |
| Claude cost / coach / day | >$5 | Page | Flag the coach; check for abuse/runaway loop |
| CV ingest failure rate | >5% for 10 min | Warn | Likely mobile release issue; check device meta |
| DB connection pool | >80% saturation | Warn | Scale out `api` service |
| Error rate | >1% for 10 min on any endpoint | Page | Roll back |
| Fidelity score gauge | any play drops >0.1 vs 7d rolling avg | Warn | Trigger visual-audit + eval run |
| Unleash availability | <99% over 1h | Warn | Fail-open (per backend §11 open question 10) |

### Dashboard layout (Grafana, single page)

```
┌─────────────────────────────────────────────────────────────┐
│ MOTION — PRODUCTION (24h window)                            │
├───────────────┬─────────────┬──────────────┬────────────────┤
│ RPS           │ P50 / P95   │ Err rate     │ Active coaches │
│ (line)        │ (bi-line)   │ (stacked)    │ (big number)   │
├───────────────┴─────────────┴──────────────┴────────────────┤
│ Claude cost/hour (stacked by feature) · Claude latency P95 │
├─────────────────────────────────────────────────────────────┤
│ CV ingest rate · CV partition skew · R2 storage growth     │
├─────────────────────────────────────────────────────────────┤
│ Cache hit ratios by prefix · DB slow queries (top 10)      │
├─────────────────────────────────────────────────────────────┤
│ Event bus latencies · Flag eval distribution               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Testing strategy

| Layer | Tool | Target | Where |
|---|---|---|---|
| Unit — frontend | vitest | ≥80% on `src/lib`, `src/components` | `tests/unit/` |
| Unit — backend | pytest | ≥80% on `services/`, `repositories/` | `backend/tests/unit/` |
| Integration — backend | pytest + Testcontainers-pg | Every router happy + 1-err path | `backend/tests/integration/` |
| Integration — frontend | vitest + MSW mocks | Each of the 9 new components: loading, error, empty | `tests/components/` |
| E2E | Playwright (already in repo) | 6 critical flows — below | `tests/e2e/` |
| Load | k6 (pick over locust — script = JS, lighter) | 3 scenarios — below | `tests/load/` |
| CV golden-frame regression | pytest fixture | 20 frozen frames; detections within ε tolerance | `backend/tests/cv_golden/` |
| Visual regression | Playwright + pixel diff (exists for plays) | Extend to 9 new components × states | `scripts/visual-audit.*` |
| Eval harness | existing `eval/` dir | Fidelity ≥0.85 avg, halftime relevance ≥0.7 | `eval/` |

**Critical E2E flows**: (1) landing → signup → quiz → dashboard, (2) assign hand signal to play, (3) generate teach-progression + install, (4) halftime → commit adjustment, (5) upload CV frames → see detections on replay, (6) filter Play Library by level, hit gated play.

**Load scenarios**: **S1** 100 concurrent halftime commits (P95 <1.5s, pre-computed); **S2** 1k teach-progressions/day + 50/min burst (P95 first-token <800ms via SSE); **S3** 50 mobile clients × 100-frame batches simultaneous (202 within 200ms).

**CV golden-frame regression**: 20 hand-labeled frames; run on every CV-worker deploy, assert detections within ε. CV equivalent of the play visual-audit.

---

## 6. Deploy pipeline

```
PR opened
  ├── Vercel preview (Next.js auto)
  └── GH Actions
       ├── frontend: typecheck → lint → vitest → visual-audit:report
       ├── backend: ruff → mypy → pytest (unit) → pytest (integration, Testcontainers)
       ├── contract: openapi-typescript diff vs main — fail on breaking change w/o version bump
       ├── evals: eval harness (short subset, 2 min) → fail on regression >5%
       └── gate check: check:nba-terms + synthesize:revalidate

Merge to main
  ├── Vercel prod deploy (Next.js) — 3 min
  └── Render deploy (FastAPI + alembic upgrade head pre-start) — 4 min
       ├── Blue-green: old revision stays up until health-check green
       └── Canary: 10% of traffic for 10 min, auto-rollback on error-rate bump
```

**Secrets**: Vercel env (Clerk publishable); Render env (Clerk secret, Anthropic key, DATABASE_URL, REDIS_URL, R2 keys). Local `.env` git-ignored; `.env.example` committed. Rotate Anthropic quarterly; Clerk secret on team departures.

**Migrations** (backend §7 three-phase): **Add** nullable in release N → **Backfill** with dual-write in N+1 → **Enforce** NOT NULL + drop old in N+2. `alembic upgrade head` runs in Render pre-start; migration >60s = split into phases, never hold a deploy.

**Rollback**: Vercel instant previous-deployment; Render image rollback (Alembic downgrades tested in CI, invoked manually); DB corruption → PITR via Render PG backups (15-min RPO).

---

## 7. Performance budgets

Device class: Moto G4 / iPhone 11-era throttled to 4G (half of users on ≥3-year-old phones at courtside).

| Surface | Budget |
|---|---|
| Landing: FCP / LCP / TTI | <1.2s / <1.8s / <2.5s |
| Landing: JS first-load | <180 KB gz |
| Play Library: first PlayCard | <400ms (ISR) |
| Play Viewer: SVG paint / animation | <200ms / 60fps |
| Halftime: chip tap → shown | **<1.5s** (pre-computed) |
| Halftime: commit tap → flash | **<200ms** (optimistic) |
| API P95 — non-Claude | <300ms |
| API P95 — Claude streaming first token / full | <800ms / <6s |
| CV: 202 ack / replay first frame | <200ms / <1s |

Enforced via Lighthouse CI on landing + play library per PR, k6 gates in staging before prod.

---

## 8. Rollout strategy

Feature flags (Unleash) + canary + kill switches on every AI-backed surface.

```
Week 0    Internal dogfood          Cédric + 2 internal coaches
Week 2    Friendly beta              10 coaches (invite-only)
Week 4    Broader beta               100 coaches (waitlist drain)
Week 6    All new signups            new registrations only
Week 8    Existing users             full population
Week 12   Player-facing experience   (separate surface; 14 screens)
```

**Flags** (Unleash, percentage-rollout with per-coach pinning):
- `coach_profile.v1` — governs onboarding quiz + level calibration
- `teach_progression.v1` — gated Claude generator
- `halftime.precompute` — pre-compute vs on-demand
- `cv.ingest.v1` — RN app rollout; flag read in mobile app too
- `landing.hero_variant` — A/B test "COACHES THE COACH" vs control
- `opponent.tier3_feed` — paid data provider on/off

**Kill-switch criteria** (any triggers immediate flag flip to 0%):
1. P95 latency budget breached for 30 min on the surface
2. Claude cost per coach exceeds $5/day for any coach (investigate abuse)
3. Fidelity score average drops >0.1 from 7-day rolling baseline on any play
4. Error rate on flagged endpoints >2% for 15 min
5. User-reported critical bug confirmed by 3+ coaches within 1h

**Guardrail**: flags default fail-open (last-known-good cached in Redis + memory) so Unleash going down doesn't break the product (backend §11 open question 10).

---

## 9. Cost model

Monthly infra cost at three scales. Back-of-envelope; assumptions in footnotes.

| Line item | 100 coaches | 1,000 coaches | 10,000 coaches |
|---|---|---|---|
| Render — Postgres (Standard) | $45 | $95 | $285 (HA pair) |
| Render — FastAPI web (2 instances) | $50 | $100 | $400 (autoscale 2–8) |
| Render — Redis | $10 | $30 | $90 |
| Vercel — Next.js | $0 (hobby) | $20 (pro) | $100 (team) |
| Clerk — MAU tier | $0 (free <10k MAU) | $25 (Pro) | $250 (Pro + overage) |
| Anthropic — synth + halftime + ask¹ | $120 | $900 | $7,500 |
| R2 — CV blobs² | $2 | $30 | $500 |
| Modal — Phase-2 CV inference³ | $0 | $150 | $1,000 |
| Unleash (self-host small VM) | $7 | $7 | $14 |
| Grafana Cloud (free tier → Pro) | $0 | $49 | $199 |
| Sentry (errors) | $0 | $26 | $100 |
| **Total** | **~$235** | **~$1,430** | **~$10,440** |
| **ARR⁴** | $36k | $360k | $3.6M |
| **Infra % of ARR** | 0.78% | 0.48% | 0.35% |

¹ Anthropic: $1/coach/mo at 100 scale, drops to $0.75 at 10k as content-hash cache hit rate climbs to ~70%. ² R2 per backend §5: $0.008/GB/mo blended. ³ Modal at 1k when Phase-2 cloud CV opens to paid coaches. ⁴ Blended ARPU $30/mo.

**Headroom**: infra <1% of ARR at every scale. Largest lever: Claude cache hit rate — every 10pp at 10k saves ~$750/mo.

---

## 10. Risks + mitigations

Ordered by probability × impact.

| # | Risk | P | I | Mitigation |
|---|---|---|---|---|
| 1 | **Anthropic API cost explosion** (loop bug, runaway synth) | M | H | Per-coach daily cap; Claude-cost alert at $5/coach/day; hard circuit-breaker in `claude.py` wrapper; content-hash cache from day one |
| 2 | **CV inference cost overshoot at year 3** | L | H | Phase-1 edge-only (backend §5); Modal usage-gated by flag; per-game cost metric visible on dashboard; paid-tier-only for Phase-2 cloud CV |
| 3 | **Event-bus flip happens too late; tail latencies spike** | M | M | Alert on `event_bus_handler_duration_seconds` P95 >200ms; pre-write Redis Streams adapter in E1 so the flip is a config change, not a rewrite |
| 4 | **Clerk vendor lock-in** | M | M | Abstract via `CoachContext` domain object (backend §8); JWT-only session means we don't store Clerk-specific session state; swap cost = ~2 eng-weeks |
| 5 | **COPPA/GDPR breach on under-16 players** | L | H | `parental_consent_at` enforced at service layer, not router (backend §8); hard delete cascades; legal review before launch; **only test coverage that's mandatory 95%+** |
| 6 | **Fidelity regression goes unnoticed** | M | M | Fidelity gauge in dashboard; alert on 0.1 drop; visual-audit on every PR; eval harness gates deploy |
| 7 | **CV frame upload failure semantics ambiguous** (backend §11 open #3) | M | M | Decide all-or-nothing batched txn pre-E11; load test at scale before mobile rollout |
| 8 | **Testcontainers-pg CI slowdown** (backend §11 open #9) | H | L | Adopt shared session-scoped container + xdist from day one; budget <10min CI runs |
| 9 | **Unleash outage breaks flagged features** | L | M | Fail-open with Redis + in-memory LKG cache; dual-evaluation (service layer + gateway) so either can short-circuit |
| 10 | **Design-token drift between design-revamp.md and code** | M | L | Consolidate `src/lib/design-tokens.ts` as single source; visual-audit catches drift pixel-wise; CI lint rule bans raw color strings in TSX |

---

## Appendix — references

- `docs/specs/backend-architecture.md` — §1 Postgres decision, §3 DDL, §5 CV pipeline, §6 extensibility patterns, §8 Clerk auth, §10 observability, §11 open questions
- `docs/specs/design-revamp.md` — §2 landing, §4 nine new components, §5 tokens, §6 mobile, §7 motion, §8 accessibility, §9 A/B tests
- `docs/specs/architecture.md` — intent engine + dynamic assembly
- `docs/specs/coach-profile.md`, `hand-signals.md`, `teach-progressions.md` — feature specs this roadmap sequences
- `CLAUDE.md` — tech stack locks, IP compliance rules, visual-audit pipeline

**End of document.** The engineer inherits this alongside the backend + design specs. Critical path is unambiguous (E1→E2→E3→E5→E7→E10→E14); everything else is parallelizable or post-beta.
