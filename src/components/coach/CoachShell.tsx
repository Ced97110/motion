// Copyright: Your Name. Apache 2.0
// CoachShell — page chrome shared by every coach assembly view.

"use client";

import Link from "next/link";
import { useEffect } from "react";
import Wordmark from "@/components/brand/Wordmark";
import {
  ACCENT,
  BG_PAGE,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import { coachStore } from "@/lib/store/coach-store";

export interface CoachShellProps {
  title: string;
  subtitle: string;
  /** Optional rationale shown in a small "Why this view?" drawer. */
  rationale?: string;
  children: React.ReactNode;
  /** When true, no roster is present — surface onboarding CTA. */
  needsOnboarding?: boolean;
}

const NAV_LINKS = [
  { href: "/coach", label: "TODAY" },
  { href: "/coach/game-day", label: "GAME DAY" },
  { href: "/coach/practice", label: "PRACTICE" },
  { href: "/coach/halftime", label: "HALFTIME" },
  { href: "/plays", label: "PLAYBOOK" },
];

export function CoachShell({
  title,
  subtitle,
  rationale,
  children,
  needsOnboarding,
}: CoachShellProps) {
  // Auto-seed demo data on first visit so the engine has signals to reason
  // about. Safe to call repeatedly — no-op when already seeded.
  useEffect(() => {
    coachStore.seedMockCoach();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG_PAGE,
        color: TEXT_PRIMARY,
        fontFamily: FONT_MONO,
      }}
    >
      <nav
        style={{
          display: "flex",
          borderBottom: `1px solid ${BORDER_STRONG}`,
          padding: "12px 24px",
          gap: 16,
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: BG_PAGE,
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{ color: TEXT_PRIMARY, textDecoration: "none" }}
        >
          <Wordmark size="navSm" />
        </Link>
        <span style={{ color: TEXT_DIM }}>·</span>
        <div style={{ display: "flex", gap: 1 }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 10,
                padding: "6px 12px",
                color: TEXT_MUTED,
                textDecoration: "none",
                border: `1px solid ${BORDER_STRONG}`,
                letterSpacing: 1.5,
                marginLeft: -1,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <main style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              margin: 0,
              color: TEXT_PRIMARY,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: TEXT_MUTED,
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </p>
          {rationale ? (
            <p
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginTop: 12,
              }}
            >
              Why this view? <span style={{ color: ACCENT }}>{rationale}</span>
            </p>
          ) : null}
        </header>

        {needsOnboarding ? (
          <div
            style={{
              border: `1px solid ${ACCENT}`,
              padding: 16,
              marginBottom: 24,
              fontSize: 12,
              color: TEXT_PRIMARY,
            }}
          >
            Your roster isn&apos;t set up.{" "}
            <Link
              href="/coach/setup"
              style={{ color: ACCENT, textDecoration: "underline" }}
            >
              Seed demo data
            </Link>{" "}
            to preview the intent engine.
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
