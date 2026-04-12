"use client";

import { useState } from "react";

const archetypes = [
  { name: "Sharpshooter", skills: { SHT: 10, HND: 4, DEF: 3 }, desc: "Lives beyond the arc. Catch-and-shoot. Off-screen movement." },
  { name: "Floor General", skills: { PAS: 9, IQ: 9, HND: 7 }, desc: "Runs the offense. Sees the play before it happens." },
  { name: "Two-Way Wing", skills: { DEF: 8, SHT: 6, ATH: 7 }, desc: "Scores and locks down. The most complete archetype." },
  { name: "Athletic Slasher", skills: { ATH: 10, SPD: 9, HND: 6 }, desc: "Gets to the rim. Explosive first step. Finishes through contact." },
  { name: "Paint Beast", skills: { PST: 10, REB: 9, DEF: 7 }, desc: "Dominates the interior. Blocks shots. Controls the glass." },
  { name: "Stretch Big", skills: { SHT: 7, PST: 5, REB: 6 }, desc: "Big who spaces the floor. Face-up game. Pick-and-pop threat." },
  { name: "Playmaking Big", skills: { PAS: 8, IQ: 8, REB: 6 }, desc: "Big who creates for others. High-post facilitator." },
  { name: "Defensive Anchor", skills: { DEF: 10, REB: 7, ATH: 6 }, desc: "Protects the rim. Anchors the team defense. Effort player." },
];

export default function ArchetypesSection() {
  const [selected, setSelected] = useState(0);

  const active = archetypes[selected];
  const skillEntries = Object.entries(active.skills) as [string, number][];

  return (
    <section
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "64px 16px",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "#4a5a7a",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: 20,
            gridColumn: "1 / -1",
          }}
        >
          PLAYER ARCHETYPES
        </div>

        {/* Left column: archetype list */}
        <div>
          {archetypes.map((arch, i) => {
            const isActive = i === selected;
            const entries = Object.entries(arch.skills) as [string, number][];
            return (
              <div
                key={arch.name}
                onClick={() => setSelected(i)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid #1e2d4d",
                  background: isActive ? "rgba(37,99,235,0.08)" : "transparent",
                  borderLeft: isActive
                    ? "2px solid #f97316"
                    : "2px solid transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fafafa",
                    width: 140,
                    flexShrink: 0,
                  }}
                >
                  {arch.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {entries.map(([label, value]) => (
                    <div
                      key={label}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span
                        style={{ fontSize: 8, color: "#4a5a7a", width: 28 }}
                      >
                        {label}
                      </span>
                      <div
                        style={{
                          height: 4,
                          width: 60,
                          background: "#1e2d4d",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            height: 4,
                            width: `${(value / 10) * 100}%`,
                            background: isActive ? "#f97316" : "#4a5a7a",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: selected archetype detail */}
        <div
          style={{
            borderLeft: "1px solid #1e2d4d",
            padding: 32,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fafafa",
              marginBottom: 12,
            }}
          >
            {active.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#8494b2",
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            {active.desc}
          </div>
          <div
            style={{
              border: "1px solid #1e2d4d",
              padding: "12px 16px",
            }}
          >
            <span style={{ fontSize: 11, color: "#a1a1aa" }}>
              You&apos;re{" "}
              <span style={{ color: "#f97316", fontWeight: 700 }}>78%</span>{" "}
              toward this archetype
            </span>
          </div>
        </div>
      </div>

      {/* Mobile responsive style */}
      <style>{`
        @media (max-width: 640px) {
          section > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
