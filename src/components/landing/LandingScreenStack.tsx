"use client";

import type { CSSProperties } from "react";
import Screen1GameDay from "./screens/Screen1GameDay";
import Screen2Refusal from "./screens/Screen2Refusal";
import Screen3Readers from "./screens/Screen3Readers";
import Screen4Source from "./screens/Screen4Source";
import Screen5Body from "./screens/Screen5Body";
import Screen6Exit from "./screens/Screen6Exit";
import type { DemoStage, ReaderRole } from "./screens/shared";

export type { DemoStage, ReaderRole };

interface Props {
  stage: DemoStage;
  role: ReaderRole;
}

export default function LandingScreenStack({ stage, role }: Props) {
  const layerBase: CSSProperties = {
    position: "absolute",
    inset: 0,
    transition:
      "opacity 360ms cubic-bezier(0.2, 0, 0, 1), transform 480ms cubic-bezier(0.2, 0, 0, 1)",
  };

  const active = (n: DemoStage): CSSProperties => ({
    ...layerBase,
    opacity: stage === n ? 1 : 0,
    transform: stage === n ? "translateY(0)" : stage > n ? "translateY(-12px)" : "translateY(12px)",
    pointerEvents: stage === n ? "auto" : "none",
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 640,
      }}
    >
      <div style={active(1)}>
        <Screen1GameDay />
      </div>
      <div style={active(2)}>
        <Screen2Refusal />
      </div>
      <div style={active(3)}>
        <Screen3Readers role={role} />
      </div>
      <div style={active(4)}>
        <Screen4Source />
      </div>
      <div style={active(5)}>
        <Screen5Body />
      </div>
      <div style={active(6)}>
        <Screen6Exit />
      </div>
    </div>
  );
}
