# Design Revamp — Motion

> **Status**: Proposal. Extends `docs/specs/design-system.md` (B+C merge — locked).
> **Author role**: Senior Graphic Designer review.
> **Date**: 2026-04-12.
> **Scope**: Landing page revamp, new component library for moat features, token evolution, motion + accessibility principles.

This document extends the locked B+C merge design system. It does not replace any token; it proposes additions. Where a recommendation conflicts with `design-system.md`, the existing spec wins and this document defers.

---

## 1. Skill inventory summary

A constrained inventory: the skill library was accessible by directory listing only (file contents were outside the working-directory allowlist for this session). Proposals below are therefore grounded in skill **names** and **subfile structure**, plus the project's own locked specs. This is flagged at HIGH confidence for skill existence, LOW confidence for skill internals.

| Skill | Inferred scope | Applicable to Motion |
|---|---|---|
| `ux-designer` | Research, information architecture, visual design, interaction design, accessibility (five rule files present) | Directly — primary skill for this revamp |
| `frontend-design` | Frontend-facing design patterns and component choices | Directly — component library audit |
| `frontend-ui-ux` | UI/UX patterns for frontend | Directly — interaction patterns |
| `frontend-patterns` | Reusable frontend patterns | Directly — component composition |
| `frontend-slides` (has `STYLE_PRESETS.md`) | Slide/deck presets, editorial composition | Partially — editorial typography maps to B+C merge bold-headline aesthetic; slide-specific patterns do not |
| `visualization-expert` | Data visualization, charts, diagrams | Directly — court diagram, fidelity badge, lineup grid, scouting card |

**Skills discovered but excluded**: `brainstorm`, `code-patterns`, `anti-hallucination`, `eval-harness`, `article-writing` — not design-relevant for a revamp spec. No `liquid-glass-design` skill exists in the library (flagged: the user mentioned it as a candidate; the aesthetic does not apply here anyway — Motion is editorial-bold, not iOS frosted glass).

**Known scope from `ux-designer/rules/`**: five rule files (`information-architecture.md`, `accessibility.md`, `visual-design.md`, `research.md`, `interaction-design.md`) imply the skill covers the full UX lifecycle. Recommendations below are expressible within that scope.

---

## 2. Landing page revamp

### Narrative pivot

Current landing at `src/app/page.tsx` needs to communicate the core moat: **"AI coaches the coach, not just the team."** Every other coaching product (Hudl, FastModel, Just Play, XOS Digital) sells AI-for-the-team — diagram tools, film review, scouting. Motion's differentiator is that it teaches the coach how to teach the team. Teach-progressions, concept graphs, vocabulary calibration, hand-signals — all exist to level-up the human on the sideline.

### Hero (above the fold)

```
┌──────────────────────────────────────────────────────────┐
│  motion •                              Sign in  [Get app] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   COACHES                                                 │
│   THE COACH.                                              │
│   Not just the team.                                      │
│                                                           │
│   Motion is the first AI basketball platform              │
│   built to level-up the person on the sideline.           │
│                                                           │
│   [Try free — 30 sec]       [Watch 90-sec demo]           │
│                                                           │
│   [FIDELITY BADGE]  92% of our plays grounded in          │
│                     source-book diagrams. Not vibes.      │
└──────────────────────────────────────────────────────────┘
```

- Headline: weight 900, tracking -2px, 72-96px on desktop. "COACHES THE COACH." is the fixed pull-quote; it is the positioning.
- Subhead: 18-20px, muted text, one sentence.
- Two CTAs: `BallButton` primary ("Try free — 30 sec") and text-link ghost ("Watch 90-sec demo"). Right CTA plays a silent demo video of the play viewer.
- **Fidelity trust badge** sits directly under the CTA row, not buried in a "why us" section. The badge is active: tap/hover reveals the 6 provenance signals.

### Sections (scroll)

