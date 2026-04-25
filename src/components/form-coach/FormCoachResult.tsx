// Copyright: Your Name. Apache 2.0
// Render the form-coach engine response. Cross-refs become deep links to
// the wiki concept pages; the source pill shows engine vs fallback.

"use client";

import Link from "next/link";
import {
  ACCENT,
  BG_ELEVATED,
  BG_SURFACE,
  BORDER_MEDIUM,
  FONT_UI,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

import type { FormMeasurement } from "@/lib/pose/measurements";

interface Props {
  feedback: string;
  source: "claude" | "stub";
  crossRefs: string[];
  measurements: FormMeasurement[];
}

const _SLUG_RE = /\b((?:concept|drill|exercise)-[a-z0-9][a-z0-9-]+)\b/g;

/**
 * Split the feedback string into segments, linking any concept-/drill-
 * /exercise- slug to its wiki page.
 */
function renderFeedback(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Iterate manually so we keep prefix segments + injected links in order.
  while ((match = _SLUG_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    const slug = match[1];
    out.push(
      <Link
        key={`${slug}-${match.index}`}
        href={`/wiki/${slug}`}
        style={{
          color: ACCENT,
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        {slug}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

export function FormCoachResult({ feedback, source, crossRefs, measurements }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: 24,
        background: BG_SURFACE,
        border: `1px solid ${BORDER_MEDIUM}`,
        borderRadius: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2
          style={{
            margin: 0,
            fontFamily: FONT_UI,
            fontSize: 16,
            fontWeight: 600,
            color: TEXT_PRIMARY,
          }}
        >
          Form Coach
        </h2>
        <span
          style={{
            fontFamily: FONT_UI,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
            padding: "4px 8px",
            border: `1px solid ${BORDER_MEDIUM}`,
            color: source === "claude" ? ACCENT : TEXT_MUTED,
          }}
        >
          {source === "claude" ? "Engine" : "Fallback"}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: FONT_UI,
          fontSize: 15,
          lineHeight: 1.6,
          color: TEXT_PRIMARY,
        }}
      >
        {renderFeedback(feedback)}
      </p>

      {measurements.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: 16,
            background: BG_ELEVATED,
          }}
        >
          <div
            style={{
              fontFamily: FONT_UI,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: TEXT_DIM,
              marginBottom: 6,
            }}
          >
            Measured signals
          </div>
          {measurements.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: FONT_UI,
                fontSize: 13,
                color: m.flagged ? ACCENT : TEXT_MUTED,
              }}
            >
              <span>{m.name.replace(/_/g, " ")}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {m.value}
                {m.unit === "deg" ? "°" : m.unit === "ratio" ? "" : ` ${m.unit}`}
                {"  "}
                <span style={{ color: TEXT_DIM }}>(≤ {m.threshold})</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {crossRefs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {crossRefs.map((slug) => (
            <Link
              key={slug}
              href={`/wiki/${slug}`}
              style={{
                fontFamily: FONT_UI,
                fontSize: 11,
                padding: "4px 8px",
                color: ACCENT,
                border: `1px solid ${BORDER_MEDIUM}`,
                textDecoration: "none",
              }}
            >
              {slug} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
