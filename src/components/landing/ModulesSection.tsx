"use client";

const modules = [
  {
    color: "#f97316",
    title: "Playbook Lab",
    desc: "934 animated plays. Browse, study, build playbooks. AI recommends plays for your roster.",
    pages: "1,505 pages",
  },
  {
    color: "#f97316",
    title: "Body Lab",
    desc: "Muscles mapped to movements. Exercise library. Injury prevention. Warmup generation.",
    pages: "200 pages",
  },
  {
    color: "#22c55e",
    title: "Drill Lab",
    desc: "150+ drills with timer. AI practice plans. Coach assigns, players execute.",
    pages: "639 pages",
  },
  {
    color: "#a78bfa",
    title: "Game IQ",
    desc: "AI game plans. Halftime adjustments. Scouting reports. Situational coaching.",
    pages: "All 7 books",
  },
] as const;

export default function ModulesSection() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "64px 16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }}
        className="modules-grid"
      >
        {modules.map((mod) => (
          <div
            key={mod.title}
            style={{
              border: "1px solid #1e2d4d",
              padding: "24px 20px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                background: mod.color,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fafafa",
                marginBottom: 8,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {mod.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8494b2",
                lineHeight: 1.6,
                marginBottom: 12,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {mod.desc}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#4a5a7a",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {mod.pages}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .modules-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .modules-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
