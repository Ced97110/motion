"use client";

interface HeaderSectionProps {
  playName: string;
  tag: string;
  desc: string;
  onPlayAll: () => void;
  isAnimating: boolean;
}

export default function HeaderSection({
  playName,
  tag,
  desc,
  onPlayAll,
  isAnimating,
}: HeaderSectionProps) {
  const fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <div style={{ fontFamily }}>
      {/* Breadcrumb */}
      <div
        style={{
          fontSize: 11,
          color: "#63636e",
          fontFamily,
          marginBottom: 8,
        }}
      >
        Basketball Plays › {playName}
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 6px",
          letterSpacing: -0.5,
          color: "#fafafa",
          fontFamily,
        }}
      >
        {playName}
      </h1>

      {/* Tag badge */}
      <div
        style={{
          display: "inline-block",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: 1,
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 0,
          padding: "2px 8px",
          marginBottom: 12,
          color: "#a1a1aa",
          fontFamily,
        }}
      >
        {tag}
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: "#a1a1aa",
          lineHeight: 1.7,
          margin: "8px 0 16px",
          fontFamily,
        }}
      >
        {desc}
      </p>

      {/* Play button */}
      <button
        onClick={onPlayAll}
        disabled={isAnimating}
        style={{
          background: "#f97316",
          color: "#ffffff",
          border: "none",
          borderRadius: 0,
          padding: "8px 20px",
          fontSize: 12,
          fontWeight: 700,
          fontFamily,
          cursor: isAnimating ? "default" : "pointer",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          opacity: isAnimating ? 0.4 : 1,
        }}
      >
        ▶ PLAY FULL ANIMATION →
      </button>
    </div>
  );
}
