"use client";

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

export default function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderTop: "1px solid #1e2d4d",
        fontFamily: FONT_FAMILY,
      }}
    >
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: FONT_FAMILY }}>
        MOTION &mdash; basketball coaching intelligence
      </span>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: FONT_FAMILY }}>
        Terms &middot; Privacy &middot; API
      </span>
    </footer>
  );
}
