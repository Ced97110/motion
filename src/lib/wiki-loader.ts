import fs from "fs";
import path from "path";
import matter from "gray-matter";

const WIKI_DIR = path.join(process.cwd(), "knowledge-base", "wiki");

export interface WikiPageMeta {
  slug: string;
  title: string;
  type: "play" | "concept" | "drill" | "source-summary";
  category?: string;
  formation?: string;
  level?: string;
  tags: string[];
  positions?: string[];
  source_count?: number;
  players_needed?: string;
  duration_minutes?: string;
  team?: string;
  last_updated?: string;
}

export interface WikiPage extends WikiPageMeta {
  body: string;
}

function extractTitle(body: string, filename: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return filename
    .replace(".md", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    return raw
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function loadAllPages(): WikiPageMeta[] {
  if (!fs.existsSync(WIKI_DIR)) return [];

  const files = fs
    .readdirSync(WIKI_DIR)
    .filter(
      (f) =>
        f.endsWith(".md") && f !== "index.md" && f !== "log.md"
    );

  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(WIKI_DIR, filename), "utf-8");
      const { data, content } = matter(raw);

      const type = data.type || "concept";
      if (!["play", "concept", "drill", "source-summary"].includes(type)) {
        return null;
      }

      return {
        slug: filename.replace(".md", ""),
        title: extractTitle(content, filename),
        type: type as WikiPageMeta["type"],
        category: data.category,
        formation: data.formation,
        level: data.level,
        tags: normalizeTags(data.tags),
        positions: normalizeTags(data.positions),
        source_count: data.source_count,
        players_needed: data.players_needed?.toString(),
        duration_minutes: data.duration_minutes?.toString(),
        team: data.team,
        last_updated: data.last_updated,
      };
    })
    .filter(Boolean) as WikiPageMeta[];
}

export function loadPageBySlug(slug: string): WikiPage | null {
  const filepath = path.join(WIKI_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;

  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: extractTitle(content, `${slug}.md`),
    type: (data.type || "concept") as WikiPageMeta["type"],
    category: data.category,
    formation: data.formation,
    level: data.level,
    tags: normalizeTags(data.tags),
    positions: normalizeTags(data.positions),
    source_count: data.source_count,
    players_needed: data.players_needed?.toString(),
    duration_minutes: data.duration_minutes?.toString(),
    team: data.team,
    last_updated: data.last_updated,
    body: content,
  };
}

export function getUniqueValues(
  pages: WikiPageMeta[],
  field: "category" | "formation" | "level" | "type"
): string[] {
  const values = new Set<string>();
  for (const p of pages) {
    const val = p[field];
    if (val && typeof val === "string" && val !== "~") values.add(val);
  }
  return Array.from(values).sort();
}

export function getUniqueTags(pages: WikiPageMeta[]): string[] {
  const tags = new Set<string>();
  for (const p of pages) {
    for (const t of p.tags) tags.add(t);
  }
  return Array.from(tags).sort();
}
