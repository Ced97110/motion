
## 17. Competitive Landscape

| Tool | Gap we fill |
|------|-------------|
| Hoops Geek | No AI, no knowledge base, no game planning, no development tracking |
| FastDraw | $150/yr, dated UI, no AI, no interactive teaching |
| Synergy Sports | Enterprise pricing, not accessible to youth coaches |
| Second Spectrum | NBA only, requires tracking cameras |
| Hudl | No AI coaching intelligence, no interactive sims |
| HomeCourt | No tactical coaching, no play knowledge |
| CourtBook | No AI, no knowledge base, no development tracking |

**Our moat**: Expert content wiki + intent-driven AI + interactive diagrams + gamified development + proprietary youth data flywheel.

---

## 18. Content Licensing

Three-tier approach for source material:

**Tier 1 — Can't use**: NBA player photos, book illustrations, published diagrams. Extract the KNOWLEDGE, discard the image.

**Tier 2 — Build from knowledge**: Custom SVG court animations, interactive body position models, AI-generated exercise illustrations.

**Tier 3 — Better than the book**: Interactive simulations, draggable defenders, animated plays, personalized AI coaching. The book tells you about help defense — our app lets you practice it.

---

## 19. Pricing

| Tier | Price | For | Includes |
|------|-------|-----|----------|
| Free | $0 | Trial | 10 plays/mo, basic search, no roster |
| Player | $10/mo | Individual players | Full library, archetypes, all drills, XP/badges |
| Coach | $30/mo | Team coaches | AI game plans, roster, practice planner, stat tracking, team sharing |
| Program | $50/mo | Multi-team programs | Multiple rosters, analytics, priority support |

---

## 20. Source Materials

7 PDFs, 2,440 total pages. All at `/mnt/user-data/uploads/`:

1. Let's Talk Defense — Herb Brown (274pg)
2. Basketball Anatomy (200pg)
3. Offensive Skill Development (200pg)
4. Basketball For Coaches (200pg)
5. Basketball Skills & Drills (239pg)
6. 2018-19 NBA Playbook (934pg)
7. NBA Coaches Playbook — NBCA (371pg)

---

## 21. Tech Stack

**Web app**: Next.js 14+ (App Router), Tailwind CSS, Vercel
**SVG rendering**: Custom React components (play viewer, court diagrams)
**AI**: Claude API for wiki queries + intelligence engine
**Database**: Supabase / Postgres
**Mobile (CV)**: React Native with react-native-vision-camera + MediaPipe
**ML models**: YOLOv8, MediaPipe BlazePose, TensorFlow Lite

---

## 22. Build Priority

1. **Intent engine + signal system** — the core architecture
2. **Knowledge wiki** — ingest 7 PDFs, build the brain
3. **Play viewer atom** — v12 quality, the flagship visual
4. **Landing page** — with auto-playing hero animation
5. **Coach game day assembly** — highest-value intent
6. **Coach practice day assembly** — second highest-value intent
7. **Play library** — browse mode fallback (coach landing page)
8. **Player experience** — separate app with role-based plays
9. **AI game plan generator**
10. **Defense simulator**
11. **Body lab / physical layer**
12. **Drill lab / practice planner**
13. **Knowledge search**
14. **Live stat tracking** — data collection + flywheel
15. **Gamification layer** — archetypes, XP, badges, skill trees
16. **Computer vision** — companion mobile app (Phase 1)

---

## 23. Reference Implementations

| File | What | Lines |
|------|------|-------|
| `courtiq-v12.jsx` | Play viewer — production reference | 389 |
| `landing-page.jsx` | Landing page with embedded auto-playing hero | 313 |
| `DESIGN-SYSTEM.md` | Full aesthetic specification | ~120 |
| `karpathy-llm-wiki.md` | Karpathy's original LLM wiki pattern | ~200 |
| `SPORTSETT_INTEGRATION.md` | 10-step dataset integration pipeline | ~800 |
| `courtiq-v1→v11.jsx` | Play viewer iteration history | ~6,800 |
| `courtiq-gameday.jsx` | Game day flow prototype | ~500 |
| `courtiq-gameplan.jsx` | Game plan generator prototype | ~500 |

### Hoops Geek — Deep Reverse Engineering (10-probe investigation)

**Their stack**: React + Material-UI + Pure Inline SVG. No animation library (GSAP detected in bundle but not used for court animation). SVG `viewBox="-28 -3 56 50"`. ~196 rect tiles with seeded fills. Players as `<text>` font-size 70 in 300×300 viewBox. Ball handler circle r=1.48 with strokeWidth 7.

**Critical finding: Hoops Geek has NO animation engine.** Their editor is a pure state-swap system:
- Editing: 100% manual drag. `onPointerMove` updates `cx`/`cy` at 60fps. No interpolation.
- Phase switching: instant state swap. Clicking "Next" creates a new phase snapshot — players do NOT animate between phases.
- Playback: if it exists, it's behind a separate viewer URL we couldn't access. Likely a basic linear lerp at most.
- Paths: static SVG `<path>` elements drawn between phase-to-phase coordinates. Not animated.

**Their architecture worth adopting (for our play EDITOR, not viewer)**:
- `data-register="true"` on court background → "you can drop things here"
- `data-team="offense"` / `data-team="ball"` on players → team identification
- `data-transform-origin="11px 6px"` → rotation pivot point
- `cx`/`cy` as position source of truth, `transform` for drag-delta and rotation only
- Global event delegation (single listener on window, not per-element)
- State Store: JSON object of player coordinates per Phase (snapshot model)

**What Motion has that Hoops Geek does not**: Bézier path-following animation, 3-phase DRAW→FADE→MOVE choreography, ghost trails with persistent markers, ball physics (travel/catch/pulse), branching reads (play forks based on defense), spotlight mode (second-person coaching), ghost defense (reactive defenders), coaching text synchronized to animation phase. Motion is a teaching engine; Hoops Geek is a whiteboard.

### Updated reference implementations

| File | What | Lines |
|------|------|-------|
| `screen-play-viewer-v4.jsx` | Play viewer — 3 game-changers + ghost fix (LATEST) | ~470 |
| `screen-play-viewer-v3-fixed.jsx` | Play viewer — branch prompt fix | ~460 |
| `screen-gameplan-generator.jsx` | Game plan generator — B+C merge | ~280 |
| `motion-BC-merge-v2.jsx` | Play library — B+C merge with seam buttons | ~350 |
| `courtiq-v12.jsx` | Play viewer — original v12 engine | 389 |
| `landing-page.jsx` | Landing page with auto-playing hero | 313 |
| `DESIGN-SYSTEM.md` | Aesthetic spec (needs B+C merge update) | ~120 |
| `karpathy-llm-wiki.md` | Knowledge architecture | ~200 |
| `SPORTSETT_INTEGRATION.md` | Dataset pipeline | ~800 |
