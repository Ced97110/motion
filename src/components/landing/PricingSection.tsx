"use client";

import { useState, useEffect } from "react";

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

interface PricingTier {
  tier: string;
  price: string;
  period: string;
  features: string[];
  popular: boolean;
}

const TIERS: PricingTier[] = [
  {
    tier: "Free",
    price: "$0",
    period: "",
    features: ["10 plays/month", "Basic search", "1 archetype match", "Community access"],
    popular: false,
  },
  {
    tier: "Player",
    price: "$10",
    period: "/mo",
    features: [
      "Full play library",
      "All 8 archetypes",
      "Skill trees + XP",
      "All drills",
      "Achievement badges",
    ],
    popular: true,
  },
  {
    tier: "Coach",
    price: "$30",
    period: "/mo",
    features: [
      "AI game plans",
      "Roster management",
      "Practice planner",
      "Team sharing",
      "Stat tracking",
    ],
    popular: false,
  },
  {
    tier: "Program",
    price: "$50",
    period: "/mo",
    features: [
      "Multiple rosters",
      "Analytics dashboard",
      "Priority support",
      "Bulk player accounts",
      "API access",
    ],
    popular: false,
  },
];

export default function PricingSection() {
  const [breakpoint, setBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    function update() {
      if (window.innerWidth <= 480) {
        setBreakpoint("mobile");
      } else if (window.innerWidth <= 768) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const gridColumns =
    breakpoint === "mobile"
      ? "1fr"
      : breakpoint === "tablet"
        ? "repeat(2, 1fr)"
        : "repeat(4, 1fr)";

  return (
    <section
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "64px 16px",
        fontFamily: FONT_FAMILY,
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
          fontFamily: FONT_FAMILY,
        }}
      >
        PRICING
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          gap: 0,
        }}
      >
        {TIERS.map((t) => (
          <div
            key={t.tier}
            style={{
              border: "1px solid",
              borderColor: t.popular ? "#f97316" : "#1e2d4d",
              padding: "28px 20px",
              background: t.popular ? "#f97316" : "transparent",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {t.popular && (
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: "1.5px",
                  marginBottom: 12,
                  color: "#fff",
                  textTransform: "uppercase",
                  fontFamily: FONT_FAMILY,
                }}
              >
                POPULAR
              </span>
            )}

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: t.popular ? "#fff" : "#fafafa",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 4,
                fontFamily: FONT_FAMILY,
              }}
            >
              {t.tier}
            </div>

            <div
              style={{
                fontFamily: FONT_FAMILY,
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: t.popular ? "#fff" : "#fafafa",
                }}
              >
                {t.price}
              </span>
              {t.period && (
                <span
                  style={{
                    fontSize: 12,
                    color: t.popular ? "rgba(255,255,255,0.7)" : "#8494b2",
                  }}
                >
                  {t.period}
                </span>
              )}
            </div>

            <div style={{ marginTop: 20, flex: 1 }}>
              {t.features.map((f) => (
                <div
                  key={f}
                  style={{
                    fontSize: 11,
                    color: t.popular ? "rgba(255,255,255,0.8)" : "#8494b2",
                    lineHeight: 2,
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  {f}
                </div>
              ))}
            </div>

            <button
              style={{
                marginTop: 20,
                padding: "8px 0",
                width: "100%",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT_FAMILY,
                borderRadius: 0,
                background: t.popular ? "#fff" : "transparent",
                color: t.popular ? "#f97316" : "#8494b2",
                border: t.popular ? "1px solid #fff" : "1px solid #1e2d4d",
              }}
            >
              {t.popular ? "Get started" : "Choose plan"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
