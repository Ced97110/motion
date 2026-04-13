"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const AutoPlayViewer = dynamic(() => import("./AutoPlayViewer"), {
  ssr: false,
  loading: () => <PosterCourt label="loading…" animated />,
});

export default function PlaybookShowcase() {
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Mobile detection — under 768px we skip the heavy AutoPlayViewer
  // hydration and rely on the CSS-animated poster instead.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (loaded || !sectionRef.current || isMobile) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoaded(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px 10% 0px" }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [loaded, isMobile]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="playbook-showcase-title"
      style={{
        borderTop: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        padding: "120px 0",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 48px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
          gap: 72,
          alignItems: "center",
        }}
        className="playbook-grid"
      >
        <header>
          <div style={kickerStyle}>Movement 02½ · The playbook, in motion</div>
          <h2 style={titleStyle}>
            A play is a decision animated into space and time.
          </h2>
          <p style={bodyStyle}>
            Every play in Motion is a vector diagram. Three phases. Six layers.
            Player paths drawn as Bézier curves. The animation is the teaching
            — you see the spacing, the read, and the counter before you read a
            word of coaching text.
          </p>
          <dl style={specGrid}>
            <SpecRow label="Play" value="23-Flare" />
            <SpecRow label="Alignment" value="vs. 2-3 zone" />
            <SpecRow label="Intent" value="Open three for the best shooter" />
            <SpecRow label="Phases" value="3" />
            <SpecRow label="Source" value="Motion wiki · 2,440 pp compiled" />
          </dl>
        </header>

        <div
          style={{
            position: "relative",
            background: "var(--signal)",
            border: "1px solid var(--rule)",
            padding: 16,
          }}
        >
          <FrameChrome />
          <div style={{ aspectRatio: "56 / 50", position: "relative" }}>
            {loaded && !isMobile ? (
              <AutoPlayViewer />
            ) : (
              <PosterCourt
                label={isMobile ? "23-Flare · loops on tap" : "press enter · plays on scroll"}
                animated
              />
            )}
          </div>
          <FrameFoot />
        </div>
      </div>

      <StructuredData />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 1023px) {
              .playbook-grid {
                grid-template-columns: 1fr !important;
                padding: 0 24px !important;
                gap: 40px !important;
              }
            }
          `,
        }}
      />
    </section>
  );
}

/* ─────────── styles ─────────── */
const kickerStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--citation)",
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "clamp(28px, 3.4vw, 42px)",
  fontWeight: 500,
  letterSpacing: "-0.018em",
  lineHeight: 1.12,
  color: "var(--fg)",
  marginBottom: 20,
  maxWidth: 520,
};

const bodyStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 17,
  lineHeight: 1.58,
  color: "var(--paper-dim)",
  maxWidth: 520,
  marginBottom: 32,
};

const specGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: "6px 20px",
  fontFamily: MONO,
  fontSize: 12,
  maxWidth: 520,
};

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt
        style={{
          color: "var(--citation)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontSize: 10,
          paddingTop: 2,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          color: "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          borderBottom: "1px dotted var(--rule)",
          paddingBottom: 6,
        }}
      >
        {value}
      </dd>
    </>
  );
}

/* ─────────── frame chrome (editorial framing) ─────────── */
function FrameChrome() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingBottom: 12,
        marginBottom: 14,
        borderBottom: "1px solid var(--rule)",
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--citation)",
      }}
    >
      <span>Animated play · 23-Flare</span>
      <span>3 phases · pure SVG</span>
    </div>
  );
}

function FrameFoot() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingTop: 12,
        marginTop: 14,
        borderTop: "1px solid var(--rule)",
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--citation)",
      }}
    >
      <span>No video file · no MP4 · pure vector</span>
      <span>— cited in the Motion wiki</span>
    </div>
  );
}

/* ─────────── static poster (SSR + no-JS + mobile fallback) ───────────
 * When `animated` is true, the orange flare cue arrow loops via
 * stroke-dashoffset and a small pulse travels along it. Pure CSS — no
 * React rAF, no JS beyond this render. Respects prefers-reduced-motion
 * (the keyframes reduce to 0ms via the global rule in globals.css).
 * Total weight added vs. static: ~300 bytes of inline <style>. */
function PosterCourt({ label, animated }: { label: string; animated?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-28 -3 56 50"
      role="img"
      aria-label="23-Flare play diagram · half-court showing 5 player positions and a cueing screen arrow"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        background: "var(--bg)",
      }}
    >
      {animated && (
        <style>{`
          @keyframes motionPosterTrace {
            0%   { stroke-dashoffset: 8; opacity: 0.15; }
            20%  { opacity: 0.9; }
            70%  { opacity: 0.9; }
            100% { stroke-dashoffset: 0; opacity: 0.15; }
          }
          @keyframes motionPosterPulse {
            0%   { transform: translate(-7px, 13px); opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translate(-16px, 12px); opacity: 0; }
          }
          @keyframes motionPosterBreath {
            0%, 100% { r: 0.75; opacity: 0.9; }
            50%      { r: 0.95; opacity: 1;   }
          }
          .mp-trace { animation: motionPosterTrace 3.2s cubic-bezier(0.4,0,0.2,1) infinite; }
          .mp-pulse { animation: motionPosterPulse 3.2s cubic-bezier(0.4,0,0.2,1) infinite; }
          .mp-rim   { animation: motionPosterBreath 2.4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .mp-trace, .mp-pulse, .mp-rim { animation: none !important; }
            .mp-trace { opacity: 0.5; }
          }
        `}</style>
      )}

      {/* Court outline */}
      <rect x="-25" y="0" width="50" height="47" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      {/* Key */}
      <rect x="-8" y="0" width="16" height="19" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      {/* Free throw circle */}
      <circle cx="0" cy="19" r="6" fill="none" stroke="var(--rule-strong)" strokeWidth="0.12" />
      {/* 3pt arc */}
      <path
        d="M -22,0 L -22,14 A 23.75 23.75 0 0 0 22 14 L 22,0"
        fill="none"
        stroke="var(--rule-strong)"
        strokeWidth="0.12"
      />
      {/* Rim — breathes subtly when animated */}
      <circle
        cx="0"
        cy="5.25"
        r="0.75"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="0.18"
        className={animated ? "mp-rim" : undefined}
      />
      {/* Halfcourt line */}
      <line x1="-25" y1="47" x2="25" y2="47" stroke="var(--rule-strong)" strokeWidth="0.12" />

      {/* Player dots — starting formation */}
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

      {/* Flare screen cue — animated arrow from 5 to flare point */}
      <path
        d="M -7,13 Q -12,10 -16,12"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="0.2"
        strokeLinecap="round"
        strokeDasharray="8"
        opacity={animated ? undefined : 0.5}
        className={animated ? "mp-trace" : undefined}
      />

      {/* Moving ball pulse (mobile animation) */}
      {animated && (
        <circle r="0.55" fill="var(--orange)" className="mp-pulse" />
      )}

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
    </svg>
  );
}

/* ─────────── structured data (SEO) ───────────
 * Schema.org/HowTo is used rather than VideoObject because the animation is
 * a vector diagram, not a video file. Production URLs are intentionally
 * omitted — the embedding page canonicalizes via next/metadata. */
function StructuredData() {
  const json = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "23-Flare · animated play diagram",
    description:
      "Animated diagram of the 23-Flare basketball play — a quick-hitter against a 2-3 zone that frees the best shooter for an open three. Three phases, player paths rendered as Bézier curves.",
    inLanguage: "en",
    citation: {
      "@type": "CreativeWork",
      name: "Motion compiled coaching wiki",
    },
    step: [
      { "@type": "HowToStep", name: "Phase 1 — Initial action", text: "Set Horns alignment; ball swings to the wing to initiate." },
      { "@type": "HowToStep", name: "Phase 2 — Flare screen", text: "High-post sets the flare; shooter fades to the weak-side wing." },
      { "@type": "HowToStep", name: "Phase 3 — Catch and shoot", text: "Ball is reversed into the shooter's open pocket." },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
