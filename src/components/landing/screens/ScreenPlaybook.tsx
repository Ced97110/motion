"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  MONO,
  kickerLeft,
  kickerRight,
  screenHeader,
  screenShell,
  screenTitle,
  signalChip,
} from "./shared";

const AutoPlayViewer = dynamic(
  () => import("../AutoPlayViewer"),
  {
    ssr: false,
    loading: () => <PosterMini label="loading…" animated />,
  }
);

interface Props {
  active: boolean;
}

export default function ScreenPlaybook({ active }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Hydrate the full AutoPlayViewer only when the stage becomes active AND
  // we're on desktop. Mobile stays on the animated SVG poster to save JS/CPU.
  useEffect(() => {
    if (active && !isMobile && !loaded) setLoaded(true);
  }, [active, isMobile, loaded]);

  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>Movement 03 · The playbook</span>
        <span style={screenTitle}>23-Flare</span>
        <span style={kickerRight}>3 phases · vector</span>
      </div>

      {/* Compact play viewer — sized to the right-pane dimensions */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 0",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "56 / 50",
            maxHeight: "100%",
            position: "relative",
          }}
        >
          {loaded && !isMobile ? (
            <AutoPlayViewer />
          ) : (
            <PosterMini
              label={isMobile ? "23-Flare · animated" : ""}
              animated
            />
          )}
        </div>
      </div>

      {/* Compact spec row */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto 1fr",
          columnGap: 12,
          rowGap: 4,
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.08em",
          borderTop: "1px solid var(--rule)",
          paddingTop: 10,
          marginTop: 8,
        }}
      >
        <dt style={{ color: "var(--citation)", textTransform: "uppercase" }}>
          Alignment
        </dt>
        <dd style={{ color: "var(--fg)" }}>vs. 2-3 zone</dd>
        <dt style={{ color: "var(--citation)", textTransform: "uppercase" }}>
          Intent
        </dt>
        <dd style={{ color: "var(--fg)" }}>open 3 · best shooter</dd>
      </dl>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={signalChip}>no video · pure SVG</span>
        <span style={signalChip}>60fps desktop · css-loop mobile</span>
      </div>
    </div>
  );
}

/* ─────────── compact animated poster (right-pane sized) ───────────
 * Same animation logic as PlaybookShowcase's PosterCourt, tuned smaller.
 * Pure CSS keyframes: flare path traces, ball pulses along it, rim breathes.
 * Respects prefers-reduced-motion via the global rule in globals.css. */
function PosterMini({ label, animated }: { label: string; animated?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-28 -3 56 50"
      role="img"
      aria-label="23-Flare play diagram · animated"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      {animated && (
        <style>{`
          @keyframes mpTrace {
            0%   { stroke-dashoffset: 8; opacity: 0.2; }
            25%  { opacity: 0.95; }
            75%  { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0.2; }
          }
          @keyframes mpPulse {
            0%   { transform: translate(-7px, 13px); opacity: 0; }
            25%  { opacity: 1; }
            75%  { opacity: 1; }
            100% { transform: translate(-16px, 12px); opacity: 0; }
          }
          @keyframes mpBreath {
            0%, 100% { r: 0.75; opacity: 0.9; }
            50%      { r: 0.95; opacity: 1;   }
          }
          .pm-t { animation: mpTrace 3.2s cubic-bezier(0.4,0,0.2,1) infinite; }
          .pm-p { animation: mpPulse 3.2s cubic-bezier(0.4,0,0.2,1) infinite; }
          .pm-r { animation: mpBreath 2.4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .pm-t, .pm-p, .pm-r { animation: none !important; }
            .pm-t { opacity: 0.5; }
          }
        `}</style>
      )}

      <rect x="-25" y="0" width="50" height="47" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      <rect x="-8" y="0" width="16" height="19" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      <circle cx="0" cy="19" r="6" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      <path
        d="M -22,0 L -22,14 A 23.75 23.75 0 0 0 22 14 L 22,0"
        fill="none"
        stroke="var(--rule-strong)"
        strokeWidth="0.12"
      />
      <circle
        cx="0"
        cy="5.25"
        r="0.75"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="0.18"
        className={animated ? "pm-r" : undefined}
      />
      <line x1="-25" y1="47" x2="25" y2="47" stroke="var(--rule-strong)" strokeWidth="0.12" />

      {[
        { cx: 0, cy: 23, n: "1" },
        { cx: -16, cy: 18, n: "2" },
        { cx: 16, cy: 18, n: "3" },
        { cx: -20, cy: 4, n: "4" },
        { cx: -7, cy: 13, n: "5" },
      ].map((p) => (
        <g key={p.n}>
          <circle
            cx={p.cx}
            cy={p.cy}
            r="1.6"
            fill="var(--bg)"
            stroke="var(--fg)"
            strokeWidth="0.2"
          />
          <text
            x={p.cx}
            y={p.cy + 0.6}
            fill="var(--fg)"
            fontSize="2"
            textAnchor="middle"
            fontFamily="var(--font-body)"
            fontWeight="600"
          >
            {p.n}
          </text>
        </g>
      ))}

      <path
        d="M -7,13 Q -12,10 -16,12"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="0.2"
        strokeLinecap="round"
        strokeDasharray="8"
        opacity={animated ? undefined : 0.5}
        className={animated ? "pm-t" : undefined}
      />

      {animated && <circle r="0.55" fill="var(--orange)" className="pm-p" />}

      {label && (
        <text
          x="0"
          y="44"
          fill="var(--citation)"
          fontSize="1.6"
          textAnchor="middle"
          fontFamily={MONO}
          letterSpacing="0.1"
        >
          {label}
        </text>
      )}
    </svg>
  );
}
