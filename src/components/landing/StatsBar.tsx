"use client";

const stats = [
  { value: "934", label: "NBA PLAYS" },
  { value: "2,440", label: "PAGES INDEXED" },
  { value: "7", label: "SOURCE BOOKS" },
  { value: "150+", label: "DRILLS" },
  { value: "8", label: "ARCHETYPES" },
  { value: "∞", label: "AI ANSWERS", accent: true },
];

export default function StatsBar() {
  return (
    <div
      style={{
        width: "100%",
        borderTop: "1px solid #1e2d4d",
        borderBottom: "1px solid #1e2d4d",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
        }}
        className="stats-bar-grid"
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              borderRight: i < stats.length - 1 ? "1px solid #1e2d4d" : "none",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: stat.accent ? "#f97316" : "#fafafa",
                fontFamily: "monospace",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#4a5a7a",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-bar-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