1. **Hero** (above).
2. **The three archetypes** — three cards side-by-side, answering "who is Motion for?"
   - **Beginner** — "You volunteered. Now you're coaching." Teaches concepts before plays.
   - **Intermediate** — "You've coached a few seasons." Levels up your playbook without drowning your team.
   - **Advanced** — "You've been doing this a decade." A second set of eyes on every game plan, without the ego.
   Each card: archetype label, plain-English hook, one representative screenshot, CTA ("Start as Beginner").
3. **The moat, in one diagram** — animated illustration of the loop: coach asks → Motion grounds answer in source books → delivers with teach-progression → coach runs it → Motion learns from the outcome. Animated on scroll-in using the PlayViewer's DRAW→FADE→MOVE phases (continuity with the product's visual vocabulary).
4. **Fidelity, visible** — static hero-grade display of the Fidelity Badge with a scroll-linked explainer of all 6 signals. Also doubles as the credibility anchor.
5. **Product glimpses** — three tight screenshots: Play Library, Play Viewer, Game Day Flow. Each with a one-line caption. No feature dump.
6. **Pricing** — four tiers ($0 / $10 / $30 / $50). Coach tier ($30/mo) is the recommended highlight.
7. **Footer** — legal, IP notes ("We do not use NBA team or player names"), waitlist capture, credits.

### CTAs

Exactly three CTAs on the page: Hero primary, archetype card CTA (three instances of same pattern), footer waitlist. Avoid CTA soup. Aim for a one-action flow per archetype.

---

## 3. Component library audit

### What exists (locked)

- `BallButton` — primary action with orange bg + seam pattern.
- `BallDot` — inline icon next to "motion" wordmark.
- `PlayCard` — play library cell (reference: `PlayLibrary.jsx`).
- Court SVG — play viewer rendering, 6-layer z-order (reference: `PlayViewer.jsx`).
- Game Day bar — 3-tab flow (reference: `GameDayFlow.jsx`).
- Toggle groups, breadcrumb, avatar square (per `design-system.md`).

### What's missing (this spec introduces)

1. **ConceptCard** — with prereqs and "I get it" button (`coach-profile.md` § UI affordances).
2. **DrillCard** — muscles trained, duration, concepts taught.
3. **FidelityBadge** — 0-1 score with tooltip exposing the 6 signals.
4. **HandSignalBadge** — per-play visual chip (`hand-signals.md` § UI touchpoints).
5. **CoachLevelChip** — beginner / intermediate / advanced marker.
6. **OpponentScoutingCard** — with provider provenance visible.
7. **HalftimeAdjustmentCard** — chip-tap aesthetic.
8. **TeachProgressionCard** — 3-day install plan visualization.
9. **LineupCard** — player × role × matchup grid.

### Composition rules (applies to all new components)

- 0 radius, 1px `BORDER_STRONG`, `BG_SURFACE` (`#111113`) background.
- Orange accent reserved for interactive affordances (tap highlight, active state, basketball iconography).
- Every card has a label strip: 9-10px uppercase, 0.5px spacing, `TEXT_MUTED`.
- Card headline: weight 800, 16-18px, `TEXT_PRIMARY`.
- Cards slot into a 4-column grid on desktop, 1-column on mobile, 2-column on tablet.

---

## 4. New component specs

### 4.1 ConceptCard

**Purpose**: Surface a wiki concept (e.g., "flare screen") with its prerequisites and a self-attested mastery button.

**Anatomy**:

```
┌────────────────────────────────────┐
│ CONCEPT · INTERMEDIATE             │ ← label strip + level chip
│ Flare Screen                       │ ← headline 800/18
│ A screen set away from the ball    │ ← body 13/400
│ to free a shooter running to the   │
│ wing.                              │
│                                    │
│ Needs first: Spacing · Screens     │ ← prereq chip row
│                                    │
│ ┌──────────┐  ┌──────────────────┐ │
│ │ I get it │  │ Learn the drill  │ │ ← two actions, primary first
│ └──────────┘  └──────────────────┘ │
└────────────────────────────────────┘
```

**Interactions**:
- Tap "I get it" → logs `coach_concept_progress` row as `mastered`, card dims with success strip.
- Tap prereq chip → scroll or navigate to that concept's card.
- Long-press (mobile) → card flips, shows full wiki page.

