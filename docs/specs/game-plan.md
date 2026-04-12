## 6. AI Intelligence Engine

### Play Recommendation Engine

Roster assessment (9 attributes rated 1-10) → identify team strengths/weaknesses → query wiki for matching plays → filter by skill requirements (team CAN execute) → rank by situation (opponent weaknesses) → deliver as animated diagrams with explanation of WHY each play fits.

### Game Plan Generator — Atomic Workflow

**What it does**: Coach says "we play Lincoln Friday" → AI delivers a complete game plan. Five phases, 17 atomic steps.

#### Phase 1 — Entry (2 steps)

**1.1 Entry path detection.** Three ways in:
- Intent engine auto-load: game day detected from schedule → coach opens app → lands directly on game plan with opponent pre-filled. Zero clicks.
- Manual nav: coach clicks Game IQ → Game plan. No context yet — input prompt shown.
- Deep link: coach clicks "Generate game plan" from roster page or schedule page. Context pre-filled from source.

**1.2 Context inventory.** Before rendering, system checks five data signals:
- Own roster (at least 5 players with attribute ratings?) — BLOCKER if missing
- Schedule (game on calendar? opponent name + date auto-fill)
- Opponent data (previously scouted? quick-scout answers? full roster?)
- Game history (played this team before? past box scores available?)
- Playbook size (how many plays saved? AI needs plays to recommend from)

#### Phase 2 — Input collection (4 steps)

**2.1 No roster → onboarding gate.** Only true blocker. Show interactive demo game plan using sample data. Persistent banner: "Add your 5 starters to unlock your game plan." Direct link to roster setup (2 min). Auto-redirect back after setup.

**2.2 Roster exists, no opponent → input prompt.** Header shows text input: "Who are you playing?" Type-ahead against known teams. "New team" option. Optional date/home-away. Skip option: "Generate a general plan based on my team" → L2 strength-based plan.

**2.3 Quick scout — 60-second opponent profile.** Five chip-tap questions (NOT a form), one at a time, large tappable pills:
- Q1 Style: "How do they play?" → Fast pace / Slow half-court / Mixed
- Q2 Offense: "Main action?" → Pick and roll / Post-ups / Motion / Isolation
- Q3 Defense: "What defense?" → Man-to-man / Zone / Both
- Q4 Threat: "Best player is a..." → Guard / Wing / Big
- Q5 Weakness: "Weakest area?" → Perimeter D / Interior D / Rebounding / Transition

Every question skippable. Each answer is a SIGNAL, not a hard constraint. Coach can skip entire scout for strength-based plan.

**2.4 Playbook check.** <5 plays: AI recommends from global library filtered by team skill level, with banner to add plays. 5+ plays: AI recommends from coach's own playbook first, supplements from global. Coach's plays get "From your playbook" badge.

#### Phase 3 — Generation (3 steps)

**3.1 Intelligence level assessment:**
- L4 Full: roster + opponent roster + game history + scouting stats. All sections fully populated.
- L3 Partial: roster + opponent name + quick scout answers. AI infers profile. Confidence hedging: "Based on your scouting..."
- L2 Roster only: strength-based plan. "Your team excels at X, here are plays that leverage that."

**3.2 AI prompt assembly.** Includes: roster with 9-attribute ratings, opponent profile (full/partial/none), playbook with skill requirements, game history, level/age calibration, season context.

**3.3 Loading state.** 3-8 seconds. Skeleton layout matching output shape. Progressive text: "Analyzing opponent..." → "Matching plays..." → "Building defensive scheme..." Content streams section by section. No spinner.

#### Phase 4 — Review + edit (5 steps)

**4.1 Confidence indicators** per section. L4: no badge, stats cited directly. L3: amber badge "Based on your quick scout." L2: blue badge "Based on your team strengths."

**4.2 Play list** — drag to reorder, click to expand (WHY + mini court + "Open viewer"), remove, "+ Add from library" (pre-filtered by opponent weakness), replace. Fit percentage recalculates on changes.

**4.3 Matchups** — tap to reassign defender, edge badge recalculates, coaching note updates, "Reset to AI" per row.

**4.4 Defense** — toggle between schemes (Man ICE / Man switch / Man drop / 2-3 zone / 1-3-1 / Match-up). AI regenerates adjustments for new scheme.

**4.5 Upgrade prompts** (non-intrusive, bottom of sections). L2→L3: "Enter opponent name for targeted plan." L3→L4: "Add their roster for better matchups." Post-game: "Log stats to improve next time."

#### Phase 5 — Action (4 steps)

**5.1 Share with team** — each player sees ONLY their matchup + their role (spotlight mode auto-activated). Push notification. Read receipts for coach.

**5.2 Export PDF** — one-page summary + detailed play pages + defensive checklist. Clipboard-formatted for coaches.

**5.3 Start game day mode** — transitions to Game Day Flow screen with all context carried over. Pre-game tab pre-loaded, halftime chips pre-loaded from scouting intel. Zero re-entry.

