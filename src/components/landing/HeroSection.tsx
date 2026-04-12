"use client";

import { useState, useEffect } from "react";
import AutoPlayViewer from "./AutoPlayViewer";

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        background: "transparent",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Left — Text Panel */}
      <div
        style={{
          width: isMobile ? "100%" : "42%",
          padding: isMobile ? "32px 20px" : "48px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          borderRight: isMobile ? "none" : "1px solid #1e2d4d",
          borderBottom: isMobile ? "1px solid #1e2d4d" : "none",
        }}
      >
        {/* Eyebrow */}
        <span
          style={{
            fontSize: 9,
            color: "#f97316",
            textTransform: "uppercase",
            letterSpacing: "2.5px",
            marginBottom: 16,
            fontFamily: FONT_FAMILY,
          }}
        >
          COACHING INTELLIGENCE PLATFORM
        </span>

        {/* Headline */}
        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-1.5px",
            lineHeight: 1.15,
            color: "#fafafa",
            margin: 0,
            fontFamily: FONT_FAMILY,
          }}
        >
          The AI knows
          <br />
          your next play
          <br />
          <span style={{ color: "#f97316" }}>before you ask.</span>
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: 12,
            color: "#8494b2",
            lineHeight: 1.8,
            marginTop: 20,
            maxWidth: 380,
            fontFamily: FONT_FAMILY,
          }}
        >
          2,440 pages of coaching expertise compiled into an AI brain. Animated
          playbooks, instant game plans, player development — every level of
          basketball.
        </p>

        {/* CTA Row */}
        <div style={{ marginTop: 28, display: "flex" }}>
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
            How it works
          </button>
        </div>

        {/* Subtext */}
        <span
          style={{
            marginTop: 14,
            fontSize: 9,
            color: "rgba(255,255,255,0.22)",
            fontFamily: FONT_FAMILY,
          }}
        >
          No credit card &middot; FIBA + NBA rules &middot; Every level
        </span>
      </div>

      {/* Right — Court Animation */}
      <div
        style={{
          width: isMobile ? "100%" : "58%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(180,140,60,0.07) 0%, transparent 70%)",
        }}
      >
        <div style={{ width: "94%" }}>
          <AutoPlayViewer />
        </div>

        {/* Overlay bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 16px",
            background: "rgba(8,13,25,0.75)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#fafafa",
              fontFamily: FONT_FAMILY,
            }}
          >
            23 Flare
          </span>
          <span
            style={{
              fontSize: 8,
              color: "#4a5a7a",
              fontFamily: FONT_FAMILY,
            }}
          >
            Auto-playing &middot; Ball Screen
          </span>
        </div>
      </div>
    </div>
  );
}
