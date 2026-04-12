// Copyright: Your Name. Apache 2.0
// AssemblyRenderer — translates an Assembly descriptor into React.
//
// Responsibility: look up the right atom for each AtomSpec.id and pass
// through props. New atoms are registered once in the ATOM_MAP below.

"use client";

import dynamic from "next/dynamic";
import { ChipGrid } from "@/components/atoms/ObservationChip";
import { DrillList } from "@/components/atoms/DrillBlock";
import { MatchupList } from "@/components/atoms/MatchupRow";
import { MuscleMap } from "@/components/atoms/MuscleMap";
import { PlayCardGrid } from "@/components/atoms/PlayCard";
import { ProgressBars } from "@/components/atoms/ProgressBars";
import { StatCellsRow } from "@/components/atoms/StatCell";
import { Timer } from "@/components/atoms/Timer";
import { weaksideFlareSlip } from "@/data/plays/weakside-flare-slip";
import {
  ACCENT,
  BORDER_LIGHT,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import type {
  AtomSpec,
  Assembly,
  RosterPlayer,
} from "@/lib/intent/types";
import type { MatchupRowProps } from "@/components/atoms/MatchupRow";
import type { DrillBlockProps } from "@/components/atoms/DrillBlock";
import type { TimerBlock } from "@/components/atoms/Timer";

// PlayViewer is client-only and heavy — lazy load it.
const PlayViewer = dynamic(() => import("@/components/viewer/PlayViewer"), {
  ssr: false,
});

// ── Stubbed ai_answer atom (kept local — renderer-only) ────────────────

interface AiAnswerProps {
  placeholder?: string;
  /** When set, renders the provided 3-bullet answer in a dark callout. */
  answer?: string[];
  /** When set, renders a primary button that emits the callback. */
  onRequest?: () => void;
  requestLabel?: string;
  requestDisabled?: boolean;
}

function AiAnswer({
  placeholder,
  answer,
  onRequest,
  requestLabel,
  requestDisabled,
}: AiAnswerProps) {
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        border: `1px solid ${BORDER_LIGHT}`,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {answer && answer.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {answer.map((line, i) => (
            <li
              key={i}
              style={{
                fontSize: 12,
                color: TEXT_PRIMARY,
                lineHeight: 1.6,
                paddingLeft: 18,
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", left: 0, color: ACCENT }}>
                ▸
              </span>
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <span style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }}>
          {placeholder ?? "AI response will appear here."}
        </span>
      )}
      {onRequest ? (
        <button
          type="button"
          onClick={onRequest}
          disabled={requestDisabled}
          style={{
            alignSelf: "flex-start",
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: 1.5,
            padding: "8px 16px",
            background: requestDisabled ? "transparent" : ACCENT,
            color: requestDisabled ? TEXT_DIM : "#ffffff",
            border: `1px solid ${requestDisabled ? TEXT_DIM : ACCENT}`,
            cursor: requestDisabled ? "not-allowed" : "pointer",
            borderRadius: 0,
            textTransform: "uppercase",
          }}
        >
          {requestLabel ?? "Get answer"}
        </button>
      ) : null}
    </div>
  );
}

// ── Per-atom dispatchers ───────────────────────────────────────────────

function CourtDiagramAtom({
  slug,
  autoplay: _autoplay,
}: {
  slug: string;
  autoplay: boolean;
}) {
  // Only the Weakside Flare Slip has coordinate data shipped. Other slugs
  // degrade to the default play — the view intentionally does NOT invent
  // coordinate data it can't verify.
  void _autoplay;
  if (slug !== "weakside-flare-slip") {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: TEXT_DIM,
          border: `1px dashed ${BORDER_LIGHT}`,
        }}
      >
        Court diagram for &quot;{slug}&quot; not yet ingested — coordinate
        extraction pipeline pending.
      </div>
    );
  }
  return <PlayViewer play={weaksideFlareSlip} />;
}

function atomHeading(heading?: string) {
  if (!heading) return null;
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 9,
        color: TEXT_DIM,
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {heading}
    </div>
  );
}

// Type-narrowing helpers — the atom spec is a union in disguise. We use
// small runtime guards to keep view code readable.

interface StatCellsProps {
  cells: Array<{ label: string; value: string | number; accent?: string }>;
}

interface MatchupProps {
  rows: MatchupRowProps[];
}

interface PlayCardsProps {
  count: number;
  recommend_tags: string[] | null;
}

interface DrillsProps {
  drills: DrillBlockProps[];
}

interface TimerPropsShape {
  duration_min?: number;
  blocks?: TimerBlock[];
  preset?: string;
}

interface MuscleMapPropsShape {
  load: Record<string, number>;
}

interface ObservationChipsProps {
  chips: Array<{ id: string; label: string }>;
}

interface ProgressBarsPropsShape {
  skills: RosterPlayer["skills"] | null;
}

interface CourtDiagramProps {
  play_slug: string;
  autoplay: boolean;
}