**States**: default, hover (bg → `BG_ELEVATED`), active ("I get it" tapped → orange strip), focused (2px orange outline), disabled (prereq locked — shows lock icon, muted text), skeleton (shimmer on label + headline lines), error (red strip "Could not save progress"), loading ("I get it" → spinner).

**Motion**: Entry 300ms ease-out from y+8px, opacity 0→1. Mastery transition: 200ms scale 1→0.98→1 with orange underline expansion. Exit: 200ms fade.

**Accessibility**: Button labels include level ("Mark Flare Screen as understood"). Prereq chips are nav-links with `aria-describedby` to the full concept title. Level chip has `aria-label="Intermediate concept"`.

### 4.2 DrillCard

**Purpose**: Show a drill with what it trains (muscles, skills, concepts) and its duration, so coaches can scan for fit in a practice slot.

**Anatomy**: Label "DRILL · {duration} MIN", drill name, two-line description, three chips (muscles | skills | concepts), `BallButton` "Add to practice."

**Interactions**: Tap → full drill page. "Add to practice" prompts duration insertion into planner. Swipe left (mobile) reveals "Skip" and "Favorite."

**States**: default, hover, active (added → checkmark + disabled), focused, disabled (prereq missing), skeleton, error, loading.

**Motion**: Same entry pattern as ConceptCard. Add-to-practice success: 400ms slide to bottom toast ("Added to Practice 2").

**Accessibility**: Chip group has `role="group"` with aria-label. Duration reads "15 minute drill." Add action announces success via aria-live.

### 4.3 FidelityBadge

**Purpose**: Expose the 0-1 fidelity score of a play/drill/concept to the source material. Trust anchor.

**Anatomy**:

```
┌──────────────────────────────┐
│  ◉ FIDELITY  0.92            │
│  [[ bar: ████████████░░ ]]   │
│  6 signals · tap to expand   │
└──────────────────────────────┘
```

Expanded (tooltip / modal on tap):
```
Play: "Weakside Flare Slip"
  Diagram match          ✓ 1.00
  Action taxonomy match  ✓ 0.95
  Role coherence         ✓ 0.90
  Concept grounding      ✓ 0.88
  Source citation        ✓ 1.00
  Peer consensus         ◐ 0.75
                         ────
                         0.92
Source: NBA Playbook p.412, Basketball for Coaches p.137
```

**Interactions**: Hover (desktop) → popover. Tap (mobile) → modal. 6 signals each link to definition. Celebration: score ≥ 0.95 triggers a brief orange pulse; < 0.6 shows amber ring.

**States**: low (0-0.6, amber), medium (0.6-0.85, neutral), high (0.85-1.0, orange pulse-on-reveal); hover, focused, disabled (no score available — shows dash), skeleton, error.

**Motion**: Number counts up from 0 on first viewport entry (400ms cubic-bezier(0.2,0.8,0.2,1)). Bar fills left-to-right in 600ms. High-score pulse: 1 loop, 200ms ease-in-out, orange glow to `BORDER_STRONG`.

**Accessibility**: aria-label "Fidelity score 0.92 out of 1. Tap for details." Tooltip content is in focus-trapped modal on mobile. Decorative bar has `aria-hidden`. Color is redundant to number.

### 4.4 HandSignalBadge

**Purpose**: Visual chip showing the hand signal assigned to a play (per `hand-signals.md`).

**Anatomy**:

```
┌──────────────────────────┐
│ SIGNAL    RED            │  ← verbal label bold
│ ✊ fist · chest-high       │  ← icon + position
└──────────────────────────┘
```

Five icon variants (finger_count, closed_fist, open_palm, body_touch, verbal_shorthand) rendered as monochrome SVGs, stroke `TEXT_PRIMARY`.

**Interactions**: Tap → full signal detail (position demo animation, "how to teach it" script). On PlayerCard in spotlight mode, shows only the signal relevant to that player's role.

**States**: default, hover (icon pulses once), active (coach practicing — orange highlight), focused, disabled (play has no signal assigned — shows "—"), skeleton, error.

