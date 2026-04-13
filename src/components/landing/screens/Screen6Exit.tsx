"use client";

import { MONO, screenShell } from "./shared";

export default function Screen6Exit() {
  return (
    <div
      style={{
        ...screenShell,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--citation)",
          marginBottom: 16,
        }}
      >
        the screen closes
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: "-0.032em",
          color: "var(--fg)",
          lineHeight: 0.9,
          marginBottom: 20,
        }}
      >
        Motion
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--paper-dim)",
          textAlign: "center",
          maxWidth: 260,
          lineHeight: 1.55,
        }}
      >
        The coach leaves the phone on the bench and goes to coach the team.
      </div>
    </div>
  );
}
