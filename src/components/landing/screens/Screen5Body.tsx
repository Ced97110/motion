"use client";

import { MONO, kickerLeft, kickerRight, screenHeader, screenShell, screenTitle } from "./shared";

export default function Screen5Body() {
  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>Player 4 · Sharpshooter</span>
        <span style={screenTitle}>Q4 shot falls short</span>
        <span style={kickerRight}>explained</span>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Muscle map */}
        <div
          style={{
            flex: "0 0 36%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid var(--rule)",
            paddingRight: 14,
          }}
        >
          <svg viewBox="0 0 90 170" style={{ width: 100, height: 180 }}>
            <g fill="none" stroke="var(--rule-strong)" strokeWidth="1.3">
              <ellipse cx="45" cy="18" rx="11" ry="13" />
              <path d="M31 32 L31 60 L18 98 M59 32 L59 60 L72 98" />
              <path d="M31 58 L59 58" />
              <path d="M33 60 L26 120 L24 160 M57 60 L64 120 L66 160" />
            </g>
            <path
              d="M57 60 L64 120"
              stroke="var(--orange)"
              strokeWidth="3.5"
              strokeLinecap="square"
              fill="none"
            />
            <circle cx="62" cy="100" r="14" fill="none" stroke="var(--orange)" strokeWidth="1" opacity="0.4" />
          </svg>
          <div
            style={{
              ...kickerLeft,
              marginTop: 14,
              color: "var(--orange)",
              textAlign: "center",
            }}
          >
            Right quadriceps
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: "var(--paper-dim)",
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            load +18% vs 14-day
          </div>
        </div>

        {/* The chain */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...kickerLeft }}>The cause chain</div>

          <ChainStep
            num="01"
            label="Observed"
            body="Player 4 shoots 42% in Q1–Q3, 26% in Q4 across last 6 games."
          />
          <ChainStep
            num="02"
            label="Body reads"
            body="Right quadriceps endurance below archetype median. Eccentric load +18%."
          />
          <ChainStep
            num="03"
            label="Mechanism"
            body="Tired quads shorten jump arc. Ball leaves the hand at ~8.2 ft vs. his 8.7 ft baseline."
          />
          <ChainStep
            num="04"
            label="Prescription"
            body="Eccentric squats, 3 × 8. Bulgarian split, 2 × 10 ea. Wed + Fri for 4 wks."
            highlight
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--rule)",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--citation)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Basketball Anatomy · Skills &amp; Drills</span>
        <span>body is a layer, not a tab</span>
      </div>
    </div>
  );
}

function ChainStep({
  num,
  label,
  body,
  highlight,
}: {
  num: string;
  label: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        columnGap: 12,
        paddingBottom: 8,
        borderBottom: "1px solid var(--rule)",
        borderLeft: highlight ? "2px solid var(--orange)" : "2px solid transparent",
        paddingLeft: highlight ? 10 : 12,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: highlight ? "var(--fg)" : "var(--citation)",
        }}
      >
        {num}
      </span>
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--citation)",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: highlight ? "var(--fg)" : "var(--paper-dim)",
            fontWeight: highlight ? 500 : 400,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
