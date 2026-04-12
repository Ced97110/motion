// Copyright: Your Name. Apache 2.0

"use client";

import { useEffect, useMemo, useState } from "react";
import { AssemblyRenderer } from "@/components/assemblies/AssemblyRenderer";
import { CoachShell } from "@/components/coach/CoachShell";
import { buildAssembly } from "@/lib/intent/assembly";
import { collectSignals } from "@/lib/intent/signals";
import type { Assembly, Signals } from "@/lib/intent/types";

export default function PracticePage() {
  const [signals, setSignals] = useState<Signals | null>(null);

  useEffect(() => {
    setSignals(collectSignals());
  }, []);

  const assembly: Assembly | null = useMemo(() => {
    if (!signals) return null;
    // Always render the practice assembly on this route — the dashboard at
    // /coach is what chooses between intents dynamically.
    return buildAssembly(
      {
        kind: "run_practice",
        confidence: 1,
        reason: "Forced by route — /coach/practice",
        context: {
          hours_until_practice: null,
          last_game_breakdowns: signals.game_history?.[0]?.breakdowns ?? [],
        },
      },
      signals,
    );
  }, [signals]);

  return (
    <CoachShell
      title={assembly?.title ?? "Practice"}
      subtitle={
        assembly?.subtitle ??
        "Loading today's practice plan…"
      }
      rationale={assembly?.intent.reason}
      needsOnboarding={signals !== null && !signals.roster}
    >
      {assembly ? <AssemblyRenderer assembly={assembly} /> : null}
    </CoachShell>
  );
}
