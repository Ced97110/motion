// Primary CTA with basketball-seam SVG overlay. Orange surface with white
// seam lines at 10-15% opacity. Used for Play all, Create, Open viewer, Start
// game day. See docs/specs/design-system.md.

"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ACCENT } from "@/lib/design-tokens";

const HOVER_ORANGE = "#fb923c";

interface BallButtonProps {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit";
}

export function BallButton({
  children,
  onClick,
  style = {},
  disabled = false,
  type = "button",
}: BallButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "8px 18px",
        fontFamily: "inherit",
        fontSize: 11,
        fontWeight: 800,
        border: "none",
        background: disabled ? ACCENT : hover ? HOVER_ORANGE : ACCENT,
        opacity: disabled ? 0.5 : 1,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "background 0.15s",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 200 50"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          d="M-10 25 Q50 8 100 25 Q150 42 210 25"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.2"
        />
        <line
          x1="140"
          y1="-5"
          x2="140"
          y2="55"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
        />
      </svg>
      <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        {children}
      </span>
    </button>
  );
}
