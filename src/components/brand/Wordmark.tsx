import type { CSSProperties } from "react";

export type WordmarkSize = "nav" | "navSm" | "h1" | "hero" | "footer";

interface WordmarkProps {
  size?: WordmarkSize;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "h1" | "div";
}

const SIZE_STYLES: Record<WordmarkSize, CSSProperties> = {
  navSm: { fontSize: 15, letterSpacing: "-0.022em" },
  nav: { fontSize: 19, letterSpacing: "-0.024em" },
  h1: { fontSize: 44, letterSpacing: "-0.028em" },
  hero: { fontSize: "clamp(88px, 11vw, 144px)", letterSpacing: "-0.034em" },
  footer: { fontSize: 13, letterSpacing: "-0.018em" },
};

/**
 * Motion wordmark — sport-agnostic brand mark.
 * Inter 700, title case, inherits color via currentColor.
 */
export default function Wordmark({
  size = "nav",
  className,
  style,
  as = "span",
}: WordmarkProps) {
  const Tag = as;
  return (
    <Tag
      className={className}
      style={{
        fontFamily:
          "var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeight: 700,
        lineHeight: 0.9,
        color: "currentColor",
        display: "inline-block",
        margin: 0,
        ...SIZE_STYLES[size],
        ...style,
      }}
    >
      Motion
    </Tag>
  );
}
