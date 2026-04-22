// Copyright: Your Name. Apache 2.0
// Play Viewer v7 — reusable component extracted from the original page-level
// reference. Logic is the user's v7 implementation verbatim (mask-based reveal,
// RAF clock, coach/player toggle, branching reads, spotlight, ghost defense).
//
// This is the PRODUCTION viewer. Data comes in via the `play` prop in v7-shape
// (pre-computed path strings + resolved move/ball metadata). Convert authored
// source-shape plays via `toV7Shape` in `lib/plays/toV7.ts` before rendering.

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RotateCcw, Play, Pause, GitBranch, Lightbulb, Eye, User } from "lucide-react";

import type {
  V7Action,
  V7BranchOption,
  V7DefenseAction,
  V7Phase,
  V7Play,
  V7Point,
  V7RosterEntry,
} from "@/lib/plays/v7-types";

// ============================================================
// Theme + constants (kept local to the viewer for now; to be merged with
// `lib/design-tokens.ts` in a follow-up pass).
// ============================================================

const M = {
  bg: "#0a0a0b", bg2: "#111113", bg3: "#19191c",
  bd: "rgba(255,255,255,0.08)", bd2: "rgba(255,255,255,0.14)", bdS: "rgba(255,255,255,0.22)",
  tx: "#fafafa", ts: "#a1a1aa", td: "#63636e", tg: "#3e3e45",
  ac: "#f97316", acS: "rgba(249,115,22,0.1)", acB: "rgba(249,115,22,0.35)", acM: "rgba(249,115,22,0.55)",
};
const PC = "#d4722b", BO = "#e8702a", BD = "#b5541c";

// ----- Wood grain -----
interface Tile {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function generateTiles(seed: number): Tile[] {
  const tiles: Tile[] = [];
  const colors = ["#ca913c", "#d19d47", "#c88d32", "#c98a28", "#daa549", "#cc9338", "#cc9844", "#d19740", "#ca8c2f", "#c48f3d", "#d49d44", "#c89240"];
  let rng = seed;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng & 0x7fffffff) / 2147483647; };
  let x = -28, id = 0;
  while (x < 28) {
    const w = x < -27.5 || x > 27.5 ? 0.52 : 0.94;
    let y = -3;
    const segs = 2 + Math.floor(rand() * 2);
    for (let s = 0; s < segs; s++) {
      const h = s === segs - 1 ? 50 - (y + 3) : 3 + rand() * 35;
      const ch = Math.min(h, 50 - (y + 3));
      if (ch > 0) tiles.push({ id: id++, x, y, w, h: ch, fill: colors[Math.floor(rand() * colors.length)] });
      y += ch; if (y >= 47) break;
    }
    x += w;
  }
  return tiles;
}

