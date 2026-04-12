
## 9. Play Viewer — Technical Spec

The play viewer is the flagship atom — the most complex and most important visual in the app. It evolved through 12 iterations (v1→v12, 7,185 total lines of prototyping).

Reference implementation: `/outputs/courtiq-v12.jsx` (389 lines, production quality)

### SVG Coordinate System

ViewBox: `"-28 -3 56 50"` — matches Hoops Geek exactly.
Origin (0,0) = center-top of the half-court. X: -28 (left) to +28 (right). Y: -3 (above baseline) to +47 (far end).

### Six-Layer Z-Order

1. **Wood grain tiles** — seeded RNG (seed=42), ~65 vertical strips, 32 gold/amber colors, semi-transparent overlay `fillOpacity="0.65"`, radial vignette
2. **Court lines** — white, strokeWidth=0.3, baseline, sidelines, paint, 3-point arc, center circle, hash marks
3. **Action lines** — ghost trails at 0.10 opacity + current action with stroke-dasharray trimming
4. **Players** — `<text>` elements with label toggle (#/POS/NAME), z-reordered so moving player renders last
5. **Active marker** — arrow polygon or screen bar rendered as SEPARATE element on top of players (NOT as SVG marker-end — this was a key iteration insight)
6. **Basketball icon** — always visible, r=0.7, orange with seams, shadow, pulse, catch animation, travel along passes

### Three-Phase Animation

Each action animates over a single progress value (0→1):

```
prog: 0 ────── 0.35 ────── 0.65 ────── 1.0
      | DRAW   | FADE     | MOVE     |
      | line   | line     | player   |
      | draws  | fades→0  | glides   |
      | player | player   | line     |
      | stays  | stays    | gone     |
```

**Phase math from prog**:
- `drawProg = min(1, prog / 0.35)`
- `fadeProg = max(0, min(1, (prog - 0.35) / 0.30))`
- `moveProg = max(0, (prog - 0.65) / 0.35)`
- Easing: `ease(t) = t < 0.5 ? 2*t*t : 1 - pow(-2*t+2, 2) / 2`

Duration: 2400ms for cuts, 1800ms for passes.

The line **disappears completely before the player starts moving**. Each step is visually distinct. This was an explicit design decision — the user rejected simultaneous animation in favor of sequential phases.

### Line Trimming

- `START_TRIM = 1.5` SVG units from path start
- `END_TRIM = 3.0` SVG units from path end
- Implemented via `strokeDasharray` + negative `strokeDashoffset`
- Pass lines: dashed (`1.2 0.4`), warm orange `#d4722b`
- Cut lines: solid, charcoal `rgba(51,51,51,1)`

### Basketball Icon

- Circle r=0.7, fill `#e8702a`, stroke `#b5541c`
- Seam lines (Bézier + vertical), shadow ellipse
- **Resting**: offset (+2.2, -2.2) from handler — upper-right, never covers number
- **Traveling**: follows pass path at drawProg position, no offset
- **Pulse**: `1 + sin(tick * 0.15) * 0.06` when stationary
- **Catch**: scale 1.3 → 1.0 over 400ms on receive
- **Travel glow**: circle r=1.1, orange stroke, 25% opacity

### Label Toggle

3 modes cycling on click: `#` (numbers) → `POS` (PG/SG/SF/PF/C) → `NAME` (roster names)

### Play Data Format

```typescript
interface Play {
  name: string;
  tag: string;
  desc: string;
  players: Record<string, [number, number]>;
  roster: Record<string, { name: string; pos: string }>;
  ballStart: string;
  phases: Phase[];
}

interface Phase {
  label: string;
  text: string;
  detail?: string;
  actions: Action[];
}

interface Action {
  marker: "arrow" | "screen";
  path: string;               // SVG path d="" (cubic Béziers or lines)
  dashed?: boolean;            // true = pass (orange, dashed), false = cut (charcoal, solid)
  move?: { id: string; to: [number, number] };
  ball?: { from: string; to: string };
}
```

### Sample Play Data (Lakers Flare Slip)

```javascript
{
  name: "Lakers Flare Slip",
  tag: "Ball Screen",
  players: { "1":[0,32], "2":[-13,26], "3":[13,26], "4":[23,4], "5":[21,17] },
  roster: { "1":{name:"D'Angelo",pos:"PG"}, "2":{name:"Austin",pos:"SG"}, "3":{name:"Rui",pos:"SF"}, "4":{name:"AD",pos:"PF"}, "5":{name:"LeBron",pos:"C"} },
  ballStart: "1",
  phases: [
    { label:"Phase 1", text:"4 jogs toward 2 and sells the flare screen.",
      actions: [
        { marker:"screen", path:"M21.427 4.069 C-5.204 5.347 -16.703 11.397 -13.070 22.220", move:{id:"4",to:[-13.07,22.22]} },
        { marker:"arrow", path:"M-14.364 25.238 C-15.977 24.036 -17.659 21.740 -19.410 18.350", move:{id:"2",to:[-19.41,18.35]} },
    ]},
    { label:"Phase 2", text:"4 slips hard to the basket. 1 delivers the pass.",
      actions: [
        { marker:"arrow", path:"M-11.893 21.174 C-8.792 18.417 -5.686 15.655 -2.577 12.890", move:{id:"4",to:[-1.52,11.95]} },
        { marker:"arrow", dashed:true, path:"M-0.120 30.430 L-1.400 13.520", ball:{from:"1",to:"4"} },
    ]},
  ],
}
```

### Wood Grain Tile System

Procedural: ~65 vertical strips, width 0.52-0.94, seeded RNG (seed=42) for deterministic rendering. 32 colors. Semi-transparent overlay `rgb(245,225,205)` at 0.65 opacity. Subtle radial vignette at edges.

### Auto-Play Loop (for hero / landing page)

```
1. Wait 1.2s (initial delay)
2. For each action in sequence:
   a. Animate (2400ms cuts / 1800ms passes)
   b. Wait for completion, rebuild state
3. After all actions: wait 2.5s
4. Reset all positions → loop to step 2
```

### Key Iteration Decisions (from v1→v12)

- **v8**: clipPath masking tried → REJECTED (created visible artifacts)
- **v9**: Pure z-order adopted (no masking) → APPROVED
- **v9→v10**: Marker rendering moved from SVG marker-end to separate Layer 5 element → APPROVED
- **v10→v11**: Sequential 3-phase animation (DRAW→FADE→MOVE) replaced simultaneous → APPROVED
- **v11→v12**: Basketball icon added with offset, pulse, catch, travel → APPROVED. Ball radius reduced from 1.1 to 0.7 after user feedback that it concealed numbers.

### Three Game-Changers (v12→v4 reskin)

Reference implementation: `/outputs/screen-play-viewer-v4.jsx`

**Game-changer 1 — Branching Reads ("What if?").** After Phase 1 completes, a dark overlay appears with a purple GitBranch icon: "Read the defense." Two choices fork the play based on defensive reaction (e.g., "X4 switches early" → slip cut vs "X4 stays home" → flare screen). Uses `branchRef` (useRef) to avoid stale closures in animation callbacks. Purple badge in toolbar shows which read was chosen. Reset clears branch state.

**Game-changer 2 — Spotlight Mode ("I am Player 4").** Player toggle bar (All | 1 | 2 | 3 | 4 | 5). Click a player number → everything else dims to 20% opacity. That player's number turns orange with a dashed spotlight ring. Action lines not involving that player dim. Coaching text rewrites to second person: "YOU set the screen. The defense MUST believe you're screening." Each phase has a `spotlightText` map with per-player coaching text.

**Game-changer 3 — Ghost Defense.** Toggle shows 5 red X-players in man-to-man positions matching the offense. During animation, defenders react (X4 follows across court, X2 shifts to prepare for switch). Right panel switches to "Defense reactions" explaining each defender's movement. Defenders rendered as dashed circles with `strokeDasharray="0.8 0.4"`.

### Ghost Trail Persistence (v4 fix)

- Ghost trails now render persistent end markers (arrows/screen bars) at 15% opacity via `ghostMarkers` computed array
- FADE phase transitions to 10% opacity (`Math.max(0.10, 1 - fadeProg * 0.9)`) instead of disappearing to 0
- Active marker uses same `lineOpacity`, fading WITH the line instead of popping out
- No information is ever lost — completed actions always show direction

---

## 10. Screen Inventory (30 screens)

### Coach Experience (16 screens)

**Playbook Lab** (5):
Play library (browse/search/filter — coach's LANDING PAGE) · Play viewer (animated SVG) · Play creator (drag/draw/auto-animate) · My playbook (organize/share) · Defense simulator (interactive)

**Game Planning** (3):
