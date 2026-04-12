"use client";

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

export default function FinalCTA() {
  return (
    <section
      style={{
        textAlign: "center",
        padding: "80px 16px",
        maxWidth: 560,
        margin: "0 auto",
        fontFamily: FONT_FAMILY,
      }}
    >
      <h2
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "#fafafa",
          letterSpacing: "-1px",
          margin: 0,
          fontFamily: FONT_FAMILY,
        }}
      >
        Coaching intelligence, compiled.
      </h2>

      <p
        style={{
          fontSize: 12,
          color: "#8494b2",
          lineHeight: 1.8,
          marginTop: 16,
          marginBottom: 28,
          fontFamily: FONT_FAMILY,
        }}
      >
        Every play. Every drill. Every concept. Compiled from 2,440 pages of
        coaching expertise into one AI brain that knows your team.
      </p>

      <div
        style={{
          display: "inline-flex",
          margin: "0 auto",
        }}
      >
        <button
          style={{
            background: "#f97316",
            color: "#fff",
            border: "1px solid #f97316",
            padding: "10px 24px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT_FAMILY,
            borderRadius: 0,
          }}
        >
          Start free &rarr;
        </button>
        <button
          style={{
            background: "transparent",
            color: "#8494b2",
            border: "1px solid #1e2d4d",
            borderLeft: "none",
            padding: "10px 24px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT_FAMILY,
            borderRadius: 0,
          }}
        >
          See a demo
        </button>
      </div>
    </section>
  );
}
