import { loadAllPages, getUniqueValues } from "@/lib/wiki-loader";
import PlayGrid from "@/components/library/PlayGrid";

export const metadata = {
  title: "Play Library — Basketball Coaching",
};

export default function PlaysPage() {
  const pages = loadAllPages();
  const types = getUniqueValues(pages, "type").filter(
    (t) => t !== "source-summary"
  );
  const categories = getUniqueValues(
    pages.filter((p) => p.type === "play"),
    "category"
  );

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 9,
              color: "#63636e",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 8,
            }}
          >
            Knowledge Base
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fafafa",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Play Library
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "#a1a1aa",
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            {pages.filter((p) => p.type !== "source-summary").length} plays,
            concepts, and drills extracted from 9 coaching books.
          </p>
        </div>

        <PlayGrid pages={pages} types={types} categories={categories} />
      </div>
    </div>
  );
}
