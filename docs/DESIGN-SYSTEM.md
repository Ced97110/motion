# Design System — UI Aesthetic Reference

> Extracted from the user's chosen reference UI. Apply these principles across the entire app.

## Typography

- **Primary font**: Monospace — `'Courier New', Courier, monospace` or similar monospace with character
- **No sans-serif anywhere in the UI** — monospace is the identity
- **Weights**: 400 (regular) and 700 (bold) only
- **Sizes**: Use a strict scale. Headers large, body small, labels tiny. No in-between sizes.
- **Letter spacing**: Tight on headers (-0.5px), slightly loose on uppercase labels (+0.5 to +1px)
- **Text transform**: Uppercase sparingly for section labels and category headers

## Color

- **Background**: Off-white / warm paper (#f8f8f6 or similar)
- **Text**: Near-black (#1a1a1a) — never pure black, never gray for primary text
- **Borders**: #1a1a1a for structural borders, #ccc or #e0e0e0 for internal dividers
- **Accent fills**: Muted pastels for data regions — not saturated, not neon
  - Think: pale sage green, light peach, soft lavender, dusty blue
  - The reference used a single pale green (#e8f0d8 range) for the treemap
- **Inverted elements**: Black background + white text for active states, featured items, CTAs
- **No gradients. No shadows. No glow. No blur.**

## Borders & Spacing

- **All borders are 1px solid** — never 0.5px, never 2px
- **No rounded corners** — `border-radius: 0` everywhere
  - Exception: none. Sharp corners are the identity.
- **Grid-based layout**: Everything aligns to a strict grid. No floating elements.
- **Negative space**: Generous but structured — space is a design element, not leftover
- **Padding**: Tight inside cells (4-8px), consistent across all components

## Components

### Toggle groups
- Row of buttons with shared border
- Active state: inverted (black bg, white text)
- No gaps between buttons — shared borders create the segmented look
- Used for: navigation, filters, view modes, timeframes

### Breadcrumbs
- Plain text with underlined links
- Separator: `›`
- Positioned just below nav, small font

### Data cells / Treemap blocks
- Bordered rectangles with pale fill
- Title in bold, data in regular weight
- Nested cells for sub-categories (border within border)
- Size = proportion of data (the layout IS the data)

### Stat counters
- Large monospace numbers (20px+)
- Tiny uppercase labels below
- Arranged in bordered row cells with dividers

### Pricing / Feature rows
- Equal-width bordered cells in a row
- Featured tier: fully inverted (black bg)
- No card shadows, no elevation — just border weight and fill

### CTA buttons
- Full-width or half-width
- Primary: black bg, white text, sharp corners
- Secondary: transparent bg, black border, black text
- Arrow suffix: `→`
- No hover animations — just cursor:pointer

### Timeframe selectors
- Small toggle group (same pattern as nav toggles)
- Active state inverted
- Positioned near data visualizations

### Mini charts
- Thin, understated — supporting element, not hero
- Simple bar/area in muted tones
- Vertical marker line for "current" indicator
- Sits below timeframe selectors

### Navigation
- Horizontal bar with logo left, links right
- Toggle groups for module switching
- No hamburger on desktop — everything visible
- Mobile: collapse to `≡` icon

## Layout Principles

- **Data first**: The largest visual element on any page should be data, not decoration
- **Everything is a grid**: No freeform layouts. Cells, rows, columns.
- **Borders define hierarchy**: Thicker/darker borders = structural. Lighter = internal dividers.
- **No icons**: Use text labels. If an icon is absolutely needed, use a simple SVG glyph.
- **No images**: Photos, illustrations, decorative graphics — none. The data visualizations ARE the visuals.
- **No animation on page load**: Static, instant, no transitions. Animation only for interactive court diagrams.
- **Dense but readable**: Pack information tightly but maintain legibility through consistent spacing

## What this is NOT

- Not Material Design
- Not Bootstrap
- Not "modern SaaS" (no rounded cards, no gradient CTAs, no hero images)
- Not dark mode by default (light, papery, editorial)
- Not playful or casual — it's serious, data-forward, professional

## How to apply to basketball content

The court diagrams (SVG play viewer) live inside this grid system. They are the "treemap" — the central data visualization. The warm wood court texture contrasts with the monospace UI chrome around it. The court is the only place where rounded shapes and warm colors appear — everything else is sharp, monochrome, and grid-aligned.

The play library page = a treemap of plays by category (offense/defense/transition/SLOB), sized by count.
The game plan page = data cells with roster stats, bordered grids of matchups.
The drill page = timed cells with progress indicators.

The aesthetic says: "this is a serious coaching intelligence tool, not a toy app."
