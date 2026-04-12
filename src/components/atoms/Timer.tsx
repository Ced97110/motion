// Copyright: Your Name. Apache 2.0

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCENT,
  BG_CONTROL_ACTIVE,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_DIM,
  TEXT_INVERTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";

export interface TimerBlock {
  name: string;
  minutes: number;
}

export interface TimerProps {
  /** Total duration in minutes; ignored if `blocks` are given. */
  duration_min?: number;
  /** Sequenced segments — drives the large "now/next" display. */
  blocks?: TimerBlock[];
  onComplete?: () => void;
}

function fmt(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function Timer({ duration_min, blocks, onComplete }: TimerProps) {
  const total = blocks
    ? blocks.reduce((a, b) => a + b.minutes, 0) * 60
    : (duration_min ?? 1) * 60;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, onComplete]);

  // Compute current block from elapsed time.
  const elapsed = total - remaining;
  let currentIdx = 0;
  let acc = 0;
  if (blocks) {
    for (let i = 0; i < blocks.length; i++) {
      acc += blocks[i].minutes * 60;
      if (elapsed < acc) {
        currentIdx = i;
        break;
      }
      currentIdx = i;
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${BORDER_STRONG}`,
        fontFamily: FONT_MONO,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 48,
            color: TEXT_PRIMARY,
            fontWeight: 700,
            letterSpacing: "-2px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(remaining)}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            style={btnStyle(running)}
          >
            {running ? "PAUSE" : "START"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setRemaining(total);
            }}
            style={btnStyle(false)}
          >
            RESET
          </button>
        </div>
      </div>
      {blocks ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {blocks.map((b, i) => (
            <div
              key={`${b.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: i === currentIdx ? ACCENT : TEXT_DIM,
                letterSpacing: 1,
              }}
            >
              <span>
                {i === currentIdx ? "▶ " : "  "}
                {b.name}
              </span>
              <span>{b.minutes} MIN</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT_MONO,
    fontSize: 10,
    padding: "6px 14px",
    border: `1px solid ${BORDER_STRONG}`,
    background: active ? BG_CONTROL_ACTIVE : "transparent",
    color: active ? TEXT_INVERTED : TEXT_PRIMARY,
    cursor: "pointer",
    letterSpacing: 1,
    borderRadius: 0,
  };
}
