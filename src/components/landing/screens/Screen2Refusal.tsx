"use client";

import { useMemo } from "react";
import { MONO, kickerLeft, kickerRight, screenHeader, screenShell, screenTitle } from "./shared";

const CHOSEN = [
  { name: "23-Flare", reason: "Their wings help early — flare catches them flat-footed." },
  { name: "Drag-Pitch", reason: "Their 5 plays drop coverage — pitch-back is a free look." },
  { name: "Zipper-Floppy", reason: "Their top defender is off-ball — 2 gets clean runways." },
  { name: "Box-Slip", reason: "They switch 1-5 on BLOB — slip beats the switch every time." },
];

export default function Screen2Refusal() {
  const ghosts = useMemo(() => Array.from({ length: 120 }, (_, i) => i), []);

  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>Tonight's decision</span>
        <span style={screenTitle}>934 → 4</span>
        <span style={kickerRight}>cull in 0:42</span>
      </div>

      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left column — the 934 */}
        <div
          style={{
            flex: "0 0 32%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--rule)",
            paddingRight: 12,
          }}
        >
          <div style={{ ...kickerLeft, marginBottom: 8 }}>In the book</div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              marginBottom: 10,
            }}
          >
            934
          </div>
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              position: "relative",
              minHeight: 0,
            }}
          >
            {ghosts.map((i) => (
              <div
                key={i}
                style={{
                  height: 2,
                  marginBottom: 1,
                  background: "var(--rule)",
                  opacity: Math.max(0.1, 0.85 - i * 0.005),
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, transparent 0%, transparent 60%, var(--bg) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: "var(--paper-dim)",
              marginTop: 10,
            }}
          >
            most apps stop here
          </div>
        </div>

        {/* Right column — the 4 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ ...kickerLeft, marginBottom: 8 }}>Chosen for tonight</div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              marginBottom: 10,
              color: "var(--fg)",
            }}
          >
            4
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {CHOSEN.map((c) => (
              <div
                key={c.name}
                style={{
                  borderLeft: "2px solid var(--orange)",
                  paddingLeft: 12,
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--paper-dim)",
                    lineHeight: 1.5,
                    marginTop: 4,
                  }}
                >
                  {c.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
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
        <span>culled on: opponent, roster, last game</span>
        <span>confidence 0.91</span>
      </div>
    </div>
  );
}
