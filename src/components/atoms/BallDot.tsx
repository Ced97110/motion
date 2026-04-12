// Tiny basketball icon rendered after the "motion" wordmark. Inline SVG so it
// inherits color context and aligns to baseline without layout shift. See
// docs/specs/design-system.md.

import { BALL_ORANGE, BALL_DARK } from "@/lib/design-tokens";

interface BallDotProps {
  size?: number;
}

export function BallDot({ size = 7 }: BallDotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        display: "inline-block",
        verticalAlign: "baseline",
        marginLeft: 1,
        marginBottom: -1,
      }}
    >
      <circle cx="12" cy="12" r="11" fill={BALL_ORANGE} stroke={BALL_DARK} strokeWidth="1.5" />
      <path
        d="M1 12 Q7 7 12 12 Q17 17 23 12"
        fill="none"
        stroke={BALL_DARK}
        strokeWidth="0.9"
        opacity="0.55"
      />
      <line x1="12" y1="1" x2="12" y2="23" stroke={BALL_DARK} strokeWidth="0.9" opacity="0.45" />
    </svg>
  );
}
