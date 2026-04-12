## 1. Product Philosophy

Five design frameworks shape every decision. These were explicitly studied and approved during the design process:

### 1.1 Designing for Intent (Adaptive UI)

Three principles intersect to form the Adaptive UI:

**Answers over options.** Don't show 934 plays and let coaches browse. Tell them which 4 to run tonight and explain why. Don't present a blank practice template. Generate the practice plan, let the coach adjust.

**Reduce effort.** Cut steps. One-tap halftime adjustments. AI-generated reports the coach reviews, not builds from scratch. Designed for a coach with 8 minutes and sweaty hands at halftime.

**Anticipate needs.** The app notices patterns and helps before users ask. Game day? Here's the game plan. Practice day? Here's the drill sequence. Your player's shooting drops in Q4? Quad endurance is the cause.

### 1.2 Intent-Driven vs Tree Structure

Traditional app: Home → Playbook → Offense → Ball Screen → Lakers Flare Slip = 4 clicks.

Intent-driven: the system knows it's game day, knows the opponent, knows the roster → shows the game plan with recommended plays = 0 clicks. Same content, completely different path depending on WHY the user opened the app.

### 1.3 Don Norman's Three Levels of Design

**Visceral** — "I want it." The dark broadcast aesthetic with the glowing court. A coach sees this and thinks: this is a serious tool built for people like me.

**Behavioral** — "I can master it." The intent engine makes coaches feel smarter. Low effort, high output. The app knows what they need before they ask.

**Reflective** — "It completes me." Coaches tell other coaches about it. "I use [APP_NAME]." It becomes part of their coaching identity.

### 1.4 Machine Experience (Atoms + Components + Content)

The UI is NOT 30 pre-built static pages. It is a system of atoms + components + content that dynamically assembles based on intent. The game day view isn't a fixed screen — it's the same atoms arranged differently than the practice day view.

### 1.5 Refining Generative Experiences

Two levers to improve over time:
- **Refine the experience** — better interface patterns, clearer ways for coaches to express what they want
- **Refine intent inference** — strengthen the signals collected, enhance the system's understanding

Both levers must improve together. Better signals without better UI wastes data. Better UI without better signals delivers wrong answers beautifully.

### Before/After Examples

These define the philosophy in concrete terms:

| Feature | BEFORE (options) | AFTER (answers) |
|---------|-----------------|-----------------|
| Play selection | "Here are 934 plays. Browse." | "Run these 4 plays tonight. Their perimeter D is weak, your team shoots well from corners. Here's why each fits." |
| Practice planning | "Blank 90-min template + drill library." | "Here's today's practice. AI balanced offense/defense/conditioning targeting Tuesday's breakdowns. One tap to start." |
| Defensive scheme | "Open simulator, pick scenario, set up manually." | "Their PG ran 14 PnRs last game, goes left 80%. Here's the coverage that stops him." Pre-loaded. |
| Halftime | "Type your observations into a text field." | Pre-loaded chips: "Their 3 is hot" / "Our PnR is working" / "Foul trouble." Tap 3-4 in 15 seconds → 3 bullet adjustments. |
| Player development | "Here's an exercise library. Figure out what to train." | "Your shooting drops in Q4. Quad endurance is low. Do these 3 exercises 3x/week for 4 weeks." |
| Learning a play | "Watch the full animation. Read the notes." | Auto-highlights YOUR position. "Phase 1: You set the screen. Phase 2: Slip when X4 jumps." Quiz: "Where if they switch?" |

---

## 2. Architecture

```
SIGNALS (collected passively)
  │ time of day, game schedule, roster data, recent activity,
  │ game history, user role, season phase, engagement patterns
  ▼
INTENT ENGINE (infers what user needs right now)
  │ game day → "prepare for tonight"
  │ practice day → "run a good practice"
  │ off day → "study and prepare"
  │ halftime → "quick adjustments"
  │ player → "develop my skills"
  ▼
DYNAMIC ASSEMBLY (atoms + components + content)
  │ selects and arranges atoms based on intent
  │ same building blocks, different views per context
  ▼
KNOWLEDGE WIKI (the brain — Karpathy LLM wiki pattern)
  │ 2,440 pages from 7 books, structured as interlinked .md
  │ NOT RAG — compiled knowledge, cross-linked, cited
  ▼
AI INTELLIGENCE ENGINE
  │ roster assessment, play recommendations, game plans,
  │ drill suggestions, scouting reports, post-game analysis
  ▼
DELIVERED TO USER → answers, not options
```

