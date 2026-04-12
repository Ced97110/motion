// Copyright: Your Name. Apache 2.0
// MuscleMap — compact heat-map of cumulative muscle load after a practice
// block sequence. Full anatomy atlas lives in the Body Lab module; this
// atom is a summary tile used by Practice Day assemblies.

import {
  BORDER_LIGHT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

export interface MuscleMapProps {
  /** load[muscle] ∈ [0,1]. Missing keys render as zero load. */
  load: Record<string, number>;
}

const MUSCLES: Array<{ key: string; label: string }> = [
  { key: "quads", label: "Quads" },
  { key: "calves", label: "Calves" },
  { key: "hip_abductors", label: "Hip abd." },
  { key: "glutes", label: "Glutes" },
  { key: "core", label: "Core" },
  { key: "deltoids", label: "Deltoids" },
  { key: "triceps", label: "Triceps" },
  { key: "hamstrings", label: "Hamstrings" },
];

function loadColor(v: number): string {
  // Navy → blue → amber ramp. Pure CSS — no external libs.
  if (v <= 0) return BORDER_LIGHT;
  if (v < 0.34) return "#1e3a8a";
  if (v < 0.67) return "#f97316";
  return "#f97316"; // high load — warm warning color
}

export function MuscleMap({ load }: MuscleMapProps) {
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
      <span
        style={{
          fontSize: 8,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: TEXT_DIM,
        }}
      >
        Fatigue monitor
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}
      >
        {MUSCLES.map((m) => {
          const v = load[m.key] ?? 0;
          return (
            <div
              key={m.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: loadColor(v),
                  border: `1px solid ${BORDER_STRONG}`,
                }}
                aria-label={`${m.label} load ${Math.round(v * 100)}%`}
              />
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_PRIMARY,
                  letterSpacing: 0.5,
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  color: TEXT_DIM,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(v * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
