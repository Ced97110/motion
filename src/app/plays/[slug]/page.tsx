import { loadAllPages, loadPageBySlug } from "@/lib/wiki-loader";
import { notFound } from "next/navigation";
import Link from "next/link";
import WikiContent from "@/components/library/WikiContent";
import { getPlayBySlug } from "@/data/plays";
import { PlayViewerEmbed } from "@/components/library/PlayViewerEmbed";

export function generateStaticParams() {
  const pages = loadAllPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export default async function PlayDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = loadPageBySlug(slug);
  if (!page) notFound();
  const play = getPlayBySlug(slug);

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: "#63636e", marginBottom: 12 }}>
          <Link
            href="/plays"
            style={{ color: "#63636e", textDecoration: "underline" }}
          >
            Library
          </Link>
          {" › "}
          <span style={{ color: "#a1a1aa" }}>{page.title}</span>
        </div>

        {/* Meta badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#63636e",
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "2px 6px",
            }}
          >
            {page.type}
          </span>
          {page.category && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "#f97316",
                border: "1px solid rgba(255,255,255,0.22)",
                padding: "2px 6px",
              }}
            >
              {page.category}
            </span>
          )}
          {page.level && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "#a1a1aa",
                border: "1px solid rgba(255,255,255,0.22)",
                padding: "2px 6px",
              }}
            >
              {page.level}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fafafa",
            margin: "0 0 6px",
            letterSpacing: "-0.5px",
          }}
        >
          {page.title}
        </h1>

        {/* Tags */}
        {page.tags.length > 0 && (
          <div
            style={{
              fontSize: 10,
              color: "#63636e",
              marginBottom: 20,
            }}
          >
            {page.tags.join(" · ")}
          </div>
        )}

        {/* Animated viewer — shown when extract-diagrams.ts has produced coordinates */}
        {play ? (
          <div style={{ marginBottom: 24 }}>
            <PlayViewerEmbed play={play} />
          </div>
        ) : null}

        {/* Wiki content */}
        <WikiContent body={page.body} />

        {/* Back link */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link
            href="/plays"
            style={{
              fontSize: 12,
              color: "#f97316",
              textDecoration: "none",
            }}
          >
            ← Back to Library
          </Link>
        </div>
      </div>
    </div>
  );
}
