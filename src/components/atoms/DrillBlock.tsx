// Copyright: Your Name. Apache 2.0

import {
  BORDER_LIGHT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

export interface DrillBlockProps {
  name: string;
  minutes: number;
  muscles?: string[];
  /** When present, renders an underline progress indicator (0-1). */
  progress?: number;
}

export function DrillBlock({
  name,
  minutes,
  muscles = [],
  progress,
}: DrillBlockProps) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${BORDER_LIGHT}`,
        padding: "12px 14px",
        fontFamily: FONT_MONO,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 700 }}>
          {name}
        </span>
        <span style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 1 }}>
          {minutes} MIN
        </span>
      </div>
      {muscles.length > 0 ? (
        <div
          style={{
            fontSize: 8,
            color: TEXT_DIM,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {muscles.join(" · ")}
        </div>
      ) : null}
      {progress !== undefined ? (
        <div
          style={{
            height: 2,
            background: BORDER_LIGHT,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              background: TEXT_PRIMARY,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export interface DrillListProps {
  drills: DrillBlockProps[];
}

export function DrillList({ drills }: DrillListProps) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER_STRONG}`,
        fontFamily: FONT_MONO,
      }}
    >
      {drills.map((d, i) => (
        <DrillBlock key={`${d.name}-${i}`} {...d} />
      ))}
    </div>
  );
}
