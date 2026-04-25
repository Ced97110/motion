// Copyright: Your Name. Apache 2.0
// File-upload + camera-record surface for the form coach. Mobile-first.
//
// We deliberately don't auto-record from the camera in v1 — the iOS / Android
// browser file picker already exposes "Record video" via `accept="video/*"`
// + `capture="user"` / `capture="environment"`. Building a custom recorder
// is more code for marginal UX gain at MVP scale.

"use client";

import { useRef } from "react";
import {
  ACCENT,
  BG_SURFACE,
  BORDER_MEDIUM,
  FONT_UI,
  TEXT_DIM,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

interface Props {
  onVideoSelected: (file: File) => void;
  disabled?: boolean;
}

export function CameraCapture({ onVideoSelected, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVideoSelected(file);
    // Allow re-selecting the same file (e.g. after a "re-record" prompt).
    e.target.value = "";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        background: BG_SURFACE,
        border: `1px solid ${BORDER_MEDIUM}`,
        borderRadius: 0,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: FONT_UI,
            fontSize: 14,
            color: TEXT_PRIMARY,
            marginBottom: 4,
          }}
        >
          Record yourself shooting, or upload a clip.
        </div>
        <div
          style={{
            fontFamily: FONT_UI,
            fontSize: 12,
            color: TEXT_MUTED,
          }}
        >
          5–15 seconds. Side-on view. Single player in frame. Camera
          stationary on a tripod or against a wall.
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={onPick}
        disabled={disabled}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          style={{
            padding: "12px 20px",
            background: ACCENT,
            color: "#0a0a0b",
            border: "none",
            borderRadius: 0,
            fontFamily: FONT_UI,
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            minWidth: 200,
          }}
        >
          Record / upload video
        </button>
      </div>

      <div
        style={{
          fontFamily: FONT_UI,
          fontSize: 11,
          color: TEXT_DIM,
          lineHeight: 1.6,
        }}
      >
        Joint extraction runs on your device — your raw video never leaves
        the browser. Only joint angles + 1–3 small keyframes are sent to
        the engine.
      </div>
    </div>
  );
}
