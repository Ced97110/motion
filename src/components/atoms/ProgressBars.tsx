// Copyright: Your Name. Apache 2.0

import {
  BORDER_LIGHT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import type { PlayerSkills } from "@/lib/intent/types";

const SKILL_ORDER: Array<keyof PlayerSkills> = [
  "SHT",
  "PAS",
  "IQ",
  "HND",
  "DEF",
  "PST",
  "REB",
  "ATH",
  "SPD",
];

export interface ProgressBarsProps {
  skills: PlayerSkills | null;
  /** When true, shows the numeric value on the right. */
  showValues?: boolean;
}

export function ProgressBars({ skills, showValues = true }: ProgressBarsProps) {
  if (!skills) {
    return (
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: TEXT_DIM,
          padding: 16,
          border: `1px solid ${BORDER_STRONG}`,
        }}
      >
        No skill data. Run the self-assessment to populate ratings.
      </div>
    );
  }
  return (
    <div
      style={{
        border: `1px solid ${BORDER_STRONG}`,
        padding: 14,
        fontFamily: FONT_MONO,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {SKILL_ORDER.map((key) => {
        const v = skills[key];
        const pct = Math.max(0, Math.min(10, v)) / 10;
        return (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 28px",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: TEXT_DIM,
                letterSpacing: 1,
              }}
            >
              {key}
            </span>
            <div
              style={{
                height: 4,
                background: BORDER_LIGHT,
                width: "100%",
              }}
            >
              <div
                style={{
                  width: `${pct * 100}%`,
                  height: "100%",
                  background: TEXT_PRIMARY,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                color: TEXT_PRIMARY,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                visibility: showValues ? "visible" : "hidden",
              }}
            >
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}