interface ToggleGroupProps {
  options: string[];
  active: string;
}

interface RenderAtomProps {
  spec: AtomSpec;
  // Callbacks routed to specific atoms based on id.
  onChipToggle?: (id: string) => void;
  activeChips?: Set<string>;
  chipMax?: number;
  aiAnswer?: string[];
  onAiRequest?: () => void;
  aiRequestDisabled?: boolean;
  aiRequestLabel?: string;
  playRecommendations?: Array<{
    slug: string;
    name: string;
    tag: string;
    reason?: string;
  }>;
}

/** Narrow an atom's props bag to a specific shape. Atoms own their schema. */
function propsAs<T>(spec: AtomSpec): T {
  return spec.props as unknown as T;
}

export function RenderAtom({
  spec,
  onChipToggle,
  activeChips,
  chipMax,
  aiAnswer,
  onAiRequest,
  aiRequestDisabled,
  aiRequestLabel,
  playRecommendations,
}: RenderAtomProps) {
  const wrap = (node: React.ReactNode) => (
    <section style={{ marginBottom: 24 }}>
      {atomHeading(spec.heading)}
      {node}
    </section>
  );

  switch (spec.id) {
    case "stat_cells":
      return wrap(<StatCellsRow {...propsAs<StatCellsProps>(spec)} />);
    case "matchup_rows":
      return wrap(<MatchupList {...propsAs<MatchupProps>(spec)} />);
    case "play_cards": {
      const cfg = propsAs<PlayCardsProps>(spec);
      const plays = playRecommendations?.slice(0, cfg.count) ?? [];
      return wrap(
        plays.length > 0 ? (
          <PlayCardGrid plays={plays} columns={2} />
        ) : (
          <div
            style={{
              padding: 20,
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: TEXT_DIM,
              border: `1px dashed ${BORDER_LIGHT}`,
            }}
          >
            No ranked plays yet — wiki ingestion must complete before the
            recommender populates here.
          </div>
        ),
      );
    }
    case "court_diagram": {
      const cfg = propsAs<CourtDiagramProps>(spec);
      return wrap(
        <CourtDiagramAtom slug={cfg.play_slug} autoplay={cfg.autoplay} />,
      );
    }
    case "drill_blocks":
      return wrap(<DrillList {...propsAs<DrillsProps>(spec)} />);
    case "timer":
      return wrap(<Timer {...propsAs<TimerPropsShape>(spec)} />);
    case "muscle_map":
      return wrap(<MuscleMap {...propsAs<MuscleMapPropsShape>(spec)} />);
    case "observation_chips": {
      const cfg = propsAs<ObservationChipsProps>(spec);
      return wrap(
        <ChipGrid
          chips={cfg.chips}
          activeIds={activeChips ?? new Set()}
          onToggle={onChipToggle ?? (() => {})}
          maxActive={chipMax}
        />,
      );
    }
    case "ai_answer":
      return wrap(
        <AiAnswer
          placeholder={propsAs<{ placeholder?: string }>(spec).placeholder}
          answer={aiAnswer}
          onRequest={onAiRequest}
          requestDisabled={aiRequestDisabled}
          requestLabel={aiRequestLabel}
        />,
      );
    case "progress_bars":
      return wrap(<ProgressBars {...propsAs<ProgressBarsPropsShape>(spec)} />);
    case "toggle_group": {
      const cfg = propsAs<ToggleGroupProps>(spec);
      return wrap(
        <div style={{ display: "flex", fontFamily: FONT_MONO }}>
          {cfg.options.map((opt) => {
            const active = opt === cfg.active;
            return (
              <span
                key={opt}
                style={{
                  padding: "8px 14px",
                  fontSize: 11,
                  border: `1px solid ${BORDER_LIGHT}`,
                  marginLeft: -1,
                  background: active ? ACCENT : "transparent",
                  color: active ? "#ffffff" : TEXT_MUTED,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {opt}
              </span>
            );
          })}
        </div>,
      );
    }
    case "roster_grid":
    case "phase_tabs":
    case "breadcrumb":
    default:
      return wrap(
        <div
          style={{
            padding: 12,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: TEXT_DIM,
            border: `1px dashed ${BORDER_LIGHT}`,
          }}
        >
          atom &quot;{spec.id}&quot; not yet implemented
        </div>,
      );
  }
}

export interface AssemblyRendererProps {
  assembly: Assembly;
  /** Injected interactive state for stateful atoms (chips / ai_answer). */
  interactive?: Omit<RenderAtomProps, "spec">;
}

export function AssemblyRenderer({
  assembly,
  interactive,
}: AssemblyRendererProps) {
  return (
    <div style={{ fontFamily: FONT_MONO }}>
      {assembly.atoms.map((spec, i) => (
        <RenderAtom key={`${spec.id}-${i}`} spec={spec} {...interactive} />
      ))}
    </div>
  );
}
