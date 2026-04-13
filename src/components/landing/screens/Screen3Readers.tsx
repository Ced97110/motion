"use client";

import type { CSSProperties } from "react";
import { MONO, kickerLeft, kickerRight, screenHeader, screenShell, screenTitle, type ReaderRole } from "./shared";

interface Props {
  role: ReaderRole;
}

export default function Screen3Readers({ role }: Props) {
  return (
    <div style={screenShell}>
      <div style={screenHeader}>
        <span style={kickerLeft}>Same atoms · three assemblies</span>
        <span style={screenTitle}>
          {role === "coach" && "Coach · game night"}
          {role === "player" && "Player · my week"}
          {role === "student" && "Student · the page"}
        </span>
        <span style={kickerRight}>live</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {role === "coach" && <CoachView />}
        {role === "player" && <PlayerView />}
        {role === "student" && <StudentView />}
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--citation)",
        }}
      >
        <span>
          {role === "coach" && "signal: game day · roster · opponent"}
          {role === "player" && "signal: archetype · training load · assigned"}
          {role === "student" && "signal: reading history · dwell · referrer"}
        </span>
        <span>hover a row · screen re-assembles</span>
      </div>
    </div>
  );
}

/* ─────────── Coach ─────────── */
function CoachView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <MiniBlock label="Tonight · 4 plays">
        {["23-Flare", "Drag-Pitch", "Zipper-Floppy", "Box-Slip"].map((n) => (
          <Row key={n} left={n} right="87%" leftRule />
        ))}
      </MiniBlock>
      <MiniBlock label="Halftime chips · pre-loaded">
        <div style={{ fontSize: 12, color: "var(--paper-dim)", lineHeight: 1.6 }}>
          If their 3 is hot → zone. If their 5 fouls → post.
        </div>
      </MiniBlock>
      <MiniBlock label="Adjustments written by">
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          you,{" "}
          <span style={{ color: "var(--paper-dim)", fontWeight: 400 }}>
            on top of Motion&apos;s plan.
          </span>
        </div>
      </MiniBlock>
    </div>
  );
}

/* ─────────── Player ─────────── */
function PlayerView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <MiniBlock label="Your archetype · 78% Sharpshooter">
        <ArchetypeBar value={78} />
        <div style={{ ...kickerLeft, marginTop: 6 }}>
          traits · 62% Floor General · 41% Two-Way
        </div>
      </MiniBlock>
      <MiniBlock label="Your plays tonight · 2">
        <Row left="23-Flare · you set the screen" right="learn" leftRule />
        <Row left="Zipper-Floppy · you curl off 5" right="learn" leftRule />
      </MiniBlock>
      <MiniBlock label="Your drills · 3 scheduled">
        <Row left="Catch & shoot · 50 reps" right="12 left" />
        <Row left="Curl pocket · 40 reps" right="done" />
        <Row left="Eccentric squat · 3×8" right="Wed" />
      </MiniBlock>
    </div>
  );
}

/* ─────────── Student ─────────── */
function StudentView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <MiniBlock label="You are reading">
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>
          Horns · initial action
        </div>
        <div style={{ fontSize: 12, color: "var(--paper-dim)", lineHeight: 1.55 }}>
          Two high, two corners, one ball-handler. The geometry creates a
          1-through-5 read window in the first three dribbles.
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: "var(--citation)",
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px dotted var(--rule)",
          }}
        >
          — Motion wiki · representative excerpt
        </div>
      </MiniBlock>
      <MiniBlock label="Test yourself">
        <div style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.55, marginBottom: 8 }}>
          Opponent runs Horns. Their 5 hedges hard on the ball-screen. What do
          you call?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <QuizChip label="Slip to the rim" correct />
          <QuizChip label="Kick to the corner" />
          <QuizChip label="Re-screen" />
          <QuizChip label="Iso the ball-handler" />
        </div>
      </MiniBlock>
      <MiniBlock label="Your concept tree · 47 mastered">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["PnR basics", "Switching", "Ghosting", "Iverson cut", "Flare"].map((c, i) => (
            <span
              key={c}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                padding: "3px 7px",
                border: "1px solid var(--rule)",
                color: i < 3 ? "var(--fg)" : "var(--paper-dim)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </MiniBlock>
    </div>
  );
}

/* ─────────── shared mini-components ─────────── */
function MiniBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--rule)",
        background: "var(--signal)",
      }}
    >
      <div style={{ ...kickerLeft, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Row({
  left,
  right,
  leftRule,
}: {
  left: string;
  right: string;
  leftRule?: boolean;
}) {
  const row: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "6px 0 6px 10px",
    borderTop: "1px solid var(--rule)",
    borderLeft: leftRule ? "2px solid var(--orange)" : "2px solid transparent",
    marginLeft: leftRule ? -2 : 0,
  };
  return (
    <div style={row}>
      <span style={{ fontSize: 12 }}>{left}</span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: "var(--paper-dim)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {right}
      </span>
    </div>
  );
}

function ArchetypeBar({ value }: { value: number }) {
  return (
    <div
      style={{
        height: 4,
        background: "var(--rule)",
        position: "relative",
        marginTop: 4,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: `0 ${100 - value}% 0 0`,
          background: "var(--fg)",
        }}
      />
    </div>
  );
}

function QuizChip({ label, correct }: { label: string; correct?: boolean }) {
  return (
    <div
      style={{
        padding: "6px 8px",
        border: `1px solid ${correct ? "var(--fg)" : "var(--rule)"}`,
        fontSize: 11,
        color: correct ? "var(--fg)" : "var(--paper-dim)",
        fontWeight: correct ? 600 : 400,
      }}
    >
      {label}
    </div>
  );
}
