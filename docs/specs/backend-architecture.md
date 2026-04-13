# Backend Architecture — Motion

> Generated: 2026-04-12
> Status: Draft, hand-off document for the software engineer
> Scope: FastAPI + Postgres on Render, Clerk auth, Claude via direct SDK, React Native CV companion ingestion
> Reads first: `CLAUDE.md`, `docs/specs/architecture.md`, `docs/specs/data-strategy.md`, `docs/specs/cv-roadmap.md`, `docs/specs/coach-profile.md`, `docs/specs/hand-signals.md`, `docs/specs/teach-progressions.md`

This document is the backend side of the Motion architecture. The frontend side (Next.js App Router, intent engine, dynamic assembly) is covered by `docs/specs/architecture.md`. This document answers: what runs behind FastAPI, what persists where, how CV frames flow from a kid's iPhone back to the coach's dashboard, and how this scales from 100 coaches to 10,000 without a rewrite.

---

## 1. SQL (Postgres) vs MongoDB — Decision

**Decision: Postgres. Not MongoDB. Not a debate.**

Motion's domain is fundamentally relational. A `stat_line` belongs to a `player` who belongs to a `team_roster` row inside a `team` in a `game` for a `season`. A `game_play_call` references a `play` and a `game` and a `team`. A `cv_detection` references a `cv_game_frame` which references a `game`. Ten foreign keys into a single box score. Mongo can model this — but you end up hand-rolling joins in application code, and every aggregate query ("roster averages across last 10 games") turns into a pipeline stage fest that an RDBMS expresses as a single `GROUP BY`.

The places where Mongo is genuinely better (schemaless documents with heterogeneous shapes, denormalized read-optimized reads) don't apply here. Our "flexible data" surfaces — per-play SVG phase coordinates, per-signal JSONB payloads (see `docs/specs/hand-signals.md` line 38), per-progression segment arrays — are **small blobs attached to relational rows**. Postgres `JSONB` handles this perfectly with GIN indexes for ad-hoc querying.

### Decision table

| Concern | Postgres | MongoDB | Winner |
|---|---|---|---|
| Relational integrity (FKs) | Native, enforced | App-level, fragile | Postgres |
| Transactional stat entry at halftime (multi-table write) | ACID by default | Multi-doc txns, worse perf | Postgres |
| Time-series stat data (box scores, CV detections) | Btree + partial indexes handle it; TimescaleDB if scale demands | Native time-series collection | Postgres (good enough; avoid bifurcation) |
| CV frame metadata (1000s per game) | Partitioned table, `PARTITION BY RANGE` on `game_id` | Sharded collection | Postgres |
| JSONB for per-play metadata | GIN-indexable, typed access | Native | Tie |
| GDPR row-level delete (hard delete with FK cascade) | `ON DELETE CASCADE`, immediate | Cascade not native; scripted | Postgres |
| Aggregate queries (roster avg, opp tendencies) | Window functions, `GROUP BY`, materialized views | Aggregation pipeline, verbose | Postgres |
| Mature migration tooling | Alembic, PG-native DDL | Migrate-mongo, schema drift risk | Postgres |
| Team familiarity (Python + FastAPI shop) | SQLAlchemy/psycopg native | Motor/Beanie, less idiomatic | Postgres |
| Wiki references (files, not DB) | Store file path + checksum in table | Same | Tie (orthogonal) |
| Managed hosting on Render | First-class | Mongo Atlas (separate provider) | Postgres |
| Per-coach GDPR export | Single SQL query per table | Aggregation per collection | Postgres |

**Postgres wins on 10 of 12 axes.** The two ties don't pull toward Mongo. We use `JSONB` liberally for genuinely flexible fields (signal payloads, per-play SVG coordinates, CV detection bounding boxes), partitioning for hot CV data, and pgvector later if we need embedding similarity against wiki pages. One database, no bifurcation, no operational tax.

Files — the 1,032 wiki markdown pages — live in blob storage (Cloudflare R2) referenced by path + SHA-256 hash. Wiki is not a DB table; it's a compiled artifact. See `CLAUDE.md` line 98 and `docs/specs/architecture.md` Karpathy pattern.

---

## 2. FastAPI app structure