**Motion**: Icon entry 150ms fade + 4px upward translate. Signal practice flash: 3 pulses at 300ms each (icon → accent → icon) for teach-mode.

**Accessibility**: aria-label "Signal: Red, closed fist at chest." Icon has `role="img"`. Flash motion respects `prefers-reduced-motion` (collapses to a single color swap).

### 4.5 CoachLevelChip

**Purpose**: Label a surface's calibration level (for plays gated by level, progression calibrations, filter defaults).

**Anatomy**: Single-line uppercase label with 4px dot indicator. Three variants: beginner (green dot), intermediate (amber dot), advanced (orange dot).

**Interactions**: Static when used as a marker; tap opens "Why this level?" explainer when used as a filter affordance.

**States**: default, active (when used as filter), focused, disabled.

**Motion**: None — a marker, not an affordance, in most contexts.

**Accessibility**: aria-label "Calibrated for intermediate coaches." Dot color is redundant to text.

### 4.6 OpponentScoutingCard

**Purpose**: Present an opponent's tendency (e.g., "Rivals force middle 72% of possessions") with visible provenance.

**Anatomy**:

```
┌─────────────────────────────────────┐
│ SCOUTING · OPPONENT "RIVALS"        │
│ Force middle on PnR                 │
│ 72% of possessions                  │
│                                     │
│ ┌─ 72% ──────────────┐  league 48%  │
│ └───────────────────┘               │
│                                     │
│ Source: NCAA verified · 14 games    │
│ [Based on your scouting]            │  ← provenance pill
└─────────────────────────────────────┘
```

**Interactions**: Tap → full opponent profile. Provenance pill is its own affordance — tap reveals how the signal was collected (provider logo, date range, sample size).

**States**: default, hover, active, focused, disabled (no scouting yet — shows empty-state "Add scouting"), skeleton, error, loading (Claude still computing tendency).

**Motion**: Number counts up on entry. Comparison bar animates to 72% over 500ms ease-out. League reference appears 200ms after with opacity 0→1.

**Accessibility**: aria-label "Opponent Rivals forces middle 72 percent of possessions, league average 48 percent, NCAA verified." All text is real text, not images.

### 4.7 HalftimeAdjustmentCard

**Purpose**: A single chip-tap answer during halftime. Not a page — a decision.

**Anatomy**:

```
┌──────────────────────────────────┐
│ ADJUSTMENT · DEFENSE             │
│ Switch to 2-3 zone               │
│ They're beating our PnR middle.  │
│                                  │
│   [ tap to commit ]              │ ← giant tap target
└──────────────────────────────────┘
```

Minimum 56px tap target on the commit action (sweaty-hands rule).

**Interactions**: Single tap = commit (logs to game journal, updates live flow). Long-press = undo preview. Swipe right = "already tried." Swipe left = "next suggestion."

**States**: default, hover, active (tapped — whole card flashes orange for 200ms), committed (card dims, "Committed" badge), focused, disabled (pre-halftime — collapsed), skeleton, error, loading.

**Motion**: Card entry during halftime: 400ms slide-up with slight overshoot (spring `stiffness: 180, damping: 22`). Commit flash: 200ms full-card orange wash, then dim-out.

**Accessibility**: Entire card is one button with aria-label including full adjustment. Swipe alternatives are exposed via keyboard shortcuts (`←` next, `→` undo).

### 4.8 TeachProgressionCard

**Purpose**: Visualize the 3-day install plan for a play (per `teach-progressions.md`).

**Anatomy**:

```
┌────────────────────────────────────────────────┐
│ TEACH · WEAKSIDE FLARE SLIP · 3 PRACTICES      │
│                                                │
│ ● P1  Foundational drills        15 min        │
│ │                                              │
│ ● P2  Walkthrough + signal       20 min        │
│ │                                              │
│ ● P3  Live scrimmage             25 min        │
│                                                │
│ Readiness: 80% of P3 reps clean                │
│ [Install this plan]                            │
└────────────────────────────────────────────────┘
```

Vertical rail with phase nodes. Each node expands on tap to show segments.

