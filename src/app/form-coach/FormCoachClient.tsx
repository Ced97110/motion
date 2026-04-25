// Copyright: Your Name. Apache 2.0
// Form-coach client surface — orchestrates capture → MediaPipe extract
// → measurement compute → backend call → render.

"use client";

import { useCallback, useRef, useState } from "react";

import {
  ACCENT,
  BG_PAGE,
  BG_SURFACE,
  BORDER_MEDIUM,
  COLOR_RED,
  FONT_UI,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import {
  arrayBufferToBase64,
  captureFrameAsJpeg,
  extractJointTimeline,
  type PoseFrame,
} from "@/lib/pose/extract-joints";
import {
  computeMeasurements,
  type FormMeasurement,
  type KeyframeSelection,
} from "@/lib/pose/measurements";

import { CameraCapture } from "@/components/form-coach/CameraCapture";
import { FormCoachResult } from "@/components/form-coach/FormCoachResult";

const API_BASE =
  process.env.NEXT_PUBLIC_MOTION_API_URL ?? "http://localhost:8080";

type ShotType = "free-throw" | "jump-shot" | "layup" | "unknown";

interface AnalyzeResponse {
  shotType: string;
  feedback: string;
  source: "claude" | "stub";
  sourceCitations: string[];
  crossRefs: string[];
}

type Phase =
  | { kind: "idle" }
  | { kind: "extracting"; progress: number }
  | { kind: "calling-engine" }
  | { kind: "done"; data: AnalyzeResponse; measurements: FormMeasurement[] }
  | { kind: "error"; message: string };

export function FormCoachClient() {
  const [shotType, setShotType] = useState<ShotType>("jump-shot");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const videoRef = useRef<HTMLVideoElement>(null);

  const onVideo = useCallback(
    async (file: File) => {
      setPhase({ kind: "extracting", progress: 0 });
      const video = videoRef.current;
      if (!video) {
        setPhase({ kind: "error", message: "video element unavailable" });
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        video.src = url;
        await new Promise<void>((resolve, reject) => {
          video.addEventListener("loadedmetadata", () => resolve(), { once: true });
          video.addEventListener("error", () => reject(new Error("video load failed")), {
            once: true,
          });
        });
        if ((video.duration || 0) > 30) {
          throw new Error("video must be 30 seconds or less");
        }

        const result = await extractJointTimeline(video, {
          sampleStride: 4,
          onProgress: (p) => setPhase({ kind: "extracting", progress: p }),
        });

        if (result.framesDetected === 0) {
          throw new Error(
            "no pose detected — try better lighting and a single player facing the camera",
          );
        }

        const { measurements, keyframes } = computeMeasurements(
          result.frames as PoseFrame[],
          shotType,
        );
        if (measurements.length === 0) {
          throw new Error("could not compute measurements — re-record with the player fully in frame");
        }

        // Capture 1-3 keyframes for the engine.
        const keyframesBase64 = await collectKeyframes(video, result.frames, keyframes);

        setPhase({ kind: "calling-engine" });
        const resp = await fetch(`${API_BASE}/api/form-coach/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shotType,
            measurements,
            keyframesBase64,
          }),
        });
        if (!resp.ok) {
          throw new Error(`engine returned HTTP ${resp.status}`);
        }
        const data = (await resp.json()) as AnalyzeResponse;
        setPhase({ kind: "done", data, measurements });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setPhase({ kind: "error", message });
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [shotType],
  );

  return (
    <div
      style={{
        background: BG_PAGE,
        color: TEXT_PRIMARY,
        padding: "24px 16px",
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_UI,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Form Coach
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_UI,
            fontSize: 13,
            color: TEXT_MUTED,
          }}
        >
          Record a single shot. Get back what to focus on, and why — grounded in
          the Motion knowledge graph.
        </p>
      </header>

      <ShotTypePicker value={shotType} onChange={setShotType} disabled={phase.kind !== "idle" && phase.kind !== "done" && phase.kind !== "error"} />

      <CameraCapture
        onVideoSelected={onVideo}
        disabled={phase.kind === "extracting" || phase.kind === "calling-engine"}
      />

      <video
        ref={videoRef}
        playsInline
        muted
        preload="metadata"
        style={{ width: "100%", maxHeight: 360, background: "#000", display: phase.kind === "idle" ? "none" : "block" }}
      />

      <PhaseStatus phase={phase} />

      {phase.kind === "done" && (
        <FormCoachResult
          feedback={phase.data.feedback}
          source={phase.data.source}
          crossRefs={phase.data.crossRefs}
          measurements={phase.measurements}
        />
      )}
    </div>
  );
}

function ShotTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: ShotType;
  onChange: (v: ShotType) => void;
  disabled: boolean;
}) {
  const options: ShotType[] = ["free-throw", "jump-shot", "layup"];
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: 16,
        background: BG_SURFACE,
        border: `1px solid ${BORDER_MEDIUM}`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_UI,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: TEXT_DIM,
          marginRight: 8,
          alignSelf: "center",
        }}
      >
        Shot type
      </span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 12px",
            border: `1px solid ${value === opt ? ACCENT : BORDER_MEDIUM}`,
            background: value === opt ? ACCENT : "transparent",
            color: value === opt ? "#0a0a0b" : TEXT_PRIMARY,
            fontFamily: FONT_UI,
            fontSize: 12,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PhaseStatus({ phase }: { phase: Phase }) {
  if (phase.kind === "idle") return null;
  if (phase.kind === "error") {
    return (
      <div
        style={{
          padding: 16,
          background: BG_SURFACE,
          border: `1px solid ${COLOR_RED}`,
          color: COLOR_RED,
          fontFamily: FONT_UI,
          fontSize: 13,
        }}
      >
        Error: {phase.message}
      </div>
    );
  }
  let text = "";
  if (phase.kind === "extracting") {
    const pct = Math.round(phase.progress * 100);
    text = `Extracting joints from video… ${pct}%`;
  } else if (phase.kind === "calling-engine") {
    text = "Composing feedback (engine)…";
  } else if (phase.kind === "done") {
    return null;
  }
  return (
    <div
      style={{
        padding: 12,
        fontFamily: FONT_UI,
        fontSize: 13,
        color: TEXT_MUTED,
        background: BG_SURFACE,
        border: `1px solid ${BORDER_MEDIUM}`,
      }}
    >
      {text}
    </div>
  );
}

async function collectKeyframes(
  video: HTMLVideoElement,
  frames: PoseFrame[],
  kf: KeyframeSelection,
): Promise<string[]> {
  const indices = Array.from(new Set([kf.releaseIdx, kf.peakIdx, kf.landingIdx]))
    .filter((i) => Number.isFinite(i) && i >= 0 && i < frames.length)
    .slice(0, 3);
  const out: string[] = [];
  for (const i of indices) {
    video.currentTime = frames[i].timestampMs / 1000;
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
    });
    const buffer = await captureFrameAsJpeg(video);
    out.push(arrayBufferToBase64(buffer));
  }
  return out;
}
