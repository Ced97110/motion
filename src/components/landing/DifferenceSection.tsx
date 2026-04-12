"use client";

export default function DifferenceSection() {
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
          gridTemplateColumns: "1fr 1fr",
        }}
        className="difference-grid"
      >
        {/* Left cell — the "bad" way */}
        <div
          style={{
            border: "1px solid #1e2d4d",
            padding: 32,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#ef4444",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            EVERY OTHER TOOL
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#8494b2",
              fontStyle: "italic",
              lineHeight: 1.6,
              fontFamily: "monospace",
            }}
          >
            &ldquo;Here are 934 plays. Browse them.&rdquo;
          </div>
        </div>

        {/* Right cell — our way */}
        <div
          style={{
            border: "1px solid #f97316",
            borderLeft: "none",
            background: "rgba(37,99,235,0.04)",
            padding: 32,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#f97316",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            THIS PLATFORM
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#fafafa",
              fontStyle: "italic",
              lineHeight: 1.6,
              fontFamily: "monospace",
            }}
          >
            &ldquo;Run these 4 plays tonight. Here&rsquo;s why each fits your
            roster.&rdquo;
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .difference-grid {
            grid-template-columns: 1fr !important;
          }
          .difference-grid > div:nth-child(2) {
            border-left: 1px solid #f97316 !important;
            border-top: none !important;
          }
        }
      `}</style>
    </div>
  );
}
