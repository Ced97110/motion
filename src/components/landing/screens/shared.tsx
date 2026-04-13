"use client";

import type { CSSProperties } from "react";

export const MONO =
  "ui-monospace, SFMono-Regular, Menlo, monospace";

export type DemoStage = 1 | 2 | 3 | 4 | 5 | 6;
export type ReaderRole = "coach" | "player" | "student";

export const screenShell: CSSProperties = {
  position: "relative",
  padding: "22px",
  border: "1px solid var(--rule)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontFamily: "var(--font-body)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const screenHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  paddingBottom: 12,
  marginBottom: 14,
  borderBottom: "1px solid var(--rule)",
};

export const kickerLeft: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--citation)",
};

export const kickerRight: CSSProperties = {
  ...kickerLeft,
  textAlign: "right",
};

export const screenTitle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "var(--fg)",
};

export const signalChip: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--citation)",
  padding: "4px 8px",
  border: "1px solid var(--rule)",
};
