# Design system — B+C merge

> **Status**: Approved. Replaces "Broadcast Navy" (original direction).
> **Origin**: Explored 4 directions (A: Fluid dark, B: Bold editorial, C: Electric dark, D: Warm minimal). B and C merged. Approved.

---

## Aesthetic

Near-black chrome with bold editorial typography. Weight 800-900 headlines. Orange accent tied to basketball identity. 0px border radius everywhere. The court is the only warm element.

## Color tokens

```
Backgrounds:  bg:#0a0a0b  bg2:#111113  bg3:#19191c
Borders:      bd:rgba(255,255,255,0.08)  bd2:0.14  bdS:0.22
Text:         tx:#fafafa  ts:#a1a1aa  td:#63636e  tg:#3e3e45
Accent:       ac:#f97316  acS:rgba(249,115,22,0.1)
Semantic:     gn:#22c55e  rd:#ef4444  am:#eab308  pu:#a855f7
```

## Typography

System sans-serif. Headlines: weight 800-900, up to 28-38px, letter-spacing -1.5px. Body: 13px. Labels: 9-10px uppercase, 0.5px spacing.

## Layout

0px border radius. 1px borders at bdS. Uppercase toggle groups. Orange-tinted tag pills. Hover = bg2 brightening.

## The court rule

Orange accent ONLY for basketball-related/interactive elements. Never generic UI. Court wood grain is the ONLY warm element.

## BallDot component

Tiny basketball after "motion" wordmark. `<svg viewBox="0 0 24 24">` with circle + seam path + vertical line.

## BallButton component

Primary actions. Orange bg with basketball seam SVG pattern at 15% white opacity. Horizontal Bézier curve + vertical line + optional arcs. Used for: Play all, Create, Open viewer, Start game day.

## Navigation

Logo: lowercase "motion" + BallDot. Module tabs: shared-border toggle, uppercase 10px. Breadcrumb: 10px tg color. Avatar: 28x28 square.