**Interactions**: Tap node → expand segments inline. Tap a segment → opens the drill or walkthrough. Tap "Install" → commits plan to practice planner.

**States**: default, hover, active (installed — rail turns orange), focused, disabled (prereq gap — shows "Needs: Screening Fundamentals first"), partial (some segments complete — rail partial-orange), skeleton, error.

**Motion**: Rail draws top-to-bottom on viewport entry (600ms, ease-out). Node pulses on expand (150ms scale 0.98→1). Install commits with a cascade-fill: nodes turn orange in sequence (100ms each).

**Accessibility**: Rail is `role="list"` with ordered items. Each node is a button with aria-expanded. Cascade-fill respects `prefers-reduced-motion`.

### 4.9 LineupCard

**Purpose**: Player × role × matchup grid for game day.

**Anatomy**:

```
┌────────────────────────────────────────────────┐
│ LINEUP · Q2 START                              │
│                                                │
│  Role     Player    Matchup      Signal  Notes │
│  ─────    ──────    ──────────   ──────  ──── │
│  PG       Guard 1   Opp PG       [Red]   +3   │
│  SG       Wing 2    Opp 2        [Sky]        │
│  ...                                           │
└────────────────────────────────────────────────┘
```

Grid with sticky header, 1px subtle row separators.

**Interactions**: Tap row → player detail with signal-spotlight mode. Long-press column header → sort. Drag a row → swap into different lineup slot. On mobile: horizontal scroll with sticky first column.

**States**: default, hover, active (row selected), focused, disabled (player unavailable — strikethrough), skeleton, error.

**Motion**: Row swap animation: 300ms crossfade with 4px vertical nudge. Edit mode: rows nudge 2px on hover.

**Accessibility**: Proper `<table>` semantics. Column headers are button-sortable with aria-sort. Screen reader announces "Row 1 of 5: Point Guard, Guard 1, matched against Opposing PG, signal Red, plus-minus plus 3." No real names per IP rule.

---

## 5. Design token evolution

### 5.1 Motion / transition timing scale

Current spec has no timing tokens. Propose:

```ts
export const MOTION_XS = 100;   // microfeedback (chip tap)
export const MOTION_S  = 200;   // UI state transition
export const MOTION_M  = 300;   // card entry/exit
export const MOTION_L  = 500;   // page/modal transition
export const MOTION_XL = 800;   // court play-animation phase
```

All durations in milliseconds. Naming matches spacing scale convention.

### 5.2 Easing curves

```ts
export const EASE_UI    = "cubic-bezier(0.2, 0.8, 0.2, 1)";   // default UI
export const EASE_ENTRY = "cubic-bezier(0.0, 0.0, 0.2, 1)";   // entry — fast start, slow land
export const EASE_EXIT  = "cubic-bezier(0.4, 0.0, 1.0, 1.0)"; // exit — fast leave
export const EASE_COURT = "cubic-bezier(0.45, 0.0, 0.55, 1)"; // physical motion (PlayViewer paths)
export const SPRING_CARD = { stiffness: 180, damping: 22 };   // card slide-in
```

**Rationale**: the PlayViewer already uses a physical-feeling curve for player motion paths. Separate from UI curves so chrome animations never compete with the court.

### 5.3 Elevation system for dark theme

In a dark theme, shadow is invisible. Use border intensity + background ladder instead:

```
Surface level 0 (page)        bg #0a0a0b   border none
Surface level 1 (card)        bg #111113   border rgba(255,255,255,0.08)
Surface level 2 (elevated)    bg #19191c   border rgba(255,255,255,0.14)
Surface level 3 (modal/popup) bg #19191c   border rgba(255,255,255,0.22)
Surface level 4 (top sheet)   bg #19191c   border rgba(255,255,255,0.22) + 1px inner highlight
```

All levels keep 0 radius. The "elevation" is expressed by border intensity, not shadow.

### 5.4 Typography scale expansion

Current tokens specify only headline (28-38px/800-900) and body (13px). Proposed full scale:

