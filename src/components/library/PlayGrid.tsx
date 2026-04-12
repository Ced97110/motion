"use client";

import { useState, useMemo } from "react";
import FilterBar from "./FilterBar";
import PlayCard from "./PlayCard";

interface PageMeta {
  slug: string;
  title: string;
  type: "play" | "concept" | "drill" | "source-summary";
  category?: string;
  formation?: string;
  tags: string[];
}

interface PlayGridProps {
  pages: PageMeta[];
  types: string[];
  categories: string[];
}

export default function PlayGrid({ pages, types, categories }: PlayGridProps) {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      // Exclude source-summary from library view
      if (p.type === "source-summary") return false;
      // Type filter
      if (activeType && p.type !== activeType) return false;
      // Category filter
      if (activeCategory && p.category !== activeCategory) return false;
      // Search filter (searches title and tags)
      if (search) {
        const q = search.toLowerCase();
        const inTitle = p.title.toLowerCase().includes(q);
        const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const inCategory = p.category?.toLowerCase().includes(q) || false;
        const inFormation = p.formation?.toLowerCase().includes(q) || false;
        if (!inTitle && !inTags && !inCategory && !inFormation) return false;
      }
      return true;
    });
  }, [pages, activeType, activeCategory, search]);

  return (
    <div>
      <FilterBar
        types={types}
        activeType={activeType}
        onTypeChange={setActiveType}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        search={search}
        onSearchChange={setSearch}
        totalCount={pages.filter((p) => p.type !== "source-summary").length}
        filteredCount={filtered.length}
      />

      {/* Grid of cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 1,
        }}
      >
        {filtered.map((p) => (
          <PlayCard
            key={p.slug}
            slug={p.slug}
            title={p.title}
            type={p.type}
            category={p.category}
            formation={p.formation}
            tags={p.tags}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "#63636e",
            fontSize: 13,
          }}
        >
          No results found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
}
