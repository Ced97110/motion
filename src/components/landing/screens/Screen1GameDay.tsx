"use client";

import type { CSSProperties } from "react";
import {
  MONO,
  kickerLeft,
  kickerRight,
  screenHeader,
  screenShell,
  screenTitle,
  signalChip,
} from "./shared";

const PLAYS = [
  { tag: "Set · Horns", name: "23-Flare", detail: "quick hitter vs. 2-3 zone", fit: 87 },
  { tag: "Set · Ball-screen", name: "Drag-Pitch", detail: "vs. drop coverage · open 3", fit: 82 },
  { tag: "ATO · Side", name: "Zipper-Floppy", detail: "vs. man · clean look for 2", fit: 79 },
  { tag: "BLOB", name: "Box-Slip", detail: "vs. switching · short corner", fit: 74 },
];

const ROSTER = [
  { num: "4", pos: "PG", name: "Player 1", matchup: "6'0\" · 71% fit", load: 61 },
  { num: "11", pos: "SG", name: "Player 2", matchup: "6'3\" · 83% fit", load: 54 },
  { num: "23", pos: "SF", name: "Player 3", matchup: "6'5\" · 68% fit", load: 72 },
  { num: "32", pos: "PF", name: "Player 4", matchup: "6'7\" · 76% fit", load: 118 },
  { num: "50", pos: "C", name: "Player 5", matchup: "6'9\" · 62% fit", load: 66 },
];

export default function Screen1GameDay() {
  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>THU 5:47 PM · HOME</span>
        <span style={screenTitle}>vs. Lincoln</span>
        <span style={kickerRight}>Lv.4 · Intermediate</span>
      </div>

      <Section kicker="Tonight's plan · 4 plays chosen" right="assembled 0:42 ago">
        <div style={{ display: "grid", gap: 8 }}>
          {PLAYS.map((p) => (
            <PlayRow key={p.name} p={p} />
          ))}
        </div>
      </Section>

      <Section kicker="Matchups · 5 starters" right="load vs. 14-day avg">
        <div>
          {ROSTER.map((r) => (
            <RosterRow key={r.num} r={r} />
          ))}
        </div>
      </Section>

      <Section kicker="Halftime · pre-loaded" right="2 chips ready">
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--rule)",
            background: "var(--signal)",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          If their 3 is hot <span style={{ color: "var(--paper-dim)" }}>→</span> switch to 2-3 zone.
          <br />
          If their 5 picks up fouls <span style={{ color: "var(--paper-dim)" }}>→</span> attack the post.
        </div>
      </Section>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={signalChip}>signal: schedule</span>
        <span style={signalChip}>signal: roster</span>
        <span style={signalChip}>signal: last game</span>
        <span style={signalChip}>signal: time</span>
      </div>
    </div>
  );
}

function Section({
  kicker,
  right,
  children,
}: {
  kicker: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={kickerLeft}>{kicker}</span>
        {right && <span style={kickerRight}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function PlayRow({ p }: { p: typeof PLAYS[number] }) {
  const card: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    padding: "8px 12px 8px 10px",
    borderTop: "1px solid var(--rule)",
    borderBottom: "1px solid var(--rule)",
    borderLeft: "2px solid var(--orange)",
  };
  return (
    <div style={card}>
      <div>
        <div style={{ ...kickerLeft, marginBottom: 3 }}>{p.tag}</div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "var(--paper-dim)" }}>{p.detail}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {p.fit}
          <span style={{ fontSize: 11, opacity: 0.5 }}>%</span>
        </div>
        <div style={{ ...kickerLeft, marginTop: 0 }}>fit</div>
      </div>
    </div>
  );
}

function RosterRow({ r }: { r: typeof ROSTER[number] }) {
  const row: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "26px 34px 1fr auto",
    columnGap: 10,
    alignItems: "center",
    padding: "8px 2px",
    borderTop: "1px solid var(--rule)",
  };
  return (
    <div style={row}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {r.num}
      </span>
      <span style={kickerLeft}>{r.pos}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{r.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--paper-dim)" }}>{r.matchup}</div>
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          color: r.load > 100 ? "var(--orange)" : "var(--paper-dim)",
        }}
      >
        {r.load}%
      </span>
    </div>
  );
}
