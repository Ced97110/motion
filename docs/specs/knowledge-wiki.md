## 5. The Knowledge Wiki Brain

### Why Not RAG

RAG: chunks books, stores vectors, re-searches every query. No understanding. Retrieves fragments without context.

Wiki (Karpathy pattern): LLM reads entire books, writes structured .md pages, cross-links them, cites sources. One-time ingestion per book (~$1-3). Queries hit small, organized files. The LLM builds comprehension.

Reference: See `karpathy-llm-wiki.md` for the original pattern.

### Structure

```
/raw/          ← immutable PDFs (never modified)
/wiki/         ← LLM-generated .md pages with YAML frontmatter
/wiki/schema/  ← SCHEMA.md (rules for output format)
```

### Three Operations

**Ingest**: Process a new book. One-time per source. Two-pass for diagrams (rasterize page → LLM reads image + caption → outputs coordinate data). ~$1-3 per book.

**Query**: Answer a question from the wiki. Read index → find relevant pages → synthesize answer with citations. Cheap reads.

**Lint**: Self-healing health check. Find contradictions, gaps, orphan pages. Periodic.

### Page Types

**Concept Page** (e.g. `pick-and-roll-defense.md`):
```yaml
---
type: concept
level: intermediate
positions: [PG, SG, SF, PF, C]
source_count: 3
---
# Pick & Roll Defense
Summary, when to use, key principles (numbered, from source),
player responsibilities by position, variations (hard hedge, soft show,
switch, drop, blitz), common mistakes, related concepts with [[links]],
source citations with chapter and page numbers.
```

**Drill Page** (e.g. `drill-3on3-closeout.md`):
```yaml
---
type: drill
level: beginner
duration_min: 8
players_needed: 6
muscles: [quads, hip_abductors, calves]
---
Objective, setup with court positions, step-by-step execution,
coaching points, progressions, concepts taught with [[links]], sources.
```

**Court Diagram Page** (extracted from book figures):
```yaml
---
type: diagram
figure: 6.2
source: "Let's Talk Defense, Ch.6, p.78"
---
court_data:
  offense:
    - id: "1"
      position: [0, 32]
      has_ball: true
  defense:
    - id: "X1"
      position: [-2, 28]
  movements:
    - player: "X3"
      from: [-12, 26]
      to: [-5, 22]
      type: rotation
```

### Ingestion Pipeline for Diagrams (Two-Pass)

Pass 1: `pdftoppm -jpeg -r 200 -f PAGE -l PAGE book.pdf diagrams/fig`
Pass 2: LLM reads rasterized image + caption text → outputs structured YAML with player coordinates and movements → stored in wiki → feeds interactive court renderer directly.

### Scale

At full scale (~500 books): ~50MB of wiki. Easily queryable. Each page is small. Cross-links create a knowledge graph. The wiki at 7 books (2,440 pages) is the MVP.

---

