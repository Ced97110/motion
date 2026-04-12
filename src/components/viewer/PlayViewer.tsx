"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { Play } from "@/lib/types";
import { calcLen, pointAt, pointAtLen } from "@/lib/svg-utils";
import {
  START_TRIM,
  END_TRIM,
  DRAW_END,
  FADE_END,
  BALL_ORANGE,
  BALL_DARK,
  PASS_COLOR,
  ease,
} from "@/lib/animation";
import CourtSVG from "@/components/court/CourtSVG";
import HeaderSection from "./HeaderSection";
import PhaseTabs from "./PhaseTabs";
import ControlsBar from "./ControlsBar";
import CoachingText from "./CoachingText";

interface PlayViewerProps {
  play: Play;
}

export default function PlayViewer({ play }: PlayViewerProps) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [actIdx, setActIdx] = useState(-1);
  const [prog, setProg] = useState(1);
  const [pos, setPos] = useState<Record<string, [number, number]>>({});
  const [ball, setBall] = useState(play.ballStart);
  const [lens, setLens] = useState<Record<string, number>>({});
  const [isAnim, setIsAnim] = useState(false);
  const [catchAnim, setCatchAnim] = useState(0);
  const [tick, setTick] = useState(0);
  const [labelMode, setLabelMode] = useState(0);
  const labelModes = ["#", "POS", "NAME"];
  const cycleLabelMode = () => setLabelMode((m) => (m + 1) % 3);
  const animRef = useRef<number>(0);

  // Initialize positions and compute path lengths
  useEffect(() => {
    const p: Record<string, [number, number]> = {};
    Object.entries(play.players).forEach(([id, v]) => {
      p[id] = [...v];
    });
    setPos(p);

    const l: Record<string, number> = {};
    play.phases.forEach((ph, pi) =>
      ph.actions.forEach((a, ai) => {
        l[`${pi}-${ai}`] = calcLen(a.path);
      })
    );
    setLens(l);
  }, [play]);

  // Pulse ticker for ball breathing
  useEffect(() => {
    const t = setInterval(() => setTick((k) => k + 1), 80);
    return () => clearInterval(t);
  }, []);

  const phase = play.phases[phaseIdx];

  // Ghost trails
  const ghosts = useMemo(() => {
    const r: Array<{ path: string; dashed?: boolean; marker: "arrow" | "screen"; k: string }> = [];
    for (let pi = 0; pi < phaseIdx; pi++) {
      play.phases[pi].actions.forEach((a, ai) =>
        r.push({ ...a, k: `${pi}-${ai}` })
      );
    }
    if (actIdx >= 0) {
      for (let ai = 0; ai < actIdx; ai++) {
        r.push({ ...phase.actions[ai], k: `${phaseIdx}-${ai}` });
      }
    }
    return r;
  }, [phaseIdx, actIdx, phase, play.phases]);

  const curAct = actIdx >= 0 && actIdx < phase.actions.length ? phase.actions[actIdx] : null;
  const curLen = curAct ? lens[`${phaseIdx}-${actIdx}`] || 50 : 50;
  const isPassAction = curAct?.ball != null;

  const drawProg = curAct ? Math.min(1, prog / DRAW_END) : 0;
  const fadeProg = curAct ? Math.max(0, Math.min(1, (prog - DRAW_END) / (FADE_END - DRAW_END))) : 0;
  const moveProg = curAct ? Math.max(0, (prog - FADE_END) / (1 - FADE_END)) : 0;
  const easedDraw = ease(drawProg);
  const trimmedLen = Math.max(0, curLen - START_TRIM - END_TRIM);
  const drawnLen = trimmedLen * easedDraw;
  const lineOpacity = fadeProg > 0 ? Math.max(0, 1 - fadeProg) : 1;

  const animateOne = useCallback(
    (pi: number, ai: number) => {
      setPhaseIdx(pi);
      setActIdx(ai);
      setProg(0);
      setIsAnim(true);
      setCatchAnim(0);
      const action = play.phases[pi].actions[ai];
      const dur = action.dashed ? 1800 : 2400;
      const start = performance.now();

      const tick = (now: number) => {
        const raw = Math.min(1, (now - start) / dur);
        setProg(raw);
        const mp = Math.max(0, (raw - FADE_END) / (1 - FADE_END));
        if (action.move && mp > 0 && mp < 1) {
          const pt = pointAt(action.path, ease(mp));
          if (pt) setPos((prev) => ({ ...prev, [action.move!.id]: pt }));
        }
        if (raw < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          if (action.move)
            setPos((prev) => ({ ...prev, [action.move!.id]: [...action.move!.to] }));
          if (action.ball) {
            setBall(action.ball.to);
            setCatchAnim(1);
            setTimeout(() => setCatchAnim(0), 400);
          }
          setIsAnim(false);
        }
      };
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(tick);
    },
    [play]
  );

  const rebuild = useCallback(
    (toPi: number, toAi: number) => {
      const p: Record<string, [number, number]> = {};
      Object.entries(play.players).forEach(([id, v]) => {
        p[id] = [...v];
      });
      let b = play.ballStart;
      for (let pi = 0; pi <= toPi; pi++) {
        const maxA = pi < toPi ? play.phases[pi].actions.length : toAi;
        for (let ai = 0; ai < maxA; ai++) {
          const a = play.phases[pi].actions[ai];
          if (a.move) p[a.move.id] = [...a.move.to];
          if (a.ball) b = a.ball.to;
        }
      }
      setPos(p);
      setBall(b);
    },
    [play]
  );

  const next = () => {
    if (isAnim) return;
    const n = actIdx + 1;
    if (n < phase.actions.length) {
      animateOne(phaseIdx, n);
    } else if (phaseIdx < play.phases.length - 1) {
      rebuild(phaseIdx + 1, 0);
      animateOne(phaseIdx + 1, 0);
    }
  };

  const prev = () => {
    if (isAnim) return;
    if (actIdx > 0) {
      rebuild(phaseIdx, actIdx - 1);
      animateOne(phaseIdx, actIdx - 1);
    } else if (phaseIdx > 0) {
      const pL = play.phases[phaseIdx - 1].actions.length;
      rebuild(phaseIdx - 1, pL - 1);
      animateOne(phaseIdx - 1, pL - 1);
    }
  };

  const playAll = () => {
    rebuild(0, 0);
    setBall(play.ballStart);
    const seq: Array<[number, number, number]> = [];
    play.phases.forEach((ph, pi) =>
      ph.actions.forEach((a, ai) => seq.push([pi, ai, a.dashed ? 2000 : 2700]))
    );
    let i = 0;
    const run = () => {
      if (i >= seq.length) return;
      const [pi, ai] = seq[i];
      if (i > 0) rebuild(pi, ai);
      animateOne(pi, ai);
      i++;
      if (i < seq.length) setTimeout(run, seq[i - 1][2]);
    };
    setTimeout(run, 200);
  };

  const reset = () => {
    cancelAnimationFrame(animRef.current);
    rebuild(0, 0);
    setBall(play.ballStart);
    setPhaseIdx(0);
    setActIdx(-1);
    setProg(1);
    setIsAnim(false);
    setCatchAnim(0);
  };

  const handlePhaseSelect = (i: number) => {
    if (!isAnim) {
      rebuild(i, 0);
      animateOne(i, 0);
    }
  };

  const playerOrder = useMemo(() => {
    const ids = Object.keys(play.players);
    if (curAct?.move) {
      const m = curAct.move.id;
      return [...ids.filter((id) => id !== m), m];
    }
    return ids;
  }, [curAct, play.players]);

  const markerInfo = useMemo(() => {
    if (!curAct || drawProg < 0.92) return null;
    const stopLen = Math.max(0, curLen - END_TRIM);
    const tip = pointAtLen(curAct.path, stopLen);
    const behind = pointAtLen(curAct.path, Math.max(0, stopLen - 2));
    if (!tip || !behind) return null;
    const angle = (Math.atan2(tip[1] - behind[1], tip[0] - behind[0]) * 180) / Math.PI;
    const opacity = fadeProg > 0 ? Math.max(0, 1 - fadeProg) : 1;
    return { tip, angle, type: curAct.marker, opacity };
  }, [curAct, drawProg, fadeProg, curLen]);

  const ghostMarkers = useMemo(() => {
    return ghosts
      .map((a) => {
        const totalLen = lens[a.k] || 50;
        const stopLen = Math.max(0, totalLen - END_TRIM);
        const tip = pointAtLen(a.path, stopLen);
        const behind = pointAtLen(a.path, Math.max(0, stopLen - 2));
        if (!tip || !behind) return null;
        const angle = (Math.atan2(tip[1] - behind[1], tip[0] - behind[0]) * 180) / Math.PI;
        return { k: a.k, tip, angle, type: a.marker };
      })
      .filter(Boolean) as Array<{ k: string; tip: [number, number]; angle: number; type: "arrow" | "screen" }>;
  }, [ghosts, lens]);

  const ballPos = useMemo(() => {
    if (isPassAction && curAct) {
      if (drawProg > 0 && drawProg < 1) {
        const pt = pointAt(curAct.path, easedDraw);
        if (pt) return { x: pt[0], y: pt[1], traveling: true };
      }
      if (fadeProg > 0 || moveProg > 0) {
        const receiver = curAct.ball!.to;
        const rp = pos[receiver] || play.players[receiver];
        return { x: rp[0], y: rp[1], traveling: false, justCaught: fadeProg < 0.5 };
      }
      const sender = curAct.ball!.from;
      const sp = pos[sender] || play.players[sender];
      return { x: sp[0], y: sp[1], traveling: false };
    }
    const bp = pos[ball] || play.players[ball];
    return { x: bp[0], y: bp[1], traveling: false };
  }, [isPassAction, curAct, drawProg, fadeProg, moveProg, easedDraw, ball, pos, play.players]);

  const ballLabel = useMemo(() => {
    if (isPassAction && curAct) {
      if (drawProg >= 1) return curAct.ball!.to;
      return curAct.ball!.from;
    }
    return ball;
  }, [isPassAction, curAct, drawProg, ball]);

  const ballPulse = !ballPos.traveling ? 1 + Math.sin(tick * 0.15) * 0.06 : 1;
  const catchScale = catchAnim > 0 ? 1.3 - catchAnim * 0.3 : 1;
  const ballScale = catchAnim > 0 ? catchScale : ballPulse;

  // Dev-mode instrumentation for visual regression tests. Exposes:
  //   window.__motionState      — live render state (state + derived progress)
  //   window.__motionControls   — deterministic stepper for Playwright harness
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    w.__motionState = {
      phaseIdx,
      actIdx,
      prog,
      drawProg,
      fadeProg,
      moveProg,
      pos,
      ball,
      isAnim,
      labelMode,
      playName: play.name,
      phaseCount: play.phases.length,
    };
    w.__motionControls = {
      playAll,
      reset,
      setLabelMode,
      seekToPhaseEnd: (n: number) => {
        const phase = play.phases[n];
        if (!phase) return;
        cancelAnimationFrame(animRef.current);
        rebuild(n, phase.actions.length);
        setPhaseIdx(n);
        setActIdx(-1);
        setProg(1);
        setIsAnim(false);
      },
    };
  });

  // Resolve ball label for display
  const displayBallLabel =
    labelMode === 2 && play.roster?.[ballLabel]
      ? play.roster[ballLabel].name
      : labelMode === 1 && play.roster?.[ballLabel]
        ? play.roster[ballLabel].pos
        : ballLabel;

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <HeaderSection
          playName={play.name}
          tag={play.tag}
          desc={play.desc}
          onPlayAll={playAll}
          isAnimating={isAnim}
        />

        <PhaseTabs
          phases={play.phases}
          activeIndex={phaseIdx}
          onSelect={handlePhaseSelect}
          disabled={isAnim}
        />

        {/* Court container — sharp borders, dark broadcast */}
        <div style={{ overflow: "hidden", border: "1px solid rgba(255,255,255,0.22)" }}>
          <CourtSVG>
            {/* LAYER 3: Ghost trails */}
            {ghosts.map((a) => {
              const totalLen = lens[a.k] || 50;
              const vl = Math.max(0, totalLen - START_TRIM - END_TRIM);
              const isPass = a.dashed;
              return (
                <path
                  key={a.k}
                  d={a.path}
                  strokeWidth="0.22"
                  fill="none"
                  stroke={isPass ? "rgba(212,114,43,0.12)" : "rgba(51,51,51,0.10)"}
                  strokeDasharray={`${vl} ${totalLen * 2}`}
                  strokeDashoffset={`${-START_TRIM}`}
                />
              );
            })}
            {ghostMarkers.map((m) => (
              <g
                key={m.k}
                transform={`translate(${m.tip[0]} ${m.tip[1]}) rotate(${m.angle})`}
                opacity="0.10"
              >
                {m.type === "screen" ? (
                  <rect x="0" y="-1.2" width="0.4" height="2.4" fill="rgba(51,51,51,1)" />
                ) : (
                  <polygon points="-1.4 -0.8,0 0,-1.4 0.8,-1.3 0" fill="rgba(51,51,51,1)" />
                )}
              </g>
            ))}

            {/* LAYER 3b: Current action line */}
            {curAct && (
              <path
                d={curAct.path}
                strokeWidth={isPassAction ? "0.28" : "0.22"}
                fill="none"
                stroke={
                  isPassAction
                    ? `rgba(212,114,43,${lineOpacity})`
                    : `rgba(51,51,51,${lineOpacity})`
                }
                strokeDasharray={`${drawnLen} ${curLen * 2}`}
                strokeDashoffset={`${-START_TRIM}`}
              />
            )}

            {/* LAYER 4: Players */}
            {playerOrder.map((id) => {
              const p = pos[id] || play.players[id];
              const r = play.roster?.[id];
              const label = labelMode === 2 && r ? r.name : labelMode === 1 && r ? r.pos : id;
              const vw = label.length > 3 ? Math.max(300, label.length * 55) : 300;
              const fs = label.length > 3 ? Math.min(60, 280 / label.length) : label.length <= 2 ? 70 : 55;
              const svgW = (vw / 300) * 9.45;
              return (
                <g key={id} transform={`translate(${p[0]} ${p[1]})`}>
                  <svg x={-svgW / 2} y={-svgW / 2} width={svgW} height={svgW} viewBox={`${-vw / 2} ${-vw / 2} ${vw} ${vw}`}>
                    <text textAnchor="middle" dominantBaseline="central" fill="rgba(51,51,51,1)" fontWeight="700" fontSize={fs} fontFamily="Roboto,sans-serif" x="0" y="0">
                      {label}
                    </text>
                  </svg>
                </g>
              );
            })}

            {/* LAYER 5: Active marker */}
            {markerInfo && (
              <g
                transform={`translate(${markerInfo.tip[0]} ${markerInfo.tip[1]}) rotate(${markerInfo.angle})`}
                opacity={markerInfo.opacity}
              >
                {markerInfo.type === "screen" ? (
                  <rect x="0" y="-1.2" width="0.4" height="2.4" fill={isPassAction ? PASS_COLOR : "rgba(51,51,51,1)"} />
                ) : (
                  <polygon points="-1.4 -0.8,0 0,-1.4 0.8,-1.3 0" fill={isPassAction ? PASS_COLOR : "rgba(51,51,51,1)"} />
                )}
              </g>
            )}

            {/* LAYER 6: Basketball icon */}
            {(() => {
              const bx = ballPos.traveling ? ballPos.x : ballPos.x + 2.2;
              const by = ballPos.traveling ? ballPos.y : ballPos.y - 2.2;
              const R = 0.7;
              return (
                <g transform={`translate(${bx} ${by})`}>
                  <ellipse cx="0.06" cy={R + 0.2} rx={R * 0.6} ry={R * 0.15} fill="rgba(0,0,0,0.10)" />
                  <g transform={`scale(${ballScale})`}>
                    <circle cx="0" cy="0" r={R} fill={BALL_ORANGE} stroke={BALL_DARK} strokeWidth="0.1" />
                    <path d={`M${-R} 0 Q${-R * 0.3} ${-R * 0.4} 0 0 Q${R * 0.3} ${R * 0.4} ${R} 0`} fill="none" stroke={BALL_DARK} strokeWidth="0.06" opacity="0.45" />
                    <line x1="0" y1={-R} x2="0" y2={R} stroke={BALL_DARK} strokeWidth="0.06" opacity="0.35" />
                  </g>
                  {ballPos.traveling && (
                    <circle cx="0" cy="0" r={R + 0.4} fill="none" stroke={BALL_ORANGE} strokeWidth="0.12" opacity="0.3" />
                  )}
                </g>
              );
            })()}
          </CourtSVG>

          {/* Progress bar */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.08)" }}>
            <div
              style={{
                height: "100%",
                background: "#f97316",
                width: `${(actIdx < 0 ? 0 : prog) * 100}%`,
                transition: prog === 0 ? "none" : "width 0.05s linear",
              }}
            />
          </div>

          <ControlsBar
            phases={play.phases}
            phaseIdx={phaseIdx}
            onPhaseClick={handlePhaseSelect}
            isAnimating={isAnim}
            ballLabel={displayBallLabel}
            labelMode={labelMode}
            labelModes={labelModes}
            onCycleLabel={cycleLabelMode}
            onPrev={prev}
            onNext={next}
            onReset={reset}
          />
        </div>

        <CoachingText text={phase.text} detail={phase.detail} />

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 9, color: "#63636e", letterSpacing: "1px", textTransform: "uppercase" as const }}>
          v12
        </div>
      </div>
    </div>
  );
}