---

## 3. Two Separate Experiences

Coach and player see **completely different apps**. This was an explicit design decision.

**Coach** lands on a context-aware dashboard:
- Game day morning → game plan summary, matchups, plays, warmup
- Practice day → practice plan, timer, drills
- Off day / evening → play library (browse mode), knowledge search, scouting

**Player** lands on their personal feed:
- My assigned plays (with "your role" highlighting)
- My drills (with timer and streak tracking)
- My development (skill gaps → exercises → archetype convergence)

The **bridge** between them: coach assigns plays/drills → they appear in the player's feed. Player progress flows back to coach dashboard.

---

## 4. The Intent Engine

### 8 Signals Collected

| Signal | What it tells us | How it shapes the view |
|--------|-----------------|----------------------|
| Time + day | Game day? Practice day? Evening? | Determines landing view |
| Schedule | Next game when? Against whom? | Surfaces game plan or practice plan |
| Roster data | Player attributes, strengths, weaknesses | Filters plays, drills, recommendations |
| Recent activity | What did they look at last session? | Continues where they left off |
| Game history | Last game stats, what worked, what failed | Targets practice at real gaps |
| User role | Coach or player? Position? | Completely different experience |
| Season phase | Pre-season, regular, playoffs, off-season | Focus: development vs game prep |
| Engagement patterns | How often? Which modules? Session length? | Simplify for light users, deepen for power |

### 5 Primary Intents

**Intent 1: Prepare for tonight's game** (game day)
Assembly: Matchup rows + court diagram (top plays) + stat cells (opponent tendencies) + warmup timer
AI delivers: "Run these 4 plays. Their weak spot is perimeter defense. Your PnR with players 1-5 exploits this."

**Intent 2: Run a good practice** (practice day)
Assembly: Timer + drill blocks (sequenced) + court diagram (today's play) + fatigue monitor
AI delivers: "Here's your 90-min practice. Targets the defensive breakdowns from Tuesday. Warmup activates hip flexors for PnR defense work."

**Intent 3: Study and prepare** (off day / evening)
Assembly: Play cards (library grid) + AI chat + court diagram (detailed viewer) + drill blocks
This is the traditional "app" experience — browsing, searching, deep exploration. The fallback, not the default.

**Intent 4: Quick adjustments** (halftime)
Assembly: Pre-loaded observation chips + 3-bullet adjustment output + timeout play suggestion
AI delivers: Tap 3-4 chips in 15 seconds → "Switch to zone on their PG. Post up your 4 — their center has 4 fouls."

**Intent 5: Personal development** (player)
Assembly: Progress bars + muscle map + exercise blocks + skill ratings + AI diagnosis
AI delivers: "Your shooting drops in Q4. Quad endurance is low. Do these 3 exercises 3x/week for 4 weeks."

### Atoms (14 building blocks)

Court diagram · Stat cell · Play card · Drill block · Matchup row · Toggle group · Timer · Roster grid · AI chat bubble · Progress bar · Muscle map · Observation chip · Phase tab · Breadcrumb

### Components (7 composed views)

Game plan summary (matchup rows + stat cells + play cards + court diagram) · Practice plan (timer + drill blocks + fatigue monitor) · Play viewer (court diagram + phase tabs + coaching text + label toggle + basketball icon) · Defense simulator (court diagram + draggable players + AI grade panel) · Scouting report (stat cells + matchup rows + AI text) · Skill dashboard (progress bars + stat cells + muscle map + exercise blocks) · Knowledge answer (AI chat bubble + linked play cards + drill blocks)

---

---
Extracted: Product philosophy + Architecture + Two experiences + Intent engine
