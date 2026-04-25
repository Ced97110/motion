// Copyright: Your Name. Apache 2.0
// MediaPipe Pose Landmarker wrapper — runs in-browser, returns a per-frame
// 33-landmark timeline + sampled video frame bytes for keyframe images.
//
// All heavy work runs on the user's device. Raw video and full-resolution
// frames never leave the browser; we only ship measurements + a few small
// keyframe JPEGs to the backend.

import {
  type NormalizedLandmark,
  type PoseLandmarker,
  type PoseLandmarkerResult,
  FilesetResolver,
  PoseLandmarker as PoseLandmarkerCtor,
} from "@mediapipe/tasks-vision";

// Pose landmark indices we care about for shooting / layups. The full
// 33-landmark schema is documented at:
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#models
export const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export interface PoseFrame {
  /** Wall-clock millisecond offset from the start of the video. */
  timestampMs: number;
  /** 33 normalized landmarks (x, y in [0,1]; z relative to hips). */
  landmarks: NormalizedLandmark[];
  /** Visibility average across keypoints — used to discard low-quality frames. */
  meanVisibility: number;
}

let _landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Lazy singleton — MediaPipe takes 5-15s to download the model, so we cache
 * the instance for subsequent extractions.
 */
async function getLandmarker(): Promise<PoseLandmarker> {
  if (_landmarkerPromise) return _landmarkerPromise;
  _landmarkerPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm",
    );
    return PoseLandmarkerCtor.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  })();
  return _landmarkerPromise;
}

export interface ExtractOptions {
  /** Sample every Nth frame (default: 4 ≈ 7.5 FPS at 30fps source). */
  sampleStride?: number;
  /** Optional progress callback fired ~10x during extraction. */
  onProgress?: (progress: number) => void;
}

export interface ExtractResult {
  frames: PoseFrame[];
  /** Total frames sampled (regardless of detection success). */
  framesSampled: number;
  /** Total frames we got a valid pose from. */
  framesDetected: number;
  /** Source video width × height in pixels (for client-side angle math). */
  videoWidth: number;
  videoHeight: number;
}

/**
 * Run pose detection across a video element and collect the joint timeline.
 *
 * Caller is responsible for loading the video into a `<video>` element and
 * passing a current playback element. We do NOT manage video lifecycle
 * (`load()`, `pause()`, `currentTime` etc.) — keep this function focused on
 * extraction so it can be reused across capture modes (file upload, live
 * camera, etc.).
 */
export async function extractJointTimeline(
  video: HTMLVideoElement,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  const sampleStride = Math.max(1, options.sampleStride ?? 4);
  const landmarker = await getLandmarker();

  const totalDurationMs = (video.duration || 0) * 1000;
  if (!Number.isFinite(totalDurationMs) || totalDurationMs <= 0) {
    throw new Error("video duration unavailable — load metadata before extracting");
  }

  // Step ~120 ms per sampled frame at stride=4, 30fps → 7.5 FPS — plenty
  // for shooting motion (release window is ~80-120ms in a typical jump shot).
  const stepMs = (1000 / 30) * sampleStride;
  const frames: PoseFrame[] = [];
  let framesSampled = 0;
  let framesDetected = 0;

  for (let t = 0; t < totalDurationMs; t += stepMs) {
    framesSampled += 1;
    video.currentTime = t / 1000;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked, { once: true });
    });
    const result: PoseLandmarkerResult = landmarker.detectForVideo(video, t);
    const lms = result.landmarks?.[0];
    if (!lms || lms.length === 0) continue;
    const meanVisibility =
      lms.reduce((acc, l) => acc + (l.visibility ?? 0), 0) / lms.length;
    if (meanVisibility < 0.4) continue; // discard unreliable frames
    framesDetected += 1;
    frames.push({ timestampMs: t, landmarks: lms, meanVisibility });
    if (options.onProgress) {
      options.onProgress(Math.min(1, t / totalDurationMs));
    }
  }
  if (options.onProgress) options.onProgress(1);

  return {
    frames,
    framesSampled,
    framesDetected,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  };
}

/** Capture the current `<video>` frame into a JPEG ArrayBuffer (in-browser). */
export async function captureFrameAsJpeg(
  video: HTMLVideoElement,
  quality = 0.7,
): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  // Scale down to bound payload size — backend caps at 1.5MB / keyframe.
  const maxEdge = 720;
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) throw new Error("canvas.toBlob returned null");
  return blob.arrayBuffer();
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
