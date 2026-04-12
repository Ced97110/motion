// Copyright: Your Name. Apache 2.0

import { FONT_MONO, TEXT_DIM, TEXT_PRIMARY, BORDER_STRONG } from "@/lib/design-tokens";

export interface StatCellProps {
  label: string;
  value: string | number;
  /** Optional color override for the number — use ACCENT for highlights. */
  accent?: string;
}

export function StatCell({ label, value, accent }: StatCellProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px 12px",
        borderRight: `1px solid ${BORDER_STRONG}`,
        fontFamily: FONT_MONO,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: accent ?? TEXT_PRIMARY,
          letterSpacing: "-0.5px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 8,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "1.5px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export interface StatCellsRowProps {
  cells: Array<{ label: string; value: string | number; accent?: string }>;
}

export function StatCellsRow({ cells }: StatCellsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderTop: `1px solid ${BORDER_STRONG}`,
        borderBottom: `1px solid ${BORDER_STRONG}`,
      }}
    >
      {cells.map((c, i) => (
        <StatCell key={`${c.label}-${i}`} {...c} />
      ))}
    </div>
  );
}
