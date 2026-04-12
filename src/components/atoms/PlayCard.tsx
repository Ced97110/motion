// Copyright: Your Name. Apache 2.0

import Link from "next/link";
import {
  ACCENT,
  BORDER_LIGHT,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

export interface PlayCardProps {
  slug: string;
  name: string;
  tag: string;
  /** Why this play was recommended — rendered as small italic subtext. */
  reason?: string;
}

export function PlayCard({ slug, name, tag, reason }: PlayCardProps) {
  return (
    <Link
      href={`/plays/${slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 14,
        border: `1px solid ${BORDER_STRONG}`,
        background: "transparent",
        textDecoration: "none",
        fontFamily: FONT_MONO,
      }}
    >
      <span
        style={{
          fontSize: 8,
          color: ACCENT,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {tag}
      </span>
      <span style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 700 }}>
        {name}
      </span>
      {reason ? (
        <span
          style={{
            fontSize: 10,
            color: TEXT_MUTED,
            fontStyle: "italic",
            lineHeight: 1.5,
            borderTop: `1px solid ${BORDER_LIGHT}`,
            paddingTop: 6,
            marginTop: 2,
          }}
        >
          {reason}
        </span>
      ) : (
        <span
          style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: 1 }}
        >
          OPEN →
        </span>
      )}
    </Link>
  );
}

export interface PlayCardGridProps {
  plays: PlayCardProps[];
  columns?: number;
}

export function PlayCardGrid({ plays, columns = 2 }: PlayCardGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 12,
      }}
    >
      {plays.map((p) => (
        <PlayCard key={p.slug} {...p} />
      ))}
    </div>
  );
}
