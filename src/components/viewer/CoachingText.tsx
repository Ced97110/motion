"use client";

interface CoachingTextProps {
  text: string;
  detail?: string;
}

export default function CoachingText({ text, detail }: CoachingTextProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{
        fontSize: 13,
        color: "#a1a1aa",
        lineHeight: 1.7,
        margin: "0 0 8px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        {text}
      </p>
      {detail && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 0,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.22)",
          borderLeft: "2px solid #f97316",
          marginTop: 10,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px",
            color: "#fafafa",
          }}>
            Key Detail:{" "}
          </span>
          <span style={{
            fontSize: 12,
            color: "#a1a1aa",
            lineHeight: 1.7,
          }}>
            {detail}
          </span>
        </div>
      )}
    </div>
  );
}
