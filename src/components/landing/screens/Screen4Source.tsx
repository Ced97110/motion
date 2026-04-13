"use client";

import { MONO, kickerLeft, kickerRight, screenHeader, screenShell, screenTitle, signalChip } from "./shared";

export default function Screen4Source() {
  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>Answer · source</span>
        <span style={screenTitle}>23-Flare → the wiki</span>
        <span style={kickerRight}>traced in 0:03</span>
      </div>

      {/* The answer card */}
      <div
        style={{
          padding: "12px 14px",
          borderLeft: "2px solid var(--orange)",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          marginBottom: 0,
        }}
      >
        <div style={{ ...kickerLeft, marginBottom: 4 }}>Motion recommends</div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
          23-Flare
        </div>
        <div style={{ fontSize: 12, color: "var(--paper-dim)", marginTop: 4, lineHeight: 1.5 }}>
          vs. Lincoln · quick hitter · 87% fit
        </div>
      </div>

      {/* The trace */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 0 10px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--citation)",
          }}
        >
          traces to
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--rule-strong)" }} />
      </div>

      {/* The page */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: 14,
          padding: "16px 18px",
          border: "1px solid var(--rule)",
          background: "var(--signal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <span style={kickerLeft}>Motion wiki · representative excerpt</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            2,440 pp.
          </span>
        </div>

        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--paper-dim)",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <p>
            The flare screen is the counter to defenses that help aggressively on
            the strong side. When the wings hedge toward the ball, the shooter
            comes off the flare into the open pocket on the weak side.
          </p>
          <p style={{ marginTop: 8, color: "var(--fg)", fontWeight: 500 }}>
            The geometry that makes it work: the screener sets the flare at the
            elbow, facing the passer, so the shooter&apos;s cut pulls away from
            the help rather than into it. On catch, the shooter should be
            moving, not stationary.
          </p>
          <p style={{ marginTop: 8 }}>
            Against a 2-3 wing rotation, the flare window opens for approximately
            0.8 seconds — the interval between the opposite wing stepping up and
            the weak-side forward recovering.
          </p>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background:
                "linear-gradient(to bottom, transparent, var(--signal))",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={signalChip}>cited · 2,440 pp indexed</span>
        <span style={signalChip}>no search · compiled wiki</span>
      </div>
    </div>
  );
}
