"use client";

import Link from "next/link";

interface PlayCardProps {
  slug: string;
  title: string;
  type: string;
  category?: string;
  formation?: string;
  tags: string[];
}

const fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

const badgeStyle: React.CSSProperties = {
  fontFamily,
  fontSize: "8px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  color: "#63636e",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 0,
  padding: "1px 6px",
  lineHeight: "14px",
  display: "inline-block",
};

export default function PlayCard({
  slug,
  title,
  type,
  category,
  formation,
  tags,
}: PlayCardProps) {
  const displayTags = tags.slice(0, 3);

  return (
    <Link
      href={`/plays/${slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: 0,
        background: "#111113",
        padding: "12px 14px",
        fontFamily,
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#f97316";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
      }}
    >
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={badgeStyle}>{type}</span>
        {category ? (
          <span style={{ ...badgeStyle, color: "#f97316" }}>{category}</span>
        ) : null}
      </div>

      <div
        style={{
          fontFamily,
          fontSize: "13px",
          fontWeight: 700,
          color: "#fafafa",
          marginTop: "8px",
          lineHeight: "18px",
        }}
      >
        {title}
      </div>

      {formation ? (
        <div
          style={{
            fontFamily,
            fontSize: "10px",
            color: "#63636e",
            marginTop: "4px",
            lineHeight: "14px",
          }}
        >
          Formation: {formation}
        </div>
      ) : null}

      {displayTags.length > 0 ? (
        <div
          style={{
            fontFamily,
            fontSize: "9px",
            color: "#a1a1aa",
            marginTop: "8px",
            lineHeight: "13px",
          }}
        >
          {displayTags.join(" \u00B7 ")}
        </div>
      ) : null}
    </Link>
  );
}
