// Copyright: Your Name. Apache 2.0
// Iverson Ram test bench — exercises the Path B multi-phase viewer with a
// real 6-phase extraction (Basketball For Coaches p.65-66). Each action has
// a straight-line path synthesized from move/ball endpoints; curves will
// need to be authored via the drawer at /dev/lab/play-editor for a prestige
// render. IP: slug uses "iverson" only in dev — scrub before public launch.

import PlayViewerV7 from "@/components/atoms/PlayViewerV7";
import { iversonRamV7 } from "@/data/plays/iverson-ram-v7";

export default function IversonRamPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        background: "#0b0b0b",
        color: "#e5e5e5",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            color: "#f59e0b",
            letterSpacing: 2,
            textTransform: "uppercase",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
          }}
        >
          Path B test bench · extraction → viewer
        </span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Iverson Ram — 6-phase render
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: "#888", maxWidth: 720 }}>
          Claude extracted 6 phases + 17 actions (13 in main + 4 in branch
          variants) from the book prose. Straight-line paths were synthesized
          from move/ball endpoints so every action renders visibly. Hit play —
          the header should advance through all 6 phases with a ~800ms gap
          between each, then prompt the &ldquo;occasional drive&rdquo; branch.
        </p>
      </header>
      <PlayViewerV7 play={iversonRamV7} />
    </div>
  );
}