// ----- SVG path utilities -----
const ns = "http://www.w3.org/2000/svg";
function makePath(d: string) {
  if (typeof document === "undefined") return null;
  const s = document.createElementNS(ns, "svg");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", d); s.appendChild(p); document.body.appendChild(s);
  return { el: p, svg: s, len: p.getTotalLength(), remove: () => document.body.removeChild(s) };
}
function pointAtLen(d: string, len: number): [number, number] | null {
  const p = makePath(d); if (!p) return null;
  const pt = p.el.getPointAtLength(Math.max(0, len)); p.remove();
  return [pt.x, pt.y];
}
function calcLen(d: string): number {
  const p = makePath(d); if (!p) return 50;
  const l = p.len; p.remove();
  return l;
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ----- Marker definitions -----
interface MarkerDef {
  w: number;
  h: number;
  refX: number;
  refY: number;
  points?: string;
  rect?: { x: number; y: number; w: number; h: number };
  backDist: number;
}

const MARKER_DEFS: Record<"arrow" | "screen" | "shot", MarkerDef> = {
  arrow: { w: 1.4, h: 1.6, refX: 1.4, refY: 0.8, points: "0 0, 1.4 0.8, 0 1.6, 0.1 0.8", backDist: 1.4 },
  screen: { w: 0.4, h: 2.4, refX: 0, refY: 1.2, rect: { x: 0, y: 0, w: 0.4, h: 2.4 }, backDist: 0.2 },
  shot: { w: 3.72, h: 3.72, refX: 1.86, refY: 1.86, backDist: 1.86 },
};

function MarkerShape({ type, fill, opacity = 1 }: { type: "arrow" | "screen" | "shot"; fill: string; opacity?: number }) {
  const d = MARKER_DEFS[type];
  if (type === "screen" && d.rect) {
    return <rect x={d.rect.x} y={d.rect.y} width={d.rect.w} height={d.rect.h} fill={fill} opacity={opacity} />;
  }
  if (type === "shot") {
    return (
      <g fill="none" stroke={fill} strokeWidth="0.22" strokeLinecap="square" opacity={opacity}>
        <circle cx="1.86" cy="1.86" r="1.3" />
        <line x1="0" y1="1.86" x2="1.3" y2="1.86" />
        <line x1="3.72" y1="1.86" x2="2.42" y2="1.86" />
        <line x1="1.86" y1="0" x2="1.86" y2="1.3" />
        <line x1="1.86" y1="3.72" x2="1.86" y2="2.42" />
      </g>
    );
  }
  return <polygon points={d.points} fill={fill} opacity={opacity} />;
}

function StaticMarkerDefs() {
  return (
    <defs>
      {(Object.entries(MARKER_DEFS) as Array<[ "arrow" | "screen" | "shot", MarkerDef ]>).map(([type, d]) => (
        <g key={type}>
          <marker id={`vis_${type}_dark`} markerUnits="userSpaceOnUse" markerWidth={d.w} markerHeight={d.h} refX={d.refX} refY={d.refY} orient="auto">
            <MarkerShape type={type} fill="rgba(51,51,51,1)" />
          </marker>
          <marker id={`vis_${type}_orange`} markerUnits="userSpaceOnUse" markerWidth={d.w} markerHeight={d.h} refX={d.refX} refY={d.refY} orient="auto">
            <MarkerShape type={type} fill={PC} />
          </marker>
          <marker id={`vis_${type}_ghost_dark`} markerUnits="userSpaceOnUse" markerWidth={d.w} markerHeight={d.h} refX={d.refX} refY={d.refY} orient="auto">
            <MarkerShape type={type} fill="rgba(51,51,51,1)" opacity={0.15} />
          </marker>
          <marker id={`vis_${type}_ghost_orange`} markerUnits="userSpaceOnUse" markerWidth={d.w} markerHeight={d.h} refX={d.refX} refY={d.refY} orient="auto">
            <MarkerShape type={type} fill={PC} opacity={0.15} />
          </marker>
        </g>
      ))}
    </defs>
  );
}

function MaskedActionPath({
  action,
  uidKey,
  pathLen,
  drawProg,
  isGhost,
  lineOpacity,
}: {
  action: V7Action;
  uidKey: string;
  pathLen: number;
  drawProg: number;
  isGhost: boolean;
  lineOpacity: number;
}) {
  const md = MARKER_DEFS[action.marker] || MARKER_DEFS.arrow;
  const isDashed = !!action.dashed;
  const color = isDashed ? PC : "rgba(51,51,51,1)";
  const maskDashOffset = isGhost ? 0 : pathLen * (1 - drawProg);
  const revealThreshold = pathLen > 0 ? Math.max(0, 1 - (md.backDist / pathLen) - 0.03) : 0.88;
  const markerRevealed = isGhost || drawProg >= revealThreshold ? 1 : 0;

  const maskId = `mask_${uidKey}`;
  const maskMarkerId = `maskmk_${uidKey}`;
  const visibleMarkerId = isGhost
    ? `vis_${action.marker}_ghost_${isDashed ? "orange" : "dark"}`
    : `vis_${action.marker}_${isDashed ? "orange" : "dark"}`;
  const groupOpacity = isGhost ? (isDashed ? 0.15 : 0.10) : lineOpacity;

  return (
    <>
      <defs>
        <marker id={maskMarkerId} markerUnits="userSpaceOnUse" markerWidth={md.w} markerHeight={md.h} refX={md.refX} refY={md.refY} orient="auto">
          <MarkerShape type={action.marker} fill="white" opacity={markerRevealed} />
        </marker>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-30" y="-5" width="60" height="55">
          <path
            d={action.path}
            stroke="white"
            strokeWidth="0.5"
            fill="none"
            markerEnd={`url(#${maskMarkerId})`}
            style={{ strokeDasharray: pathLen, strokeDashoffset: maskDashOffset }}
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} opacity={groupOpacity}>
        <path
          d={action.path}
          stroke={color}
          strokeWidth="0.22"
          fill="none"
          strokeDasharray={isDashed ? "1.2 0.4" : undefined}
          markerEnd={`url(#${visibleMarkerId})`}
          strokeLinecap={isDashed ? "butt" : "round"}
        />
      </g>
    </>
  );
}