**5.4 Save + revisit** — auto-saves to Game IQ → Past game plans. Searchable by opponent/date/outcome. Post-game annotations feed back into next plan. Data flywheel: generate → play → log → better plan next time.

### Opponent Intelligence Architecture — Provider Pattern

**Design rule**: No screen, component, or AI prompt ever asks "where did this data come from?" They all consume the same `OpponentProfile` interface. The provider layer handles sourcing, merging, confidence scoring, and caching. Screens only see the output.

#### OpponentProfile Interface

```typescript
interface OpponentProfile {
  team_name: string;
  play_style?: "fast" | "slow" | "mixed";
  primary_offense?: "pnr" | "post" | "motion" | "iso";
  defense_type?: "man" | "zone" | "both";
  best_player?: { position: string; number?: string; name?: string };
  weakness?: "perimeter_d" | "interior_d" | "rebounding" | "transition";
  roster?: OpponentPlayer[];
  game_history?: BoxScore[];
  tendencies?: { pnr_frequency?: number; transition_rate?: number; zone_usage?: number };
  advanced_stats?: Record<string, number>;
  confidence: number;          // 0.0–1.0, computed from data completeness
  sources: ProviderSource[];   // provenance for UI display
}
```

#### Four Providers (priority order)

**P1 Manual (ship now, active).** Coach enters data via quick-scout or full roster input. Post-game stat logging. Source label: "Based on your scouting."

**P2 Community (build next).** Anonymized data from other Motion coaches who played this team. Aggregated box scores, computed tendencies. Source label: "Based on N games tracked." Privacy: all data opt-in, coach names never shared, only aggregated stats.

**P3 Public data (opportunistic).** MaxPreps, state athletic association stats, tournament results. Season records, rosters, box scores, rankings. Source label: "MaxPreps" / "state association." Legal: public data only, API partnerships preferred.

**P4 Institutional API (partnership).** NCAA, FIBA, national federations, Genius Sports. Official rosters, advanced stats, play-by-play, video links. Source label: "NCAA verified" / "FIBA official." Confidence: 1.0.

#### Merge Layer

When multiple providers have data, priority: P4 > P3 > P2 > P1. Higher-confidence sources override lower ones. Manual overrides always respected — coach's scouting eye trumps the algorithm. The `sources[]` array lets the UI show provenance: "Stats from NCAA + your notes."

#### Extensibility Hooks

Every screen that touches opponent data reads from OpponentProfile — doesn't care which provider filled it:
- `game_plan_generator` reads `tendencies` — same algorithm whether from quick-scout or NCAA API
- `matchup_cards` read `roster[].ratings` — works with 0 ratings (show "?") or full 9-attribute profiles
- `scouting_intel` reads `confidence` — adjusts language: "we estimate" (low) vs "stats show" (high)
- `play_fit_score` computes against `weakness` — richer input = more precise output
- `halftime_chips` pre-load from `tendencies` — same chips, better defaults when data is richer
- `post_game_feedback` writes BACK to OpponentProfile — every game makes the next plan better

### Game Day Adaptive Flow

**Phase 1 (pre-game)**: Roster only → general plan.
**Phase 2 (halftime)**: Quick-tap observation chips → 60-second AI adjustments. Designed for short halftimes (8-12 min typical at youth/amateur level). Pre-loaded chips based on the game plan: "Their 3 is hot" / "Our PnR is working" / "Foul trouble." Tap 3-4 in 15 seconds → AI generates 3 bullet-point adjustments.
**Phase 3 (live)**: Box score input → AI spots exploits. "Their PF has 4 fouls — attack the post." "You're 2-14 from three — drive and kick to mid-range."

### Physical Intelligence Layer (Anatomy Integration)

The Basketball Anatomy book is NOT a standalone module — it's a **layer** woven through everything:

| Where it surfaces | What it shows |
|-------------------|---------------|
| Play viewer | "Physical demands" panel: which muscles this play requires |
| Drill library | Muscles trained tag on every drill |
| Practice planner | Fatigue monitor: cumulative muscle load heat map |
| Game plan | Physical matchup analysis: "Their PF is stronger but slower" |
| Game day | Targeted warmup generator based on tonight's game plan |
| Player dashboard | Skill gap → body cause → exercise prescription |
| Defense simulator | Injury risk: "Staying in this stance loads the VMO" |
| Knowledge search | Anatomy-aware answers: "Shot falls short → leg power → squats" |

**Standalone anatomy screens** (6):
Movement atlas (every basketball movement → muscles) · Muscle explorer (tap body part → everything connected) · Warmup generator · Exercise library (cross-linked to skills + drills) · Form guide (body angles from the book) · Injury prevention guide

### Play Requirements + Skill Gating

Every play has a skill requirements profile. If the team doesn't meet the requirements, the play is **locked** — with a clear explanation of what's missing and an estimated unlock timeline.

