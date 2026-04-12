// Copyright: Your Name. Apache 2.0

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssemblyRenderer } from "@/components/assemblies/AssemblyRenderer";
import { CoachShell } from "@/components/coach/CoachShell";
import { buildAssembly } from "@/lib/intent/assembly";
import { collectSignals } from "@/lib/intent/signals";
import type { Assembly, Signals } from "@/lib/intent/types";
import { stubAdjustments } from "@/lib/halftime/prompt";

const MAX_CHIPS = 4;

type AnswerSource = "claude" | "stub";

export default function HalftimePage() {
  const [signals, setSignals] = useState<Signals | null>(null);
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState<string[] | undefined>(undefined);
  const [source, setSource] = useState<AnswerSource | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSignals(collectSignals());
  }, []);

  const assembly: Assembly | null = useMemo(() => {
    if (!signals) return null;
    return buildAssembly(
      {
        kind: "quick_adjustments",
        confidence: 1,
        reason: "Forced by route — /coach/halftime",
        context: {},
      },
      signals,
    );
  }, [signals]);

  const onChipToggle = useCallback((id: string) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CHIPS) next.add(id);
      return next;
    });
    // Clear a stale answer whenever inputs change.
    setAnswer(undefined);
    setSource(undefined);
  }, []);

  const onAiRequest = useCallback(async () => {
    if (activeChips.size === 0 || !signals) return;
    setLoading(true);
    try {
      const response = await fetch("/api/halftime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations: Array.from(activeChips),
          level: signals.level ?? "u14",
          partial_box: {},
        }),
      });
      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }
      const json = (await response.json()) as {
        bullets: string[];
        source: AnswerSource;
      };
      setAnswer(json.bullets);
      setSource(json.source);
    } catch {
      // Network-level failure → local stub so the UX never dead-ends.
      setAnswer(stubAdjustments(Array.from(activeChips)));
      setSource("stub");
    } finally {
      setLoading(false);
    }
  }, [activeChips, signals]);

  const aiRequestDisabled = activeChips.size === 0 || loading;
  const aiRequestLabel = loading
    ? "Thinking…"
    : activeChips.size === 0
      ? "Tap 1+ chip"
      : `Get ${activeChips.size} → 3 adjustments`;

  return (
    <CoachShell
      title={assembly?.title ?? "Halftime"}
      subtitle={assembly?.subtitle ?? ""}
      rationale={assembly?.intent.reason}
    >
      {assembly ? (
        <AssemblyRenderer
          assembly={assembly}
          interactive={{
            activeChips,
            onChipToggle,
            chipMax: MAX_CHIPS,
            aiAnswer: answer,
            onAiRequest,
            aiRequestDisabled,
            aiRequestLabel,
          }}
        />
      ) : null}
      {source ? <SourcePill source={source} /> : null}
    </CoachShell>
  );
}

function SourcePill({ source }: { source: AnswerSource }) {
  const isClaude = source === "claude";
  return (
    <div
      style={{
        marginTop: -12,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 8,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: isClaude ? "#22c55e" : "#f97316",
      }}
    >
      {isClaude ? "◉ Live Claude response" : "◌ Local fallback (no API key)"}
    </div>
  );
}
