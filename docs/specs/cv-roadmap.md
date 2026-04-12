
**Coach account** = adult layer. No age issues. Standard ToS + privacy policy.

**Player account** = may be minor. Age verification at signup. Under 16: parental consent flow. Minimal data collection: name, age group, position. No photos, no location, no biometric.

**Stat data for AI training**: Anonymized before entering pipeline. Strip names, teams, locations. Keep only: age group, competition level, statistical patterns. Opt-in with clear explanation.

**Rights**: Parent access/export/delete child's data at any time. Right to deletion (true delete). Data minimization. Privacy by design.

---

## 16. Computer Vision Roadmap

### Phase 1 — Ship now (proven, runs on-device)

| Feature | Model | Feeds into |
|---------|-------|------------|
| Shot tracking | YOLOv8 (ball + rim) | Stat tracking, Sharpshooter convergence |
| Shooting form analysis | MediaPipe BlazePose (33 keypoints) | Body Lab, archetype tracking |
| Drill rep counter | Pose estimation + action classification | XP system, streak tracking |
| Vertical jump | Ankle keypoint tracking | Body Lab, Athletic Slasher convergence |

### Phase 2 — Needs R&D

Game film → auto stats (most impactful, hardest) · Play recognition from video · Defensive positioning grade · Speed/agility tracking

### Phase 3 — Future

Real-time AR coaching overlay · Injury risk detection · Opponent scouting from video

### Platform decision

Coaching intelligence ships on **web** (Next.js). CV features ship as a **companion mobile app** (React Native) that syncs data back. Two products, one brain.

### Implementation cost (Phase 1)

Models: $0 (open source — MediaPipe, YOLOv8, TFLite). Training compute: $50-100. ML engineer (4-6 weeks): $5,000-15,000. Total: ~$5,500-16,000.

---