```
backend/
├── pyproject.toml              # uv-managed; FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, anthropic, clerk-sdk-python
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── src/motion/
│   ├── main.py                 # FastAPI app factory, middleware wiring
│   ├── config.py               # Pydantic Settings (env-driven)
│   ├── db.py                   # engine, session factory, get_session dep
│   ├── deps.py                 # shared dependencies (get_current_coach, get_team_role)
│   ├── middleware/
│   │   ├── auth.py             # Clerk JWT verify → inject CoachContext
│   │   ├── rate_limit.py       # slowapi bucket per coach/IP
│   │   ├── observability.py    # OTel spans, correlation_id injection
│   │   └── cors.py
│   ├── routers/
│   │   ├── auth.py             # /auth/whoami, /auth/onboarding
│   │   ├── coaches.py          # /coaches/{id}/profile, /coaches/{id}/vocab-events
│   │   ├── teams.py            # /teams, /teams/{id}/roster, /teams/{id}/signals
│   │   ├── plays.py            # /plays, /plays/{slug}, /plays/{slug}/teach-progression
│   │   ├── games.py            # /games, /games/{id}/play-calls, /games/{id}/stats
│   │   ├── cv.py               # /cv/frames (ingest), /cv/games/{id}/detections
│   │   ├── evals.py            # /evals/runs, /evals/scores (internal)
│   │   └── knowledge.py        # /knowledge/search, /knowledge/ask (Claude-backed)
│   ├── services/               # business logic — NO SQL, NO HTTP
│   │   ├── coach_profile.py
│   │   ├── signal_generator.py # deterministic; see hand-signals.md line 128
│   │   ├── teach_progression.py# Claude-backed; see teach-progressions.md
│   │   ├── game_plan.py
│   │   ├── opponent_profile.py # provider pattern, P1→P4 merge
│   │   ├── stat_flywheel.py    # anonymized training pipeline
│   │   └── cv_ingest.py
│   ├── repositories/           # data access — only layer that touches SQLAlchemy
│   │   ├── base.py             # generic CRUD + pagination
│   │   ├── coach.py
│   │   ├── team.py
│   │   ├── play.py
│   │   ├── game.py
│   │   ├── cv.py
│   │   └── wiki_patch.py
│   ├── models/                 # SQLAlchemy ORM models (matches DDL in §3)
│   ├── schemas/                # Pydantic request/response models
│   ├── events/
│   │   ├── bus.py              # in-process pub/sub; Redis Streams adapter behind same interface
│   │   └── handlers/           # game_ended → stats_flywheel; patch_promoted → wiki_reindex
│   ├── integrations/
│   │   ├── claude.py           # thin wrapper over anthropic SDK; prompt caching; cost ledger
│   │   ├── clerk.py            # JWKS cache, verify_jwt
│   │   ├── blob_storage.py     # R2 (boto3 S3-compatible)
│   │   └── redis_client.py
│   └── plugins/                # future: chess_coaching/, soccer_coaching/
└── tests/
    ├── unit/                   # pure logic; no DB
    ├── integration/            # Testcontainers-pg
    └── e2e/                    # API-level with Playwright-spawned client
```

**Discipline enforced by convention and code review:**

- Routers never touch SQLAlchemy. They call services.
- Services never touch HTTP concerns. They accept plain args and return domain objects.
- Repositories are the only layer that imports SQLAlchemy models.
- Pydantic v2 for all request/response/internal DTOs. No raw dicts crossing layer boundaries.

---

## 3. Postgres schema (DDL)

Edited for brevity; all tables use `uuid_generate_v4()` defaults via `pgcrypto`, `TIMESTAMPTZ` for all timestamps, and soft-delete by timestamp is rejected — GDPR requires hard deletes.

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy play name search
CREATE EXTENSION IF NOT EXISTS btree_gist;    -- partitioned indexes

-- §3.1 Coach profile (mirrors docs/specs/coach-profile.md)
CREATE TABLE coach_profile (
  coach_id        UUID PRIMARY KEY,                        -- Clerk user id
  level           TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (level IN ('unknown','beginner','intermediate','advanced')),
  years_coaching  SMALLINT CHECK (years_coaching BETWEEN 0 AND 80),
  level_coached   TEXT CHECK (level_coached IN ('u10','u12','u14','u16','hs','college','pro','mixed')),
  region          TEXT,
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coach_concept_progress (
  coach_id       UUID NOT NULL REFERENCES coach_profile(coach_id) ON DELETE CASCADE,
  concept_slug   TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('locked','introduced','mastered')),
  introduced_at  TIMESTAMPTZ,
  mastered_at    TIMESTAMPTZ,
  PRIMARY KEY (coach_id, concept_slug)
);

CREATE TABLE coach_vocab_event (
  id            BIGSERIAL PRIMARY KEY,
  coach_id      UUID NOT NULL REFERENCES coach_profile(coach_id) ON DELETE CASCADE,
  term          TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('definition-tap','play-used','concept-search')),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coach_vocab_event_coach_time_idx ON coach_vocab_event(coach_id, occurred_at DESC);
