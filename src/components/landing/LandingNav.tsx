"use client";

const toggleLabels = ["Playbook", "Body", "Drills", "Game IQ"] as const;

export default function LandingNav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#000000",
        borderBottom: "1px solid #1e2d4d",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.5px",
          }}
        >
          MOTION
        </span>

        <div className="landing-nav-toggle" style={{ display: "flex" }}>
          {toggleLabels.map((label, i) => {
            const isActive = i === 0;
            return (
              <button
                key={label}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  padding: "5px 12px",
                  cursor: "pointer",
                  borderRadius: 0,
                  fontFamily: "inherit",
                  background: isActive ? "#f97316" : "transparent",
                  color: isActive ? "#fff" : "#8494b2",
                  border: isActive
                    ? "1px solid #f97316"
                    : "1px solid #1e2d4d",
                  borderLeft: i !== 0 ? "none" : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            color: "#8494b2",
            cursor: "pointer",
            marginRight: 16,
          }}
        >
          Log in
        </span>
        <button
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: "#f97316",
            border: "1px solid #f97316",
            padding: "6px 16px",
            cursor: "pointer",
            borderRadius: 0,
            fontFamily: "inherit",
          }}
        >
          Sign up free
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .landing-nav-toggle {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