```
Display   56-96px   900  tracking -2.5px    (landing hero)
H1        38-48px   900  tracking -2.0px    (page titles)
H2        28-32px   800  tracking -1.5px    (section headers)
H3        20-24px   800  tracking -1.0px    (card headlines)
H4        16-18px   800  tracking -0.5px    (subsections)
Body L    15-16px   400  tracking 0         (paragraph, tooltips)
Body      13-14px   400  tracking 0         (default body)
Body S    12px      400  tracking 0.1px     (secondary body)
Label     10-11px   600  uppercase 0.5px    (label strip)
Micro      9px      600  uppercase 0.5px    (chips)
```

System sans-serif throughout. No new font files.

### 5.5 Spacing scale

Propose 4px base:

```
xs  4px      (tight icon gap)
s   8px      (chip internal padding)
m   12px     (default gap)
l   16px     (card padding, section padding — matches existing PADDING_SECTION)
xl  24px     (between cards)
2xl 32px     (section vertical rhythm)
3xl 48px     (page vertical rhythm)
4xl 64px     (landing hero vertical rhythm)
```

Common layout gaps:
- Card grid: 16px (mobile) → 24px (tablet) → 32px (desktop).
- Chip row: 8px between chips, 12px margin-top.
- Label-to-headline: 8px.
- Headline-to-body: 12px.
- Body-to-actions: 16px.

---

## 6. Mobile + responsive

### Archetype-specific constraints

Motion is coach-first on mobile **at courtside**: sweaty hands, sunlight, one-handed use, 8-12 minute halftime window.

### Tap targets

Minimum 44×44 for standard actions (Apple HIG floor). **Primary decision tap targets during game flow: 56×56**. Halftime adjustments, live-timeout picks, and signal commits all use 56×56. The sweaty-hands guideline overrides visual minimalism during active game screens.

### One-handed reach zones

