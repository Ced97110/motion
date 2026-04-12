// Copyright: Your Name. Apache 2.0

import {
  ACCENT,
  BORDER_LIGHT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

export type Advantage = "us" | "even" | "them";

export interface MatchupPlayer {
  name: string;
  pos: string;
  number: number;
}

export interface MatchupRowProps {
  our: MatchupPlayer;
  their: MatchupPlayer;
  advantage: Advantage;
  note?: string;
}

const ADV_COPY: Record<Advantage, { label: string; color: string }> = {
  us: { label: "◄ US", color: "#22c55e" },
  even: { label: "≈", color: TEXT_DIM },
  them: { label: "THEM ►", color: "#ef4444" },
};

export function MatchupRow({ our, their, advantage, note }: MatchupRowProps) {
  const adv = ADV_COPY[advantage];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 1fr",
        alignItems: "center",
        padding: "10px 12px",
        borderBottom: `1px solid ${BORDER_LIGHT}`,
        fontFamily: FONT_MONO,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: TEXT_PRIMARY, fontWeight: 700 }}>
          #{our.number} {our.name}
        </span>
        <span style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: 1 }}>
          {our.pos}
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: adv.color,
          textAlign: "center",
          letterSpacing: 1,
          fontWeight: 700,
        }}
        title={note}
      >
        {adv.label}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          textAlign: "right",
        }}
      >
        <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700 }}>
          #{their.number} {their.name}
        </span>
        <span style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: 1 }}>
          {their.pos}
        </span>
      </div>
    </div>
  );
}

export interface MatchupListProps {
  rows: MatchupRowProps[];
}

export function MatchupList({ rows }: MatchupListProps) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER_STRONG}`,
        fontFamily: FONT_MONO,
        color: ACCENT, // placeholder — consumed via children's own color
      }}
    >
      {rows.map((r, i) => (
        <MatchupRow key={`${r.our.name}-${i}`} {...r} />
      ))}
    </div>
  );
}