// ============================================================
// Main component
// ============================================================

export interface PlayViewerV7Props {
  play: V7Play;
}

export default function PlayViewerV7({ play }: PlayViewerV7Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [actIdx, setActIdx] = useState(-1);
  const [prog, setProg] = useState(1);
  const [pos, setPos] = useState<Record<string, V7Point>>({});
  const [defPos, setDefPos] = useState<Record<string, V7Point>>({});
  const [ball, setBall] = useState(play.ballStart);
  const [lens, setLens] = useState<Record<string, number>>({});
  const [isAnim, setIsAnim] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [labelMode, setLabelMode] = useState(0);
  const [ballPulse, setBallPulse] = useState(1);
  const [catchAnim, setCatchAnim] = useState(0);

  const [view, setView] = useState<"coach" | "player">("coach");
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const [branchChosen, setBranchChosen] = useState<number | null>(null);
  const [showBranchPrompt, setShowBranchPrompt] = useState(false);

  const branchRef = useRef<number | null>(null); branchRef.current = branchChosen;
  const viewRef = useRef<"coach" | "player">("coach"); viewRef.current = view;
  const animRef = useRef<number | null>(null);
  const pulseRef = useRef<number | null>(null);
  const tiles = useMemo(() => generateTiles(42), []);

  const showDefense = view === "coach";

  const phases = useMemo<V7Phase[]>(() => {
    // All main phases of the play, plus the chosen branch (if any) appended
    // at index play.phases.length. Multi-phase plays (e.g. extracted books
    // with 6 numbered steps) now render every step; branch variants still
    // live at the tail so `phaseIdx === play.phases.length` = "in branch".
    const base: V7Phase[] = [...play.phases];
    if (branchChosen !== null && play.branchPoint) base.push(play.branchPoint.options[branchChosen].phase);
    return base;
  }, [branchChosen, play]);
  const phase = phases[phaseIdx] || phases[0];
  const curAct: V7Action | null = actIdx >= 0 && actIdx < phase.actions.length ? phase.actions[actIdx] : null;

  useEffect(() => {
    const p: Record<string, V7Point> = {};
    Object.entries(play.players).forEach(([id, v]) => { p[id] = [v[0], v[1]]; });
    setPos(p);
    const dp: Record<string, V7Point> = {};
    Object.entries(play.defense).forEach(([id, v]) => { dp[id] = [v[0], v[1]]; });
    setDefPos(dp);
    const l: Record<string, number> = {};
    // Key format: `${pi}-${ai}` for all main phases; `b${branchIdx}-${ai}` for
    // each branch option's phase. Main-phase keys are indexed by their real
    // play.phases index so lookups after phaseIdx advances stay correct.
    play.phases.forEach((ph, pi) => {
      ph.actions.forEach((a, ai) => { l[`${pi}-${ai}`] = calcLen(a.path); });
    });
    play.branchPoint?.options.forEach((opt, oi) => {
      opt.phase.actions.forEach((a, ai) => { l[`b${oi}-${ai}`] = calcLen(a.path); });
    });
    setLens(l);
    const tick = () => {
      setBallPulse(1 + Math.sin(Date.now() * 0.003) * 0.06);
      pulseRef.current = requestAnimationFrame(tick);
    };
    pulseRef.current = requestAnimationFrame(tick);
    return () => { if (pulseRef.current) cancelAnimationFrame(pulseRef.current); };
  }, [play]);

  // Main-phase indices (0..play.phases.length-1) key directly as `${pi}-${ai}`;
  // the branch phase (pi === play.phases.length) keys as `b${branchIdx}-${ai}`.
  const getLenKey = (pi: number, ai: number) =>
    pi < play.phases.length ? `${pi}-${ai}` : `b${branchRef.current}-${ai}`;
  const curLen = curAct ? lens[getLenKey(phaseIdx, actIdx)] || 50 : 50;
  const drawProg = Math.min(1, prog / 0.35);
  const fadeProg = Math.max(0, Math.min(1, (prog - 0.35) / 0.30));
  const lineOpacity = prog < 0.35 ? 1 : Math.max(0.10, 1 - fadeProg * 0.9);

  const ghosts = useMemo(() => {
    const r: Array<V7Action & { k: string; pi: number; ai: number }> = [];
    for (let pi = 0; pi < phaseIdx; pi++) {
      phases[pi]?.actions.forEach((a, ai) => r.push({ ...a, k: `g-${pi}-${ai}`, pi, ai }));
    }
    if (actIdx >= 0) {
      for (let ai = 0; ai < actIdx; ai++) {
        r.push({ ...phase.actions[ai], k: `g-${phaseIdx}-${ai}`, pi: phaseIdx, ai });
      }
    }
    return r;
  }, [phaseIdx, actIdx, phase, phases]);

  const playerOrder = useMemo(() => {
    const ids = Object.keys(play.players);
    if (curAct?.move) {
      const m = curAct.move.id;
      return [...ids.filter((id) => id !== m), m];
    }
    return ids;
  }, [curAct, play]);

  const ballPos = useMemo(() => {
    const hp = pos[ball] || play.players[ball];
    if (curAct?.ball && prog < 0.35) {
      const f = pos[curAct.ball.from] || play.players[curAct.ball.from];
      const t = pos[curAct.ball.to] || play.players[curAct.ball.to];
      return {
        x: f[0] + (t[0] - f[0]) * drawProg,
        y: f[1] + (t[1] - f[1]) * drawProg,
        traveling: true,
      };
    }
    return { x: hp[0] + 2.2, y: hp[1] - 2.2, traveling: false };
  }, [ball, pos, curAct, prog, drawProg, play]);

  const animateAction = useCallback(
    (pi: number, ai: number, phaseData: V7Phase, onComplete: () => void) => {
      setPhaseIdx(pi); setActIdx(ai); setProg(0); setIsAnim(true);
      const action = phaseData.actions[ai];
      // Explicit durationMs on an action wins over the default 2400/1800.
      // This is how an author slows a specific beat (e.g. 4000ms on a
      // scoring read) without touching the viewer code.
      const dur =
        typeof action.durationMs === "number" && action.durationMs > 0
          ? action.durationMs
          : action.dashed
            ? 1800
            : 2400;
      const start = performance.now();
      const defActs: V7DefenseAction[] = phaseData.defenseActions || [];
      const lenKey = pi === 0 ? `0-${ai}` : `b${branchRef.current}-${ai}`;

      const tick = (now: number) => {
        const raw = Math.min(1, (now - start) / dur);
        const t = ease(raw);
        setProg(t);
        if (action.move) {
          const mp = Math.max(0, (t - 0.65) / 0.35);
          if (mp > 0 && mp < 1) {
            const tl = lens[lenKey] || 50;
            const pt = pointAtLen(action.path, tl * mp);
            if (pt) setPos((prev) => ({ ...prev, [action.move!.id]: pt }));
          }
        }
        if (viewRef.current === "coach" && ai === 0) {
          defActs.forEach((da) => {
            const sp = play.defense[da.id]; const ep = da.to;
            const dp = Math.min(1, t * 1.2);
            setDefPos((prev) => ({
              ...prev,
              [da.id]: [sp[0] + (ep[0] - sp[0]) * dp, sp[1] + (ep[1] - sp[1]) * dp],
            }));
          });
        }
        if (raw < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          if (action.move) setPos((prev) => ({ ...prev, [action.move!.id]: action.move!.to }));
          if (action.ball) {
            setBall(action.ball.to);
            setCatchAnim(1);
            setTimeout(() => setCatchAnim(0), 400);
          }
          setIsAnim(false);
          if (onComplete) onComplete();
        }
      };
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(tick);
    },
    [lens, play]
  );

  const reset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const p: Record<string, V7Point> = {};
    Object.entries(play.players).forEach(([id, v]) => { p[id] = [v[0], v[1]]; });
    setPos(p);
    const dp: Record<string, V7Point> = {};
    Object.entries(play.defense).forEach(([id, v]) => { dp[id] = [v[0], v[1]]; });
    setDefPos(dp);
    setBall(play.ballStart);
    setBranchChosen(null);
    setShowBranchPrompt(false);
    setPhaseIdx(0); setActIdx(-1); setProg(1); setIsAnim(false); setHasStarted(false);
  };

  const playAll = () => {
    reset();
    setTimeout(() => {
      setHasStarted(true);
      let phaseI = 0;
      const runPhase = () => {
        // All main phases done — trigger branch prompt if applicable.
        if (phaseI >= play.phases.length) {
          if (viewRef.current === "coach" && play.branchPoint) {
            setTimeout(() => setShowBranchPrompt(true), 500);
          }
          return;
        }
        const currentPhase = play.phases[phaseI];
        const acts = currentPhase.actions;
        // Phase with no actions: advance phaseIdx so the header updates, then
        // skip ahead after the inter-phase gap so a narrative-only phase is
        // still readable.
        if (acts.length === 0) {
          setPhaseIdx(phaseI);
          setActIdx(-1);
          const pause = currentPhase.pauseAfterMs ?? 800;
          phaseI += 1;
          setTimeout(runPhase, pause);
          return;
        }
        const capturedPhaseI = phaseI;
        let actionI = 0;
        const runNextAction = () => {
          if (actionI >= acts.length) {
            // Phase complete — inter-phase gap lets the header refresh, then
            // run the next phase (or trigger the branch prompt). Author can
            // override the 800ms default via `phase.pauseAfterMs`.
            const pause = currentPhase.pauseAfterMs ?? 800;
            phaseI += 1;
            setTimeout(runPhase, pause);
            return;
          }
          const ai = actionI;
          actionI += 1;
          // Per-action `gapAfterMs` overrides the 350ms inter-action default
          // — useful for letting a decisive pass hang before the next cut.
          const action = acts[ai];
          const gap =
            typeof action.gapAfterMs === "number" && action.gapAfterMs >= 0
              ? action.gapAfterMs
              : 350;
          animateAction(capturedPhaseI, ai, currentPhase, () =>
            setTimeout(runNextAction, gap),
          );
        };
        runNextAction();
      };
      runPhase();
    }, 250);
  };

  const chooseBranch = (idx: number) => {
    if (!play.branchPoint) return;
    setBranchChosen(idx); setShowBranchPrompt(false);
    const branchPhase = play.branchPoint.options[idx].phase;
    // The branch phase is appended at play.phases.length in the derived
    // `phases` memo, so animateAction receives that index rather than the
    // previous hardcoded `1`.
    const branchPhaseIdx = play.phases.length;
    setTimeout(() => {
      const acts = branchPhase.actions;
      let i = 0;
      const runNext = () => {
        if (i >= acts.length) return;
        const ai = i; i++;
        animateAction(branchPhaseIdx, ai, branchPhase, () => setTimeout(runNext, 350));
      };
      runNext();
    }, 400);
  };

  const cycleLabels = () => setLabelMode((labelMode + 1) % 3);
  const getLabel = (id: string) => {
    if (labelMode === 0) return id;
    if (labelMode === 1) return play.roster[id].pos;
    return play.roster[id].name;
  };

  const narration = useMemo(() => {
    if (view === "player" && spotlight && phase.spotlightText?.[spotlight]) {
      return phase.spotlightText[spotlight];
    }
    return phase.text;
  }, [view, spotlight, phase]);

  const totalActions = phases.reduce((s, p) => s + p.actions.length, 0);
  const completedActions =
    phases.slice(0, phaseIdx).reduce((s, p) => s + p.actions.length, 0) + (actIdx + 1);
  const progressPct = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  const stripState: "idle" | "playing" | "branch" = showBranchPrompt ? "branch" : hasStarted ? "playing" : "idle";

  return (
    <div style={{ minHeight: "100vh", background: M.bg, color: M.tx, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${M.bd}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "2px", color: M.ts }}>MOTION</div>
        <div style={{ width: 1, height: 16, background: M.bd2 }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", color: M.td }}>PLAY VIEWER</div>
        <div style={{ flex: 1 }} />
        <button onClick={cycleLabels} style={btnSmall()}>
          {labelMode === 0 ? "#" : labelMode === 1 ? "POS" : "NAME"}
        </button>
      </div>

      <div style={{ padding: "20px 24px 14px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", margin: 0 }}>{play.name}</h1>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", color: M.ac, padding: "3px 8px", border: `1px solid ${M.acB}`, background: M.acS }}>{play.tag.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 13, color: M.ts, lineHeight: 1.5, marginTop: 6, maxWidth: 760 }}>{play.desc}</div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ position: "relative", aspectRatio: "56/50", background: M.bg2, border: `1px solid ${M.bd2}`, overflow: "hidden" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -3 56 50" style={{ width: "100%", height: "100%", display: "block" }}>
              <rect width="56" height="50" x="-28" y="-3" fill="rgb(219,192,151)" />
              <g>{tiles.map((t) => <rect key={t.id} x={t.x} y={t.y} width={t.w} height={t.h} fill={t.fill} />)}</g>
              <rect x="-28" y="-3" width="56" height="50" fill="rgb(245,225,205)" fillOpacity="0.65" />

              <g stroke="#fff" strokeWidth="0.3" fill="none" strokeLinecap="square">
                <line x1="-25" y1="0" x2="25" y2="0" /><line x1="-25" y1="0" x2="-25" y2="47" /><line x1="25" y1="0" x2="25" y2="47" />
                <path d="M-6 0L-6 19L6 19L6 0" />
                <path d="M-6 19A6 6 0 0 0 6 19" />
                <path d="M-21.65 0L-21.65 9.95A22.15 22.15 0 0 0 21.65 9.95L21.65 0" />
                <path d="M6 47A6 6 0 0 0-6 47" />
                <circle cx="0" cy="5.25" r="0.75" />
                <path d="M-4 5.25 A4 4 0 0 0 4 5.25" />
                <line x1="-6" y1="18" x2="-6.5" y2="18" />
                <line x1="-6" y1="15" x2="-6.5" y2="15" />
                <line x1="-6" y1="12" x2="-6.5" y2="12" />
                <line x1="6" y1="18" x2="6.5" y2="18" />
                <line x1="6" y1="15" x2="6.5" y2="15" />
                <line x1="6" y1="12" x2="6.5" y2="12" />
                <path d="M-25 47 L25 47" />
              </g>
              <rect x="-6.5" y="8" width="0.5" height="1" fill="#fff" stroke="#fff" strokeWidth="0.3" />
              <rect x="6" y="8" width="0.5" height="1" fill="#fff" stroke="#fff" strokeWidth="0.3" />

              <StaticMarkerDefs />
              {ghosts.map((a) => {
                const gLen = lens[getLenKey(a.pi, a.ai)] || 50;
                return <MaskedActionPath key={a.k} action={a} uidKey={a.k} pathLen={gLen} drawProg={1} isGhost={true} lineOpacity={1} />;
              })}
              {curAct && (
                <MaskedActionPath action={curAct} uidKey={`cur-${phaseIdx}-${actIdx}`} pathLen={curLen} drawProg={drawProg} isGhost={false} lineOpacity={lineOpacity} />
              )}

              {showDefense && (
                <g>
                  {Object.entries(defPos).map(([id, coord]) => (
                    <g key={id} opacity="0.75">
                      <circle cx={coord[0]} cy={coord[1]} r={1.6} fill="none" stroke="#dc2626" strokeWidth={0.25} strokeDasharray="0.8 0.4" />
                      <text x={coord[0]} y={coord[1] + 0.7} textAnchor="middle" fontSize={1.8} fontWeight={900} fill="#dc2626">{id}</text>
                    </g>
                  ))}
                </g>
              )}

              {playerOrder.map((id) => {
                const p = pos[id] || play.players[id];
                const hasBall = id === ball;
                const lbl = getLabel(id);
                const fs = labelMode === 2 ? Math.min(50, 180 / lbl.length) : 70;
                const dim = view === "player" && spotlight && spotlight !== id;
                const isSpotlit = view === "player" && spotlight === id;
                return (
                  <g key={id} transform={`translate(${p[0]} ${p[1]})`} opacity={dim ? 0.2 : 1} style={{ transition: "opacity 0.3s" }}>
                    {isSpotlit && <circle cx="0" cy="0" r="2.5" fill="none" stroke={M.ac} strokeWidth="0.15" opacity="0.5" strokeDasharray="0.6 0.3" />}
                    <circle cx="0" cy="0" r="1.48" fill="transparent" stroke="rgba(51,51,51,1)" strokeWidth="0.22" opacity={hasBall ? 1 : 0} />
                    <svg x="-4.725" y="-4.725" width="9.45" height="9.45" viewBox="-150 -150 300 300">
                      <text textAnchor="middle" dominantBaseline="central" fill={isSpotlit ? "rgba(249,115,22,0.9)" : "rgba(51,51,51,1)"} fontWeight="700" fontSize={fs} fontFamily="system-ui,sans-serif" x="0" y="0">{lbl}</text>
                    </svg>
                  </g>
                );
              })}

              <g transform={`translate(${ballPos.x} ${ballPos.y})`}>
                <ellipse cx="0.1" cy="1.2" rx="0.6" ry="0.15" fill="rgba(0,0,0,0.08)" />
                <g transform={`scale(${catchAnim > 0 ? 1.3 - catchAnim * 0.3 : ballPulse})`}>
                  <circle cx="0" cy="0" r="0.7" fill={BO} stroke={BD} strokeWidth="0.1" />
                  <path d="M-0.7 0 Q-0.2 -0.3 0 0 Q0.2 0.3 0.7 0" fill="none" stroke={BD} strokeWidth="0.06" opacity="0.45" />
                  <line x1="0" y1="-0.7" x2="0" y2="0.7" stroke={BD} strokeWidth="0.06" opacity="0.35" />
                </g>
                {ballPos.traveling && <circle cx="0" cy="0" r="1.1" fill="none" stroke={BO} strokeWidth="0.12" opacity="0.25" />}
              </g>
            </svg>
          </div>

          <div style={{
            marginTop: 14, background: M.bg2,
            border: `1px solid ${stripState === "branch" ? M.acM : M.bd}`,
            transition: "border-color 0.3s",
          }}>
            <div style={{ padding: "14px 16px 12px", minHeight: 76, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, minWidth: 62 }}>
                {stripState === "idle" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Lightbulb size={11} style={{ color: M.ac }} />
                    <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "1.5px", color: M.ac }}>NOTE</span>
                  </div>
                )}
                {stripState === "playing" && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "1.5px", color: M.td, marginBottom: 2 }}>
                      {view === "player" && spotlight ? `YOU · ${spotlight}` : "PHASE"}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: M.ac, lineHeight: 1 }}>{phaseIdx + 1}</div>
                  </>
                )}
                {stripState === "branch" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <GitBranch size={11} style={{ color: M.ac }} />
                    <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "1.5px", color: M.ac }}>READ</span>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {stripState === "idle" && (
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: M.tx, fontStyle: "italic" }}>
                    {play.coachNote}
                  </div>
                )}
                {stripState === "playing" && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: M.ts, marginBottom: 3 }}>{phase.label.toUpperCase()}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: M.tx }}>{narration}</div>
                  </>
                )}
                {stripState === "branch" && play.branchPoint && (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 800, color: M.tx, marginBottom: 10 }}>{play.branchPoint.prompt}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {play.branchPoint.options.map((opt: V7BranchOption, i: number) => (
                        <button key={i} onClick={() => chooseBranch(i)} style={branchOption()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, color: M.ac, fontWeight: 900 }}>{opt.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.5px" }}>{opt.label.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: 10, color: M.ts, lineHeight: 1.4 }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${M.bd}`, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={reset} style={btnIcon()} title="Reset"><RotateCcw size={13} /></button>
              <button onClick={playAll} disabled={isAnim || stripState === "branch"} style={btnPlay(isAnim || stripState === "branch")}>
                {isAnim ? <Pause size={13} /> : <Play size={13} />}
                <span>{isAnim ? "PLAYING" : hasStarted ? "REPLAY" : "PLAY"}</span>
              </button>
              <div style={{ flex: 1, height: 2, background: M.bd, position: "relative", marginLeft: 4 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: M.ac, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: M.ts, minWidth: 40, textAlign: "right" }}>
                {completedActions} / {totalActions}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: M.bg2, border: `1px solid ${M.bd}`, padding: 4, marginBottom: 16 }}>
            {([
              { key: "coach" as const, label: "COACH", sub: "Full team + reads", icon: Eye },
              { key: "player" as const, label: "PLAYER", sub: "Pick a role", icon: User },
            ]).map((opt) => {
              const Icon = opt.icon;
              const active = view === opt.key;
              return (
                <button key={opt.key} onClick={() => { setView(opt.key); setSpotlight(null); reset(); }} style={viewToggleButton(active)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <Icon size={13} style={{ color: active ? "#fff" : M.ts }} />
                    <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "1px" }}>{opt.label}</span>
                  </div>
                  <div style={{ fontSize: 9, marginTop: 2, color: active ? "rgba(255,255,255,0.8)" : M.td }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>

          {view === "player" && (
            <div style={{ background: M.bg2, border: `1px solid ${M.bd}`, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "2px", color: M.td, marginBottom: 10 }}>PICK A ROLE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {Object.keys(play.players).map((id) => {
                  const active = spotlight === id;
                  return (
                    <button key={id} onClick={() => setSpotlight(active ? null : id)} style={spotlightButton(active)}>
                      {id}
                    </button>
                  );
                })}
              </div>
              {spotlight && (
                <div style={{ marginTop: 10, fontSize: 11, color: M.ts, lineHeight: 1.5 }}>
                  <span style={{ color: M.ac, fontWeight: 800 }}>{play.roster[spotlight].name}</span>
                  <span style={{ color: M.td }}> · {play.roster[spotlight].pos}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ background: M.bg2, border: `1px solid ${M.bd}`, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Lightbulb size={11} style={{ color: M.ac }} />
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "2px", color: M.ac }}>KEY CONCEPTS</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", color: M.td, marginBottom: 5 }}>COUNTERS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {play.concepts.counters.map((c, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, color: M.tx, padding: "3px 7px", background: M.bg3, border: `1px solid ${M.bd2}` }}>{c}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", color: M.td, marginBottom: 5 }}>BEST FOR</div>
              <div style={{ fontSize: 11, color: M.tx, lineHeight: 1.5 }}>{play.concepts.bestFor}</div>
            </div>

            <div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", color: M.td, marginBottom: 5 }}>RELATED PLAYS</div>
              {play.concepts.related.map((r, i) => (
                <div key={i} style={{ fontSize: 11, color: M.ts, padding: "4px 0", borderBottom: i < play.concepts.related.length - 1 ? `1px solid ${M.bd}` : "none", cursor: "pointer" }}>
                  <span style={{ color: M.td, marginRight: 6 }}>→</span>{r}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: M.bg2, border: `1px solid ${M.bd}`, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "2px", color: M.td, marginBottom: 10 }}>ROSTER</div>
            {(Object.entries(play.roster) as Array<[string, V7RosterEntry]>).map(([id, r]) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", opacity: view === "player" && spotlight && spotlight !== id ? 0.3 : 1 }}>
                <div style={{ width: 22, height: 22, background: view === "player" && spotlight === id ? M.ac : M.bg3, color: view === "player" && spotlight === id ? M.bg : M.tx, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, border: `1px solid ${M.bd2}` }}>{id}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: M.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, color: M.td, letterSpacing: "0.5px" }}>{r.pos}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function btnSmall(): React.CSSProperties {
  return {
    padding: "5px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "1px",
    background: M.bg2, color: M.ts, border: `1px solid ${M.bd2}`,
    cursor: "pointer", fontFamily: "inherit",
  };
}
function btnIcon(): React.CSSProperties {
  return {
    padding: 7, background: M.bg3, color: M.tx, border: `1px solid ${M.bd2}`,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };
}
function btnPlay(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", background: disabled ? M.bg3 : M.ac, color: disabled ? M.ts : "#fff",
    border: "none", fontSize: 10, fontWeight: 900, letterSpacing: "1.2px",
    cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6,
    fontFamily: "inherit",
  };
}
function viewToggleButton(active: boolean): React.CSSProperties {
  return {
    padding: "10px 8px", textAlign: "center",
    background: active ? M.ac : "transparent",
    color: active ? "#fff" : M.ts,
    border: "none", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s",
  };
}
function spotlightButton(active: boolean): React.CSSProperties {
  return {
    padding: "10px 0", fontSize: 14, fontWeight: 900,
    background: active ? M.ac : M.bg3, color: active ? "#fff" : M.ts,
    border: `1px solid ${active ? M.ac : M.bd2}`, cursor: "pointer",
    fontFamily: "inherit", transition: "all 0.15s",
  };
}
function branchOption(): React.CSSProperties {
  return {
    padding: "10px 12px", textAlign: "left",
    background: M.bg3, border: `1px solid ${M.bd2}`,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
    color: M.tx,
  };
}