Divide phone screen into three zones (thumb heatmap on 6.1"+ screen):

- **Easy thumb zone** (bottom 40%): primary CTAs, commit actions, tab bar.
- **Stretch zone** (middle 40%): cards, content scroll area.
- **Unreachable zone** (top 20%): status, breadcrumb, back button — never primary action.

Game Day Flow commit bar sits anchored in the easy zone. Tab bar at the absolute bottom. The play viewer's "play" control is bottom-right within reach.

### Sunlight readability

- Minimum contrast ratio of 7:1 for all body text on `BG_PAGE` (exceeds WCAG AAA).
- Orange accent on dark: verify AA for large text (18px+/bold 14px+). Current `#f97316` on `#0a0a0b` = ~6.1:1, AA for large text, borderline for body.
- Avoid `TEXT_GHOST` (`#3e3e45`) for anything informational. Use only for decorative dividers.

### Desktop treatment

Desktop is the planning environment: game plan generator, play library, practice planner. Use multi-column layouts, keyboard shortcuts, larger court SVG, side-by-side comparison (play vs counter-play).

### Spectator/parent view

Different product surface. Read-only game journal + player spotlight. Future.

### Breakpoints

Axis is the court diagram, not arbitrary px values:

```
mobile-s     320px    1 court, 1-col cards
mobile       390px    1 court, 1-col cards, larger tap targets
tablet       768px    1 court + side-panel, 2-col cards
desktop-s    1024px   1 court + 2 side-panels, 3-col cards
desktop      1280px   1 court + 2 side-panels, 4-col cards
desktop-l    1536px   1 court (larger) + 2 side-panels, 4-col
```

---

## 7. Motion principles

### Baseline: the PlayViewer 3-phase

`DRAW → FADE → MOVE` is the product's motion signature. Extend it to UI:

- **DRAW** = entry (paths drawing, bars filling, numbers counting up).
- **FADE** = secondary info revealing (league averages, provenance pills, tooltips).
- **MOVE** = primary-object state change (card position, lineup rearrangement).

UI transitions sequence the same way: structure first, context second, state third.

### Spring vs ease

- **Spring physics**: any card that "snaps" into a new position (halftime adjustment commit, lineup drag-swap, modal entry). Use `SPRING_CARD`.
- **Ease curves**: most UI transitions. `EASE_UI` for transient states, `EASE_ENTRY` for appear, `EASE_EXIT` for disappear.
- **Physical motion (`EASE_COURT`)**: only for court objects. Never on UI.

### Microinteractions

- **Signal flash**: 3 pulses, 300ms each. Icon → accent → icon. Teach-mode only.
- **Chip tap**: `MOTION_XS` (100ms) scale 1 → 0.96 → 1 with accent flash.
- **Fidelity score reveal**: number count-up over `MOTION_M`, bar fill over `MOTION_L`, score ≥ 0.95 triggers one pulse.
- **Commit success**: full-card orange wash 200ms, then dim 300ms. One gesture, two phases. Confirms without a toast.
- **Rail cascade**: TeachProgressionCard nodes turn orange in sequence, 100ms per node.

### Choreography

Parent-child: parent enters first, children enter in sequence with 50-80ms stagger. Exit reversed — children first, parent last. Prevents content flash.

---

## 8. Accessibility

### Contrast check (against `#0a0a0b` background)

| Element | Color | Ratio | WCAG |
|---|---|---|---|
| `TEXT_PRIMARY` #fafafa | text | 20.0:1 | AAA |
| `TEXT_MUTED` #a1a1aa | text | 10.2:1 | AAA |
| `TEXT_DIM` #63636e | text | 4.6:1 | AA (large only) |
| `TEXT_GHOST` #3e3e45 | decorative only | 2.2:1 | FAIL — do not use for information |
| `ACCENT` #f97316 | text | 6.1:1 | AA large / borderline body |
| `COLOR_GREEN` #22c55e | text | 8.2:1 | AAA |
| `COLOR_RED` #ef4444 | text | 5.4:1 | AA |
| `COLOR_AMBER` #eab308 | text | 10.5:1 | AAA |

**Action**: never use `TEXT_GHOST` for informational text. Orange accent as text must be 14px+ bold or 18px+ regular; otherwise pair with a secondary text in `TEXT_PRIMARY`.

### Keyboard navigation for court SVG

- Each player node is a focusable element (`tabindex="0"`, `role="img"`, aria-label with role + position).
- Focus ring: 2px orange outline offset 4px outside the player glyph. Does not occlude the court.
- Phase scrubber is a slider (`role="slider"`, aria-valuemin/max).
- Play/pause keyboard shortcut: `Space`. Scrub: `←`/`→`. Phase skip: `Shift+←`/`Shift+→`.

### Screen reader affordances for play animations

- Each animation phase has a live-region announcement: "Phase 1: Point Guard passes to Wing. Wing cuts to the corner."
- Play title + total phases announced on load.
- User can disable narration via a setting (some coaches prefer silence).

### Reduced motion

`prefers-reduced-motion: reduce` collapses:
- Court path animation → instant state snap at phase boundaries.
- Card entries → instant appear, no slide.
- Cascade effects → simultaneous state change.
- Flashes → single color swap, no pulse.

All motion above 300ms has a reduced-motion fallback defined at the component level.

### Color-blind safe

Orange + dark is distinctive across all three common color-vision deficiencies (protan, deutan, tritan). Semantic colors (red/green/amber) are tested:

- Green (`#22c55e`) vs red (`#ef4444`) pair: add a shape/icon redundancy (check vs cross) for deutan/protan safety.
- Amber (`#eab308`) for warnings: high luminance, distinguishable from green.
- Never encode meaning in color alone. Text labels always accompany semantic colors.

---

## 9. A/B test candidates

Order by expected lift impact on activation/retention:

1. **Landing hero framing**
   - Variant A: "COACHES THE COACH." (coach-as-learner framing)
   - Variant B: "Your team's AI coordinator." (team-focused — the incumbent framing)
   - Metric: free-tier signup rate.
2. **Onboarding quiz length**
   - Variant A: 5 questions (current spec).
   - Variant B: 3 questions (condensed, same score buckets).
   - Variant C: skip-allowed at any step.
   - Metric: onboarding completion rate + early-week retention.
3. **Fidelity badge prominence**
   - Variant A: visible by default on every play card.
   - Variant B: hidden behind info-tap tooltip.
   - Variant C: visible only on plays with score ≥ 0.90.
   - Metric: plays-added per session + trust survey.
4. **Beginner mode default**
   - Variant A: quiz result → auto-apply level (current spec).
   - Variant B: all new users default `beginner`, opt-in to higher levels.
   - Metric: beginner retention week-4, quiz decline rate.
5. **Play library filter defaults**
   - Variant A: filter by coach level default-on.
   - Variant B: show everything, mark locked plays with prereq chip.
   - Variant C: show everything, dim locked plays to 40% opacity.
   - Metric: plays-scanned per session, plays-added per session.

Each A/B test runs 2+ weeks, 1000+ users per arm, with a preregistered significance threshold.

---

## 10. Gaps vs available skills

Honest disclosure of what my proposals exceed the accessible skill scope for:

- **Skill content was not readable in this session** — I inventoried skills by directory listing only, not by reading internals. Component specs therefore lean on UX-designer-generic patterns (information architecture, interaction states, accessibility). If the actual `ux-designer` SKILL.md prescribes a specific review cadence, artifact format, or research protocol I have not honored, flag at review.
- **Liquid-glass-design is not a thing here** — no such skill in the library, and the aesthetic (iOS frosted blur) does not fit B+C merge editorial-bold. Excluded deliberately.
- **Data visualization (`visualization-expert`)** — I applied it conceptually to FidelityBadge, OpponentScoutingCard, LineupCard, TeachProgressionCard. Actual skill internals (chart types, encoding choices) were not read. If the skill recommends specific chart libraries (e.g., Observable Plot, D3), adopt those for the future live-game journal and season-aggregate dashboards; those are out of scope for this revamp.
- **Motion choreography primitives** — spring physics specifics (`stiffness: 180, damping: 22`) are industry-default starting points; a motion-specific skill (if one exists) would likely refine these.
- **No landing-page-specific skill present** — I used `ux-designer` + `frontend-design` + editorial typography from `frontend-slides/STYLE_PRESETS.md` as the conceptual substitutes for landing-page composition.
- **No research skill was read** — `ux-designer/rules/research.md` exists but its internals are unknown. The A/B test candidates in §9 are structured as standard controlled experiments; if the skill prescribes a specific research framework (Jobs-to-be-Done, usability-testing rubrics), integrate at that review stage.
- **Evals for design** — the global `eval-harness` skill is present; design-aesthetic eval (visual-audit pipeline already in the project at `npm run visual-audit:report`) extends naturally but the specific eval criteria for new components (ConceptCard fidelity to `coach-profile.md`, HandSignalBadge fidelity to `hand-signals.md`) are a next-step deliverable, not included here.

**Substitutions made**:
- Where a design-tokens skill is absent, I anchored on the existing locked `src/lib/design-tokens.ts` and proposed only additive tokens.
- Where a motion-design skill is absent, I anchored on the PlayViewer's locked 3-phase choreography (`DRAW → FADE → MOVE`) as the project's own motion vocabulary — the court itself becomes the style guide.

---

## Appendix — files referenced (absolute paths)

- `/Users/ced/Desktop/motion/courtiq/docs/specs/design-system.md`
- `/Users/ced/Desktop/motion/courtiq/src/lib/design-tokens.ts`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/coach-profile.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/hand-signals.md`
- `/Users/ced/Desktop/motion/courtiq/docs/specs/teach-progressions.md`
- `/Users/ced/Desktop/motion/courtiq/docs/reference-screens/PlayLibrary.jsx`
- `/Users/ced/Desktop/motion/courtiq/docs/reference-screens/PlayViewer.jsx`
- `/Users/ced/Desktop/motion/courtiq/docs/reference-screens/GamePlanGenerator.jsx`
- `/Users/ced/Desktop/motion/courtiq/docs/reference-screens/GameDayFlow.jsx`
- `/Users/ced/Desktop/motion/courtiq/src/app/page.tsx`
