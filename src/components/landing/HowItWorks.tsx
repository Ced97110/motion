"use client";

const steps = [
  {
    step: "01",
    title: "Feed",
    desc: "Drop coaching books into the system. PDFs, articles, scouting reports — any basketball knowledge.",
  },
  {
    step: "02",
    title: "Compile",
    desc: "AI reads every page, extracts concepts, cross-links related ideas, cites sources. The brain builds itself.",
  },
  {
    step: "03",
    title: "Deliver",
    desc: "Ask any question. The AI answers from compiled knowledge — not generic internet results. With citations.",
  },
  {
    step: "04",
    title: "Compound",
    desc: "Every new source makes the brain smarter. Every question asked can become a new wiki page. Knowledge compounds.",
  },
] as const;

export default function HowItWorks() {
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
          fontSize: 9,
          color: "#4a5a7a",
          textTransform: "uppercase",
          letterSpacing: "2px",
          marginBottom: 20,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        HOW THE AI BRAIN WORKS
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }}
        className="how-it-works-grid"
      >
        {steps.map((item) => (
          <div
            key={item.step}
            style={{
              border: "1px solid #1e2d4d",
              padding: "24px 20px",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#f97316",
                marginBottom: 12,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {item.step}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fafafa",
                marginBottom: 8,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8494b2",
                lineHeight: 1.6,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .how-it-works-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .how-it-works-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
