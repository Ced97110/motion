// Copyright: Your Name. Apache 2.0
// Compute basketball-specific form measurements from a MediaPipe pose
// timeline. These run client-side; the backend only sees the resulting
// scalar signals (name, value, unit, flagged, threshold).
//
// Phase 1 measurements (jump-shot / free-throw):
//   - elbow_flair       — degrees of lateral elbow drift at release
//   - follow_through_droop — degrees of wrist droop after release
//   - knee_valgus       — degrees of inward knee collapse on landing
//   - release_height_ratio — release point y / player height (sanity check)
//
// All angles are computed in image-plane (2D) coordinates from the
// front-facing pose. They are approximations — the goal is a STABLE
// signal the player can act on, not a clinical measurement.

import { LM, type PoseFrame } from "./extract-joints";

export interface FormMeasurement {
  name: string;
  value: number;
  unit: "deg" | "ratio" | "px";
  flagged: boolean;
  threshold: number;
}

export interface KeyframeSelection {
  /** Frame closest to release: highest wrist y-position (lowest y in image coords). */
  releaseIdx: number;
  /** Frame at peak of jump: lowest hip y-position. */
  peakIdx: number;
  /** Frame on landing: hips returned to >= rest height after peak. */
  landingIdx: number;
}

const DEG = (rad: number): number => (rad * 180) / Math.PI;

function pointDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleAt(
  vertex: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

/** Pick keyframes from the timeline. Heuristic — robust to typical phone clips. */
export function selectKeyframes(frames: PoseFrame[]): KeyframeSelection {
  if (frames.length === 0) {
    throw new Error("no frames to select keyframes from");
  }
  // y is normalized [0,1]; SMALLER y = HIGHER in image. We want maximum
  // wrist height (use right wrist as default; could detect handedness).
  let releaseIdx = 0;
  let releaseY = 1.0;
  let peakIdx = 0;
  let peakY = 1.0;
  for (let i = 0; i < frames.length; i += 1) {
    const lms = frames[i].landmarks;
    const wristY = Math.min(
      lms[LM.LEFT_WRIST]?.y ?? 1,
      lms[LM.RIGHT_WRIST]?.y ?? 1,
    );
    if (wristY < releaseY) {
      releaseY = wristY;
      releaseIdx = i;
    }
    const hipY = (lms[LM.LEFT_HIP]?.y ?? 1) + (lms[LM.RIGHT_HIP]?.y ?? 1);
    if (hipY / 2 < peakY) {
      peakY = hipY / 2;
      peakIdx = i;
    }
  }
  // Landing: first frame after peak where hip y returns to within 5% of
  // rest (last-frame) hip height. If we can't find one, use last frame.
  const restHipY =
    ((frames[frames.length - 1].landmarks[LM.LEFT_HIP]?.y ?? 0.6) +
      (frames[frames.length - 1].landmarks[LM.RIGHT_HIP]?.y ?? 0.6)) /
    2;
  let landingIdx = frames.length - 1;
  for (let i = peakIdx + 1; i < frames.length; i += 1) {
    const lms = frames[i].landmarks;
    const hipY =
      ((lms[LM.LEFT_HIP]?.y ?? 0.6) + (lms[LM.RIGHT_HIP]?.y ?? 0.6)) / 2;
    if (hipY >= restHipY - 0.05) {
      landingIdx = i;
      break;
    }
  }
  return { releaseIdx, peakIdx, landingIdx };
}

/** Pick the dominant arm by which wrist reaches the higher peak. */
function dominantArm(frame: PoseFrame): "left" | "right" {
  const lwY = frame.landmarks[LM.LEFT_WRIST]?.y ?? 1;
  const rwY = frame.landmarks[LM.RIGHT_WRIST]?.y ?? 1;
  return lwY < rwY ? "left" : "right";
}

/** Elbow flair = angle between (shoulder→elbow) and the vertical axis. */
function elbowFlair(frame: PoseFrame): number {
  const arm = dominantArm(frame);
  const shoulder =
    arm === "left"
      ? frame.landmarks[LM.LEFT_SHOULDER]
      : frame.landmarks[LM.RIGHT_SHOULDER];
  const elbow =
    arm === "left"
      ? frame.landmarks[LM.LEFT_ELBOW]
      : frame.landmarks[LM.RIGHT_ELBOW];
  if (!shoulder || !elbow) return 0;
  // Vector from shoulder to elbow.
  const dx = elbow.x - shoulder.x;
  const dy = elbow.y - shoulder.y;
  // Vertical axis (downward) is (0, 1). Angle between (dx, dy) and (0, 1).
  const angle = Math.atan2(Math.abs(dx), Math.abs(dy));
  return DEG(angle);
}

/** Follow-through droop = wrist drop angle after release relative to elbow. */
function followThroughDroop(release: PoseFrame, after: PoseFrame): number {
  const arm = dominantArm(release);
  const elbow =
    arm === "left"
      ? after.landmarks[LM.LEFT_ELBOW]
      : after.landmarks[LM.RIGHT_ELBOW];
  const wrist =
    arm === "left"
      ? after.landmarks[LM.LEFT_WRIST]
      : after.landmarks[LM.RIGHT_WRIST];
  if (!elbow || !wrist) return 0;
  // Wrist below elbow → droop. Measure angle of (elbow→wrist) from horizontal.
  const dx = wrist.x - elbow.x;
  const dy = wrist.y - elbow.y;
  if (dy <= 0) return 0; // wrist at or above elbow — not drooped
  return DEG(Math.atan2(dy, Math.abs(dx) || 0.001));
}

/** Knee valgus = inward deviation of knee from line(hip→ankle), worst leg. */
function kneeValgusMax(landing: PoseFrame): number {
  const sides: Array<{ hip: number; knee: number; ankle: number }> = [
    { hip: LM.LEFT_HIP, knee: LM.LEFT_KNEE, ankle: LM.LEFT_ANKLE },
    { hip: LM.RIGHT_HIP, knee: LM.RIGHT_KNEE, ankle: LM.RIGHT_ANKLE },
  ];
  let worst = 0;
  for (const s of sides) {
    const hip = landing.landmarks[s.hip];
    const knee = landing.landmarks[s.knee];
    const ankle = landing.landmarks[s.ankle];
    if (!hip || !knee || !ankle) continue;
    const ang = DEG(angleAt(knee, hip, ankle));
    // 180° = straight; deviation from 180° measures collapse.
    const deviation = Math.abs(180 - ang);
    if (deviation > worst) worst = deviation;
  }
  return worst;
}

/** Release height ratio: release wrist y vs player height proxy (head→ankle). */
function releaseHeightRatio(release: PoseFrame): number {
  const arm = dominantArm(release);
  const wrist =
    arm === "left"
      ? release.landmarks[LM.LEFT_WRIST]
      : release.landmarks[LM.RIGHT_WRIST];
  const ankle =
    arm === "left"
      ? release.landmarks[LM.LEFT_ANKLE]
      : release.landmarks[LM.RIGHT_ANKLE];
  // Player "height" proxy = vertical ankle-to-shoulder span — robust if
  // head is partially out of frame.
  const shoulder =
    arm === "left"
      ? release.landmarks[LM.LEFT_SHOULDER]
      : release.landmarks[LM.RIGHT_SHOULDER];
  if (!wrist || !ankle || !shoulder) return 0;
  const playerSpan = pointDistance(ankle, shoulder);
  if (playerSpan === 0) return 0;
  // Wrist height above shoulder, normalized by player span.
  return Math.max(0, (shoulder.y - wrist.y) / playerSpan);
}

const THRESHOLDS = {
  elbow_flair: 10,
  follow_through_droop: 5,
  knee_valgus: 8,
  release_height_ratio: 1.1,
} as const;

/**
 * Compute the Phase-1 measurement set from a pose timeline. Returns an
 * empty array if keyframe selection fails (e.g. video had no detected
 * frames — caller should surface a "re-record please face camera" UX).
 */
export function computeMeasurements(
  frames: PoseFrame[],
  shotType: "free-throw" | "jump-shot" | "layup" | "unknown",
): { measurements: FormMeasurement[]; keyframes: KeyframeSelection } {
  if (frames.length < 3) {
    return {
      measurements: [],
      keyframes: { releaseIdx: 0, peakIdx: 0, landingIdx: 0 },
    };
  }
  const kf = selectKeyframes(frames);
  const release = frames[kf.releaseIdx];
  const after =
    frames[Math.min(kf.releaseIdx + 1, frames.length - 1)];
  const landing = frames[kf.landingIdx];

  const flair = elbowFlair(release);
  const droop = followThroughDroop(release, after);
  const valgus = kneeValgusMax(landing);
  const heightRatio = releaseHeightRatio(release);

  const measurements: FormMeasurement[] = [
    {
      name: "elbow_flair",
      value: Number(flair.toFixed(1)),
      unit: "deg",
      threshold: THRESHOLDS.elbow_flair,
      flagged: flair > THRESHOLDS.elbow_flair,
    },
    {
      name: "follow_through_droop",
      value: Number(droop.toFixed(1)),
      unit: "deg",
      threshold: THRESHOLDS.follow_through_droop,
      flagged: droop > THRESHOLDS.follow_through_droop,
    },
    {
      name: "knee_valgus",
      value: Number(valgus.toFixed(1)),
      unit: "deg",
      threshold: THRESHOLDS.knee_valgus,
      flagged: valgus > THRESHOLDS.knee_valgus,
    },
    {
      name: "release_height_ratio",
      value: Number(heightRatio.toFixed(2)),
      unit: "ratio",
      threshold: THRESHOLDS.release_height_ratio,
      // Release height should EXCEED the threshold for jump shots —
      // flag when it's BELOW (meaning low release point).
      flagged:
        shotType === "jump-shot" && heightRatio < THRESHOLDS.release_height_ratio,
    },
  ];

  // Layup-specific: skip elbow/release-height checks (no shot mechanics).
  if (shotType === "layup") {
    return {
      measurements: measurements.filter((m) =>
        ["knee_valgus"].includes(m.name),
      ),
      keyframes: kf,
    };
  }
  return { measurements, keyframes: kf };
}