CREATE INDEX coach_vocab_event_term_idx ON coach_vocab_event(term);

-- §3.2 Teams + roster
CREATE TABLE team (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_coach_id UUID NOT NULL REFERENCES coach_profile(coach_id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  level         TEXT NOT NULL,     -- 'u12', 'hs', 'club' etc.
  rules         TEXT NOT NULL DEFAULT 'FIBA' CHECK (rules IN ('FIBA','NBA')),
  region        TEXT,
  season        TEXT NOT NULL,     -- '2026-2027'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE team_roster (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  player_ref    UUID,                                   -- Clerk user id if the player has an account; null otherwise
  display_name  TEXT NOT NULL,                          -- first name + last-initial only for minors
  jersey_num    SMALLINT,
  position      TEXT,
  age_group     TEXT,                                   -- for COPPA/GDPR gate
  parental_consent_at TIMESTAMPTZ,                      -- non-null = consented
  attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,     -- height_cm, wingspan_cm, archetype tags
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX team_roster_team_idx ON team_roster(team_id);
CREATE INDEX team_roster_attrs_gin ON team_roster USING GIN (attributes);

-- §3.3 Signals (mirrors docs/specs/hand-signals.md)
CREATE TABLE team_play_signal (
  team_id        UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  play_slug      TEXT NOT NULL,
  signal_kind    TEXT NOT NULL CHECK (signal_kind IN
                  ('finger_count','closed_fist','open_palm','body_touch','verbal_shorthand','combined')),
  signal_detail  JSONB NOT NULL,
  verbal_label   TEXT,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by    TEXT NOT NULL CHECK (assigned_by IN ('ai','coach','team')),
  PRIMARY KEY (team_id, play_slug)
);
CREATE UNIQUE INDEX team_signal_uniqueness
  ON team_play_signal (team_id, signal_kind, (signal_detail->>'value'));

-- §3.4 Games and stats
CREATE TABLE game (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  opponent_ref  UUID,                                    -- references opponent_profile (nullable for scrimmages)
  starts_at     TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','in_progress','completed','canceled')),
  final_score   JSONB,                                   -- {"us":62,"them":58}
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX game_team_time_idx ON game(team_id, starts_at DESC);

CREATE TABLE game_period (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  period_num SMALLINT NOT NULL,
  duration_sec INT NOT NULL,
  score_delta JSONB,
  UNIQUE(game_id, period_num)
);

CREATE TABLE game_play_call (
  id            BIGSERIAL PRIMARY KEY,
  game_id       UUID NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  period_num    SMALLINT,
  clock_sec     INT,                                     -- remaining on the period clock
  play_slug     TEXT NOT NULL,
  outcome       TEXT CHECK (outcome IN ('score','miss','turnover','foul_drawn','reset','unknown')),
  points        SMALLINT,
  notes         TEXT
);
CREATE INDEX game_play_call_game_idx ON game_play_call(game_id);
CREATE INDEX game_play_call_play_idx ON game_play_call(play_slug);

CREATE TABLE stat_line (
  id            BIGSERIAL PRIMARY KEY,
  game_id       UUID NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  roster_id     UUID NOT NULL REFERENCES team_roster(id) ON DELETE CASCADE,
  mins_played   NUMERIC(4,1),
  points        SMALLINT,
  rebounds      SMALLINT,
  assists       SMALLINT,
  steals        SMALLINT,
  blocks        SMALLINT,
  turnovers     SMALLINT,
  fg_made       SMALLINT, fg_att SMALLINT,
  three_made    SMALLINT, three_att SMALLINT,
  ft_made       SMALLINT, ft_att SMALLINT,
  fouls         SMALLINT,
  plus_minus    SMALLINT,
  extras        JSONB NOT NULL DEFAULT '{}'::jsonb,      -- hustle stats, contested shots, etc.
  UNIQUE(game_id, roster_id)
);
CREATE INDEX stat_line_roster_idx ON stat_line(roster_id);

-- §3.5 CV ingestion — PARTITIONED for hot/cold separation
-- Frame metadata only; pixel data lives in R2 at the path stored in `blob_key`.
CREATE TABLE cv_game_frame (
  id            BIGSERIAL,
  game_id       UUID NOT NULL,
  captured_at   TIMESTAMPTZ NOT NULL,
  frame_index   INT NOT NULL,                            -- monotonic from capture session start
  blob_key      TEXT NOT NULL,                           -- R2 object key, e.g. "cv/{game_id}/{frame_index}.jpg"
  width_px      SMALLINT NOT NULL,
  height_px     SMALLINT NOT NULL,
  device_meta   JSONB NOT NULL DEFAULT '{}'::jsonb,      -- iPhone model, fps, orientation
  mediapipe_version TEXT,                                -- on-device inference version
  PRIMARY KEY (id, game_id)
) PARTITION BY HASH (game_id);

-- 16 hash partitions spreads ~5k games/week across shards; each partition stays small
CREATE TABLE cv_game_frame_p0 PARTITION OF cv_game_frame FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE cv_game_frame_p1 PARTITION OF cv_game_frame FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... repeat through p15
CREATE INDEX cv_game_frame_game_time_idx ON cv_game_frame(game_id, captured_at);

CREATE TABLE cv_detection (
  id              BIGSERIAL PRIMARY KEY,
  frame_id        BIGINT NOT NULL,
  game_id         UUID NOT NULL,                         -- denormalized for partition pruning
  detection_type  TEXT NOT NULL CHECK (detection_type IN
                    ('ball','rim','player_pose','shot_attempt','made_basket')),
  confidence      NUMERIC(4,3) NOT NULL,
  bbox            JSONB,                                 -- {x,y,w,h} normalized 0..1
  keypoints       JSONB,                                 -- MediaPipe 33-keypoint payload
  inferred_player_id UUID REFERENCES team_roster(id),    -- null until jersey OCR or manual tag
  FOREIGN KEY (frame_id, game_id) REFERENCES cv_game_frame(id, game_id) ON DELETE CASCADE
);
CREATE INDEX cv_detection_game_type_idx ON cv_detection(game_id, detection_type);

-- §3.6 Wiki patch queue (Karpathy flywheel)
CREATE TABLE wiki_patch_pending (
  id            BIGSERIAL PRIMARY KEY,
  source_type   TEXT NOT NULL CHECK (source_type IN
                  ('coach_edit','game_outcome','aggregate_telemetry','eval_regression')),
  target_path   TEXT NOT NULL,                           -- wiki path, e.g. 'concepts/flare-screen.md'
  proposed_diff TEXT NOT NULL,                           -- unified diff payload
  rationale     TEXT NOT NULL,
  confidence    NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','promoted','rejected')),
  reviewed_by   UUID,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wiki_patch_status_idx ON wiki_patch_pending(status, created_at);

-- §3.7 Opponent profile (provider pattern, see game-plan.md)
CREATE TABLE opponent_profile (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_tier SMALLINT NOT NULL CHECK (provider_tier BETWEEN 1 AND 4),
                                        -- 1=manual, 2=community, 3=public feed, 4=institutional
  display_name  TEXT NOT NULL,          -- scrubbed per CLAUDE.md rule (no real institution names)
  level         TEXT NOT NULL,
  region        TEXT,
  tendencies    JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE opponent_roster (
  opponent_id   UUID NOT NULL REFERENCES opponent_profile(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,                           -- "#12 PG" — no names per IP rule
  archetype     TEXT,                                    -- one of the 8 archetypes
  attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (opponent_id, label)
);

CREATE TABLE opponent_game_history (
  id            BIGSERIAL PRIMARY KEY,
  opponent_id   UUID NOT NULL REFERENCES opponent_profile(id) ON DELETE CASCADE,
  game_date     DATE NOT NULL,
  summary       JSONB NOT NULL                           -- boxscore snapshot + tendency deltas
);

-- §3.8 Fidelity telemetry (per play, per run; feeds quality gates)
CREATE TABLE fidelity_signal (
  id            BIGSERIAL PRIMARY KEY,
  play_slug     TEXT NOT NULL,
  team_id       UUID REFERENCES team(id) ON DELETE SET NULL,
  run_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  metric_kind   TEXT NOT NULL CHECK (metric_kind IN
                  ('svg_validate','collision','state_assertion','visual_diff','human_rating')),
  score         NUMERIC(4,3),                            -- 0..1
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX fidelity_play_time_idx ON fidelity_signal(play_slug, run_at DESC);
```

**Partitioning rationale.** `cv_game_frame` will hit millions of rows per week at year 3 (5k games × 15k frames ≈ 75M rows/week). Hash partitioning on `game_id` (16-way) keeps per-partition indexes warm, enables parallel query, and lets us drop cold partitions without a full table rebuild. We picked hash over range so any single game lands on one partition (good locality for the most common query: "all frames for game X").

**Indexing philosophy.** BTREE on all FK columns and time-descending compound indexes on high-cardinality write tables. GIN on `attributes` JSONB where ad-hoc filter queries exist. No triggers except `updated_at` maintenance — business rules live in services, not DDL.

---

## 4. Docker compose for dev

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: motion
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: motion
    ports: ["5433:5432"]
    volumes: ["pg_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U motion -d motion"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports: ["6380:6379"]
    volumes: ["redis_data:/data"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  api:
    build: .
    command: uvicorn motion.main:app --host 0.0.0.0 --port 8000 --reload
    env_file: .env
    ports: ["8000:8000"]
    volumes:
      - ./src:/app/src
      - ./alembic:/app/alembic
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }

  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: ["tools"]                    # only up with --profile tools
    environment:
      PGADMIN_DEFAULT_EMAIL: dev@motion.local
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports: ["5050:80"]

volumes:
  pg_data: {}
  redis_data: {}
```

```bash
# .env.example
POSTGRES_PASSWORD=changeme
DATABASE_URL=postgresql+psycopg://motion:changeme@postgres:5432/motion
REDIS_URL=redis://redis:6379/0
ANTHROPIC_API_KEY=sk-ant-xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=motion-cv-frames
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
LOG_LEVEL=info
ENVIRONMENT=dev
PGADMIN_PASSWORD=changeme
```

```bash
# Common commands
docker compose up -d                          # API + postgres + redis
docker compose --profile tools up -d pgadmin  # opt-in admin UI at :5050
docker compose exec api alembic upgrade head  # apply migrations
docker compose exec api alembic revision --autogenerate -m "add_coach_profile"
docker compose exec api pytest
docker compose down -v                        # nuke volumes (careful)
```

---

## 5. Computer vision integration architecture

This is the most scale-sensitive section. Get this wrong and the product melts at 1,000 coaches.

### Frame flow

```
iPhone (RN + MediaPipe)
  │ Capture at 30 fps; on-device MediaPipe inference per frame
  │ Keep every 3rd keyframe (10 fps effective) + metadata
  │ Upload queue (background, wifi-only, batched)
  ▼
POST /cv/frames (multipart: jpeg + detection JSON)   — async queue
  │ FastAPI accepts up to 100 frames per request, returns 202
  │ Writes JPEG to R2 (presigned URL pattern)
  │ Writes metadata to cv_game_frame + cv_detection in single txn
  ▼
Postgres (cv_game_frame partitioned) + R2 blob
  │ Event: `cv.frames.ingested` → triggers stats reconciliation
  ▼
Result aggregation service (nightly + on-demand)
  │ Reads detections; emits box-score-level updates to stat_line
  │ Reconciles against coach's manual tracking (source of truth wins conflicts)
  ▼
Coach replay screen
  │ Reads cv_game_frame by game_id; signs R2 URLs (15-min TTL)
  │ Overlays detections on playback
```

### Decisions

**Ingestion: async queue, not sync REST, not WebSocket.** WebSockets are over-engineered for a kid's phone uploading frames over spotty Wi-Fi. Sync REST blocks the mobile client under load. Async queue (HTTP POST returns 202 immediately, worker drains) matches the "game happened 30 min ago, upload now" reality. Retries are free.

**Blob storage: Cloudflare R2.** Zero egress fees are decisive for CV replay (every coach watching a clip costs money on S3). ~$0.015/GB/month storage. Render's native object storage is fine but pricier and less proven at scale. Never Postgres LOB — that path wrecks WAL and backups.

**Inference: edge (mobile) for Phase 1.** Per `docs/specs/cv-roadmap.md`, Phase 1 uses MediaPipe + YOLOv8 on-device. Inference cost = $0. Backend only stores metadata. This is the **single biggest cost lever**; preserve it as long as possible. Phase 2 (game film → auto stats) requires heavier models — at that point, Modal (pay-per-inference) beats self-hosted GPU on Render (always-on, 10x more expensive at our scale). Replicate is a fallback but less flexible than Modal for custom models.

**Result writes: batched.** One txn per upload batch (up to 100 frames), not per-frame. Guard with `ON CONFLICT (game_id, frame_index) DO NOTHING` to make retries idempotent.

**Replay: tiered retention.** Last 30 days of frames live in R2 standard tier. Older frames move to R2's cold tier via lifecycle policy (cheaper storage, higher retrieval cost — acceptable for rare historical replay). Derived detections stay in Postgres forever (tiny compared to frames).

### Scale model

Year 1: 100 coaches × 1 game/week × 15k frames × 100 KB = **150 GB/week ingested**. Storage cost ~$2.25/month, compute near zero (edge inference), bandwidth <$1/month. Total CV infra: <$10/month.

Year 3: 10k coaches × 1 game/week × 15k frames × 100 KB = **15 TB/week ingested** → 60 TB/month new data. At R2 cold tier blended average $0.008/GB/month, steady-state storage ~$500/month after lifecycle migration. Bandwidth for coach replay (assume 10% of games replayed at 500 MB avg) = 500 GB/month at $0 egress = $0. Edge inference still free. Phase 2 cloud inference (opt-in per coach) at $0.02/game × 50k games/month = $1,000/month. **Total CV infra at year 3: ~$1,500/month.** Healthy.

Cost per game end-to-end (year 3): ingestion $0.001 + storage $0.0005 + inference $0 (edge) or $0.02 (cloud) + retention $0.003 = **$0.004 to $0.024 per game**. At $30/month coach subscription, CV is <1% of revenue. Ship it.

---

## 6. Extensibility patterns

### Repository pattern

```python
# src/motion/repositories/base.py
from typing import Generic, TypeVar, Sequence, Protocol
T = TypeVar("T")
ID = TypeVar("ID")

class Repository(Protocol, Generic[T, ID]):
    async def get(self, id: ID) -> T | None: ...
    async def list(self, *, limit: int = 50, offset: int = 0) -> Sequence[T]: ...
    async def create(self, obj: T) -> T: ...
    async def update(self, obj: T) -> T: ...
    async def delete(self, id: ID) -> None: ...

# src/motion/repositories/coach.py
class CoachRepository:
    def __init__(self, session: AsyncSession):
        self._s = session
    async def get(self, coach_id: UUID) -> CoachProfile | None:
        return await self._s.get(CoachProfile, coach_id)
    # ...
```

Tests substitute `InMemoryCoachRepository` with no SQLAlchemy dependency. Unit tests run in <1s.

### Service layer

```python
# src/motion/services/teach_progression.py
class TeachProgressionService:
    def __init__(
        self,
        coaches: CoachRepository,
        plays: PlayRepository,
        claude: ClaudeClient,
        cache: Redis,
    ):
        self._coaches, self._plays, self._claude, self._cache = coaches, plays, claude, cache

    async def generate(self, input: TeachProgressionInput) -> TeachProgression:
        key = semantic_hash(input)
        if cached := await self._cache.get(key):
            return TeachProgression.model_validate_json(cached)
        gaps = self._detect_concept_gaps(input)
        practice_count = self._calibrate_count(input)
        out = await self._claude.generate_progression(input, gaps, practice_count)
        await self._cache.set(key, out.model_dump_json(), ex=None)  # forever — content-addressed
        return out
```

Routers call `service.generate(input)` and don't know Claude exists.

### Event bus

```python
# src/motion/events/bus.py
class EventBus(Protocol):
    async def publish(self, event: DomainEvent) -> None: ...
    def subscribe(self, event_type: type[E], handler: Callable[[E], Awaitable[None]]) -> None: ...

class InProcessEventBus:
    def __init__(self):
        self._handlers: dict[type, list] = defaultdict(list)
    async def publish(self, event):
        for h in self._handlers[type(event)]:
            asyncio.create_task(h(event))   # fire-and-forget

# Domain events
@dataclass(frozen=True)
class GameEnded(DomainEvent):
    game_id: UUID
    team_id: UUID

@dataclass(frozen=True)
class PatchPromoted(DomainEvent):
    patch_id: int
    target_path: str

# Handlers (wired at app startup)
bus.subscribe(GameEnded, stats_flywheel.on_game_ended)
bus.subscribe(PatchPromoted, wiki_reindex.on_patch_promoted)
bus.subscribe(PracticeCompleted, coach_profile.update_mastery)
```

Swap `InProcessEventBus` for `RedisStreamsEventBus` (same protocol) when concurrent-coach count crosses ~500 and in-process fan-out starves the event loop.

### Plugin architecture

```python
# src/motion/plugins/base.py
class KnowledgeDomainPlugin(Protocol):
    slug: str                          # 'basketball', 'chess', 'soccer'
    def register_routers(self, app: FastAPI) -> None: ...
    def register_event_handlers(self, bus: EventBus) -> None: ...
    def wiki_root(self) -> Path: ...

# src/motion/main.py
PLUGINS: list[KnowledgeDomainPlugin] = [BasketballPlugin()]
for p in PLUGINS:
    p.register_routers(app)
    p.register_event_handlers(bus)
```

Adding chess coaching is a new directory under `plugins/`, not a fork of core.

### Feature flags

Self-hosted via `unleash-client-python` (open-source, one container, $0 monthly) rather than LaunchDarkly ($$$ and per-coach billing). Flags live in Postgres. Coach-profile v1 rollout gated by `coach_profile.v1` flag with percentage rollout.

### Provider pattern (OpponentProfile)

```python
# src/motion/services/opponent_profile.py
class OpponentProvider(Protocol):
    tier: int
    async def fetch(self, opponent_id: UUID) -> OpponentProfile | None: ...

class ManualProvider:    tier = 1   # coach-entered
class CommunityProvider: tier = 2   # crowd-sourced, anon
class PublicFeedProvider: tier = 3  # aggregated public stats
class InstitutionalProvider: tier = 4  # paid data feeds (future)

class OpponentProfileService:
    def __init__(self, providers: list[OpponentProvider], cache: Redis):
        self._providers = sorted(providers, key=lambda p: p.tier)
        self._cache = cache
    async def get(self, opponent_id):
        if cached := await self._cache.get(f"opp:{opponent_id}"):
            return OpponentProfile.model_validate_json(cached)
        merged = OpponentProfile(id=opponent_id)
        for p in self._providers:
            if chunk := await p.fetch(opponent_id):
                merged = merge_priority(merged, chunk, winner=chunk)  # higher tier wins conflicts
        await self._cache.set(f"opp:{opponent_id}", merged.model_dump_json(), ex=3600)
        return merged
```

See `docs/specs/game-plan.md` opponent intelligence architecture and `CLAUDE.md` line 77.

---

## 7. Alembic migrations

**Naming**: `{YYYYMMDDHHMM}_{feature}_{purpose}.py` e.g. `202604120930_coach_profile_initial.py`. Set `file_template` in `alembic.ini` to enforce.

**Zero-downtime pattern (3-phase):**
1. **Add** — new column nullable, new table, no reads yet
2. **Backfill** — dual-write from app; background job fills historical rows
3. **Enforce** — flip to `NOT NULL`, drop old column — 2 releases later

**Rollback**: every migration must include a working `downgrade()`. Tested in CI against a fresh pg container.

**Seeds**: `scripts/seed_dev.py` — idempotent; drops and recreates a deterministic fixture set (1 coach, 1 team, 12-player roster, 5 games). `scripts/seed_staging.py` similar but larger (anonymized prod snapshot). Never run in prod.

---

## 8. Auth — Clerk JWT verification

```python
# src/motion/middleware/auth.py
class AuthMiddleware:
    def __init__(self, jwks_client: JWKSClient):
        self._jwks = jwks_client
    async def __call__(self, request: Request, call_next):
        if request.url.path.startswith("/public/") or request.url.path == "/health":
            return await call_next(request)
        token = extract_bearer(request)
        if not token:
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        try:
            claims = jwt.decode(token, self._jwks.signing_key(token),
                                algorithms=["RS256"], audience="motion-api")
        except InvalidTokenError:
            return JSONResponse({"error": "invalid token"}, status_code=401)
        request.state.coach_ctx = CoachContext(
            coach_id=UUID(claims["sub"]),
            email=claims.get("email"),
            roles=claims.get("public_metadata", {}).get("roles", []),
        )
        return await call_next(request)
```

**Role model**: `coach`, `head_coach`, `admin`. Stored in Clerk public metadata; reflected in JWT. Per-team checks via explicit `require_team_role(team_id, roles=["head_coach"])` dependency — never implicit.

**Parental consent (COPPA/GDPR)**: `team_roster.parental_consent_at` must be non-null before any PII surface (name, photo, video replay). Enforced at the service layer, not the router, so every entry point is covered. Under-16 accounts get a separate Clerk user-type with `requires_guardian: true` in metadata — a guardian-linked account must have explicitly approved the child within the last 12 months.

---

## 9. Rate limit + caching

**Rate limits (per-coach buckets via `slowapi` + Redis):**

| Endpoint group | Limit |
|---|---|
| `/auth/*` | 10/min |
| `/plays/*`, `/teams/*`, `/games/*` reads | 120/min |
| Writes (stat entry, signal edit) | 60/min |
| `/knowledge/ask` (Claude-backed) | 20/min, 200/day |
| `/teach-progression/generate` | 10/min, 60/day |
| `/cv/frames` (async ingest) | 1000/min (bulk-optimized) |

Claude-backed endpoints have daily caps to bound coach-level spend. Over-limit returns 429 with `Retry-After`.

**Cache TTLs:**

| Key | TTL | Invalidation |
|---|---|---|
| `wiki:{path}:{sha}` | 1h (content-addressed → effectively forever) | `PatchPromoted` event |
| `claude:synth:{semantic_hash}` | ∞ (content-addressed) | never |
| `coach:profile:{id}` | 5 min | write-through on `coach_profile` update |
| `opp:{id}` | 1h | `OpponentRefreshed` event |
| `team:signals:{team_id}` | 10 min | write-through on signal edit |

---

## 10. Observability

**Structured JSON logs** (via `structlog`): every line has `timestamp`, `level`, `correlation_id`, `coach_id` (if authed), `endpoint`, `latency_ms`. Correlation IDs propagate to outbound Claude + Clerk calls.

**OpenTelemetry**: auto-instrument FastAPI + SQLAlchemy + httpx. Custom spans around Claude calls tagged with `model`, `input_tokens`, `output_tokens`, `cost_usd`. Export to Grafana Cloud (free tier generous) or Honeycomb.

**Key metrics (Prometheus-scraped):**
- `http_request_duration_seconds{endpoint, status}` (P50, P95, P99)
- `claude_cost_usd_total{coach_id, model}` (budget alerting)
- `cv_inference_cost_usd{game_id, model}` (per-game cost)
- `db_query_duration_seconds{table}` (slow query surfacing)
- `redis_cache_hits_total{cache_key_prefix}` / `redis_cache_misses_total`
- `event_bus_handler_duration_seconds{event_type}`

**Alerts (Pagerduty-style, via Grafana):**
- P95 latency > 2s for 5 min on any coach-facing endpoint
- Claude daily spend / coach > $5
- DB connection pool exhausted
- CV ingest failure rate > 5%
- Error rate > 1% on any endpoint for 10 min

---

## 11. Open questions for the software engineer

1. **In-process event bus vs Redis Streams threshold.** When do we flip? Proposed criterion: concurrent-coach count > 500 OR any handler P95 > 200ms. Validate the threshold with load tests before flipping.
2. **Clerk JWT verification caching.** JWKS round-trip per request would be disastrous. Is in-memory JWKS cache with 1h TTL sufficient, or do we need a dedicated sidecar? Measure after integration.
3. **CV frame upload failure semantics.** If a mobile client uploads 100 frames and frame 47 fails DB write, do we 207-partial-content (app stitches), or all-or-nothing with retry? Preference: all-or-nothing batched txn, but it needs a load test at year-3 scale.
4. **pgvector or not, and when.** Wiki search is "compiled knowledge, cross-linked, cited" (Karpathy pattern) — it does not need vector embeddings for MVP. But semantic "find similar plays" could be valuable. Decision: skip pgvector until a concrete feature demands it; revisit at 1k coaches.
5. **Rate limit on Claude synthesizer — per coach or per team?** A head coach running 3 teams would hit per-coach caps faster. Proposed: soft cap per coach, hard cap per Clerk org; billing upgrades raise both.
6. **Opponent provider tier precedence on conflict.** Today's design says higher tier wins. But a coach who manually overrides a public feed should stay sticky. Do manual overrides pin a field, or are they transient? Needs product input, then encode in `opponent_profile.tendencies` shape.
7. **CV frame retention vs GDPR.** A minor leaves the team mid-season. Do we delete every frame they appear in (expensive, requires face detection to identify), or rely on jersey-number tagging (imperfect)? Safer default: delete full games on request; document that frames are not individually-scoped.
8. **Migration strategy for the wiki flywheel patches.** `wiki_patch_pending` is a DB queue, but promoted patches modify files in R2. This is a distributed transaction. How do we handle a crash between "update DB status to promoted" and "commit patch to R2"? Proposed: outbox pattern with a reconciliation job.
9. **Testcontainers-pg startup time in CI.** Each integration test spinning up Postgres costs 2-3s. At 500 integration tests, that's 25 minutes per CI run. Solutions: shared container per test session, pytest-xdist parallelism, or `pg_tmp` for fast transient instances. Pick one before the suite grows.
10. **Feature flag store availability.** If Unleash is down, do requests fail-open or fail-closed? Proposed: fail-open with the last-known-good flag set cached in Redis + memory. Defines risk posture for every gated feature.

---

**End of document.** The software engineer inherits this as the hand-off for implementation. Pair with `docs/specs/architecture.md` (frontend + intent engine), `docs/specs/data-strategy.md` (flywheel + privacy), and `docs/specs/cv-roadmap.md` (CV phases) as the reading order.
