// Copyright: Your Name. Apache 2.0
// Simple setup page — seeds mock data and routes back to /coach.

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ACCENT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import { coachStore } from "@/lib/store/coach-store";

export default function SetupPage() {
  const [seeded, setSeeded] = useState(false);
  const [wiped, setWiped] = useState(false);

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "64px auto",
        padding: 24,
        fontFamily: FONT_MONO,
        color: TEXT_PRIMARY,
      }}
    >
      <h1 style={{ fontSize: 22, margin: 0, letterSpacing: "-0.5px" }}>
        Demo data
      </h1>
      <p
        style={{
          fontSize: 12,
          color: TEXT_MUTED,
          marginTop: 8,
          lineHeight: 1.6,
        }}
      >
        Until the FastAPI backend ships, the intent engine reads from
        localStorage. Seed a mock roster, schedule, and game history to
        exercise the Game Day / Practice / Halftime assemblies end-to-end.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 24,
          padding: 16,
          border: `1px solid ${BORDER_STRONG}`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            coachStore.reset();
            coachStore.seedMockCoach();
            setSeeded(true);
            setWiped(false);
          }}
          style={primaryBtn}
        >
          Seed mock coach → (team 5 roster, game in 5h)
        </button>
        <button
          type="button"
          onClick={() => {
            coachStore.reset();
            setWiped(true);
            setSeeded(false);
          }}
          style={secondaryBtn}
        >
          Reset everything
        </button>
        {seeded ? (
          <span style={{ fontSize: 11, color: "#22c55e" }}>
            ✓ Seeded. Go to{" "}
            <Link href="/coach" style={{ color: ACCENT }}>
              /coach
            </Link>
            .
          </span>
        ) : null}
        {wiped ? (
          <span style={{ fontSize: 11, color: TEXT_DIM }}>
            Storage cleared. Visit{" "}
            <Link href="/coach" style={{ color: ACCENT }}>
              /coach
            </Link>{" "}
            to re-seed automatically.
          </span>
        ) : null}
      </div>
    </main>
  );
}

const primaryBtn: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  padding: "12px 16px",
  background: ACCENT,
  color: "#ffffff",
  border: `1px solid ${ACCENT}`,
  textAlign: "left",
  cursor: "pointer",
  borderRadius: 0,
  letterSpacing: 0.5,
};

const secondaryBtn: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  padding: "12px 16px",
  background: "transparent",
  color: TEXT_MUTED,
  border: `1px solid ${BORDER_STRONG}`,
  textAlign: "left",
  cursor: "pointer",
  borderRadius: 0,
  letterSpacing: 0.5,
};