Every complex play has **simplified versions** at lower skill levels:
- L1 (U10): 2-3 players, one action, zero reads
- L2 (U12): 3-4 players, one read
- L3 (U14): 4-5 players, two reads
- L4 (U16+): Full play with multiple reads and counters

The simplified version is available NOW. The full version is a goal to unlock through development. Plays aren't a menu — they're achievements to earn.

---

## Game Day Flow — Atomic Workflow

Three-phase adaptive screen. Designed for courtside: large touch targets, sweaty hands, 8-minute halftime.

### Entry conditions

**E1 No game plan exists** → Pre-game tab shows inline plan generator: "Who are you playing?" + quick scout. Generate plan in 90 seconds. Game day flow IS the entry to the game plan if no plan exists.

**E2 No roster** → Fast roster entry: just 5 names + positions, no ratings. Ratings come later. Thinnest possible blocker on game day.

**E3 Wrong opponent loaded** → Amber warning if schedule mismatches loaded plan. One-tap to switch.

**E4 Tournament (multiple games)** → Game selector dropdown in game bar. Each game has independent plan, stats, adjustments. Post-game Game 1 feeds into Game 2's plan.

**E5 Entered mid-game** → Auto-detect from schedule. Skip pre-game, land on halftime or live. Quick score input (two number pads). No time wasted reviewing a pre-game plan.

**E6 App goes offline** → Game plan cached on-device at entry. Chips work offline. Pre-computed fallback adjustments available. Stats sync when reconnected. Never lose data.

### Phase 1 — Pre-game

Coach reviews the plan before tip-off. All context carried from Game Plan Generator.

**P1 Last-minute roster change** → "Edit lineup" button. Tap player → swap from bench. AI recalculates matchups + play recommendations. Shows diff of what changed.

**P2 Scheme change** → Tap scheme card → override toggle. AI regenerates adjustments. Free-text "Add note" for warmup observations.

**P3 Opponent info was wrong** → Each quick-scout answer editable. Changes write back to OpponentProfile.

**P4 Player hasn't opened app** → "Print lineup card" — one-page per player with their matchup + role. Physical backup.

**P5 Empty playbook** → AI recommends 4-5 starter plays from global library by team skill level. Post-game: "Add these to your playbook?" one tap.

### Phase 2 — Halftime (the hero)

Observation chips in three categories (offense/defense/situational). Tap 3-5, generate adjustments.

**H1 Conflicting chips** → All valid simultaneously. AI resolves contradictions in context. Conflicting signals = nuanced adjustments.

**H2 Zero chips selected** → Generate button always available. 0 chips = AI reads box score alone. 1 chip = AI weighs heavily + supplements with stats. Never block the coach.

**H3 No stats entered** → Chips alone are enough. Minimum input: halftime score (two taps on number pad). Stats are enrichment, not requirement.

**H4 Missing chip** → "Other" chip at end of each category. Tap → one-line text input (50 chars). Custom chips surface from game history against this opponent.

**H5 AI offline at halftime** → Pre-computed fallback adjustments generated with the game plan. Cached on-device. If/then scenarios matching the selected chips. Label: "Quick adjustments (offline)" vs "AI analysis (online)."

**H6 Short halftime (youth)** → Level system determines UX. Youth: top 3 chips per category only. 2 bullets max. Larger targets. Auto-scroll. 60-second flow.

**H7 Regenerate** → Chips remain tappable after adjustments shown. Adding/removing a chip shows "Update adjustments." History accessible via "Previous" link.

**H8 Timeout (not halftime)** → "Quick play" shortcut at top of halftime tab. One tap → top 3 plays with mini courts. Pick one, show team. No chip selection for 60-second timeout.

### Phase 3 — Live

Real-time stat tracking + AI exploit detection.

**L1 Can't track stats and coach** → Stat tracking is OPTIONAL. "Invite stat tracker" generates a join code. Assistant/parent/manager tracks on second device (simplified stat-entry UI). Coach sees live exploits dashboard. Two devices, one team account.

**L2 Wrong stat entered** → "Undo last" button always visible. Tap player row for manual correction. Changes propagate to AI immediately.

**L3 Substitutions** → Sub button shows current 5. Tap out → bench list → tap in. Minutes tracked automatically. AI adjusts recommendations for new lineup.

**L4 Blowout** → AI detects 20+ point differential. Winning: "Development mode — rotate bench, try new plays." Losing: "Focus on execution. Track 3 things for next practice."

**L5 Overtime** → "OT" option when Q4 ends tied. AI generates OT-specific adjustments factoring fouls and fatigue.

**L6 Opponent stats not tracked** → Optional. AI works from YOUR stats alone. Minimum opponent input: score + foul count on key player.

**L7 Post-game transition** → "Game over" → summary screen with auto-generated analysis. Coach adds notes. Everything saves to game history + opponent profile + practice recommendations. The flywheel completes.
