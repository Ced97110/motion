// Copyright: Your Name. Apache 2.0
// Coach home — the #1 priority Intent Engine entrypoint.
//
// Instead of a static "dashboard" with menu tiles, this route runs the
// intent engine on the client's current signals and renders the
// assembly the engine chose. Every other coach route is a forced view
// of a specific intent; this route is the one that *picks* the intent.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssemblyRenderer } from "@/components/assemblies/AssemblyRenderer";
import { CoachShell } from "@/components/coach/CoachShell";
import { buildAssembly } from "@/lib/intent/assembly";
import { debugRankIntents, inferIntent } from "@/lib/intent/engine";
import { collectSignals } from "@/lib/intent/signals";
import type { Assembly, Intent, Signals } from "@/lib/intent/types";
import {
  ACCENT,
  BORDER_LIGHT,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

const KIND_ROUTE: Record<Intent["kind"], string> = {
  prepare_for_game: "/coach/game-day",
  run_practice: "/coach/practice",
  quick_adjustments: "/coach/halftime",
  study_and_prepare: "/plays",
  personal_development: "/coach",
};

const KIND_LABEL: Record<Intent["kind"], string> = {
  prepare_for_game: "Prepare for tonight's game",
  run_practice: "Run a good practice",
  quick_adjustments: "Quick adjustments",
  study_and_prepare: "Study and prepare",
  personal_development: "Personal development",
};

export default function CoachHome() {
  const [signals, setSignals] = useState<Signals | null>(null);

  // Re-collect signals every 60s so the inference stays fresh against
  // the wall clock (e.g., "hours until game" rolls forward over time).
  useEffect(() => {
    setSignals(collectSignals());
    const id = window.setInterval(() => setSignals(collectSignals()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { assembly, intent, candidates } = useMemo<{
    assembly: Assembly | null;
    intent: Intent | null;
    candidates: Intent[];
  }>(() => {
    if (!signals)
      return { assembly: null, intent: null, candidates: [] };
    const chosen = inferIntent(signals);
    return {
      intent: chosen,
      assembly: buildAssembly(chosen, signals),
      candidates: debugRankIntents(signals),
    };
  }, [signals]);

  return (
    <CoachShell
      title={assembly?.title ?? "Today"}
      subtitle={assembly?.subtitle ?? "Reading your signals…"}
      rationale={intent ? intent.reason : undefined}
      needsOnboarding={signals !== null && !signals.roster}
    >
      {assembly ? (
        <AssemblyRenderer assembly={assembly} />
      ) : null}

      {/* "Why this view?" drawer — candidate ranking with alt links. */}
      {candidates.length > 1 ? (
        <section
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: `1px solid ${BORDER_LIGHT}`,
            fontFamily: FONT_MONO,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: TEXT_DIM,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Not what you need? Jump to another intent
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {candidates
              .filter((c) => c.kind !== intent?.kind)
              .map((c) => (
                <Link
                  key={c.kind}
                  href={KIND_ROUTE[c.kind]}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: 12,
                    border: `1px solid ${BORDER_LIGHT}`,
                    textDecoration: "none",
                    color: TEXT_PRIMARY,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: ACCENT,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {Math.round(c.confidence * 100)}%
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {KIND_LABEL[c.kind]}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: TEXT_MUTED,
                      lineHeight: 1.5,
                    }}
                  >
                    {c.reason}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ) : null}
    </CoachShell>
  );
}
