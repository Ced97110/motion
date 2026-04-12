
### SportsSettBasketball Integration

See `SPORTSETT_INTEGRATION.md` for the 10-step implementation plan. Key outputs:

1. **100 few-shot examples** — game narratives rewritten from journalism to coaching tone
2. **Stat calibration tables** — expected ranges for every level (U10 → Pro). 22 turnovers at U14 = normal. At U18 = crisis.
3. **Report generation function** — box score + level → coaching analysis prompt with calibrated insights

### User-Generated Dataset (the flywheel)

No public datasets exist for youth/amateur basketball. When coaches track stats in our app, we build the first structured dataset at that level. This creates a proprietary moat:

Coach tracks stats → AI gets better at that level → more coaches attracted → more data → better AI.

All data anonymized before training. Contribution is opt-in. Coach owns their raw data.

---

## 14. International Scope

The app serves any basketball coach anywhere. Not US-only, not AAU-only. A coach in Guadeloupe (French territory), a youth academy in Senegal, a club team in Melbourne.

### Level System (set at onboarding)

**Age group**: U10, U12, U14, U16, U18, Senior
**Competition level**: Recreational, Club/travel, Regional, National, Professional
**Rules framework**: FIBA or NBA

### Court Dimensions (SVG renderer supports both)

| Feature | NBA | FIBA |
|---------|-----|------|
| Court | 94 × 50 ft | 28 × 15 m |
| 3-point line | 23'9" | 6.75m (22'2") |
| Lane width | 16 ft | 4.9m |
| Game length | 4 × 12 min | 4 × 10 min |

### Localization

English first. French and Spanish as priorities (covers Caribbean, Latin America, Africa, Europe). Wiki brain generates answers in the user's language. Play names stay in English (universally known: "pick and roll," "horns").

---

## 15. Data Privacy

Design for **GDPR as global baseline** (strictest standard → compliant everywhere).

### Key regulations

| Jurisdiction | Law | Age threshold |
|-------------|-----|---------------|
| US | COPPA (+ state laws) | Under 13 (COPPA 2.0 proposed: under 17) |
| France/EU | GDPR | Under 15 (France), under 16 (most EU) |

### Architecture
