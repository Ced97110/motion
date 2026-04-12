"use client";

import { BALL_ORANGE, BALL_DARK } from "@/lib/design-tokens";

interface ControlsBarProps {
  phases: Array<{ label: string }>;
  phaseIdx: number;
  onPhaseClick: (index: number) => void;
  isAnimating: boolean;
  ballLabel: string;
  labelMode: number;
  labelModes: string[];
  onCycleLabel: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const TEXT = "#a1a1aa";
const BORDER = "rgba(255,255,255,0.22)";
const ACCENT = "#f97316";
const MUTED = "#63636e";

export default function ControlsBar({
  phases,
  phaseIdx,
  onPhaseClick,
  isAnimating,
  ballLabel,
  labelMode,
  labelModes,
  onCycleLabel,
  onPrev,
  onNext,
  onReset,
}: ControlsBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Phase toggle group */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {phases.map((phase, i) => {
          const isActive = i === phaseIdx;
          return (
            <button
              key={phase.label}
              onClick={() => onPhaseClick(i)}
              disabled={isAnimating}
              style={{
                width: 24,
                height: 24,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: FONT_FAMILY,
                color: isActive ? "#fff" : TEXT,
                background: isActive ? ACCENT : "transparent",
                border: `1px solid ${isActive ? ACCENT : BORDER}`,
                borderLeft:
                  i === 0
                    ? `1px solid ${isActive ? ACCENT : BORDER}`
                    : "none",
                borderRadius: 0,
                cursor: isAnimating ? "default" : "pointer",
                opacity: isAnimating ? 0.5 : 1,
                padding: 0,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {phase.label}
            </button>
          );
        })}
      </div>

      {/* Ball indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <svg width={10} height={10}>
          <circle cx={5} cy={5} r={5} fill={BALL_ORANGE ?? "#f97316"} />
        </svg>
        <span
          style={{
            fontSize: 10,
            color: MUTED,
            fontFamily: FONT_FAMILY,
          }}
        >
          {ballLabel}
        </span>
      </div>

      {/* Label toggle */}
      <button
        onClick={onCycleLabel}
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 0,
          background: "transparent",
          color: TEXT,
          fontSize: 9,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          padding: "2px 8px",
          cursor: "pointer",
          lineHeight: 1.4,
        }}
      >
        {labelModes[labelMode]}
      </button>

      {/* Nav controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={onPrev}
          disabled={isAnimating}
          style={{
            fontSize: 16,
            color: TEXT,
            background: "none",
            border: "none",
            borderRadius: 0,
            cursor: isAnimating ? "default" : "pointer",
            opacity: isAnimating ? 0.3 : 1,
            fontFamily: FONT_FAMILY,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ‹
        </button>
        <button
          onClick={onNext}
          disabled={isAnimating}
          style={{
            fontSize: 16,
            color: TEXT,
            background: "none",
            border: "none",
            borderRadius: 0,
            cursor: isAnimating ? "default" : "pointer",
            opacity: isAnimating ? 0.3 : 1,
            fontFamily: FONT_FAMILY,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ›
        </button>
        <button
          onClick={onReset}
          disabled={isAnimating}
          style={{
            fontSize: 12,
            color: TEXT,
            background: "none",
            border: "none",
            borderRadius: 0,
            cursor: isAnimating ? "default" : "pointer",
            opacity: isAnimating ? 0.3 : 1,
            fontFamily: FONT_FAMILY,
            padding: 0,
            lineHeight: 1,
            marginLeft: 4,
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
