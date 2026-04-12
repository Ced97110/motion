// Shared types for the Motion visual audit harness. Mirrors the shape exposed
// by src/components/viewer/PlayViewer.tsx via window.__motionState /
// window.__motionControls in non-production builds.

export interface MotionState {
  phaseIdx: number;
  actIdx: number;
  prog: number;
  drawProg: number;
  fadeProg: number;
  moveProg: number;
  pos: Record<string, [number, number]>;
  ball: string;
  isAnim: boolean;
  labelMode: number;
  playName: string;
  phaseCount: number;
}

export interface MotionControls {
  playAll: () => void;
  reset: () => void;
  setLabelMode: (mode: number) => void;
  seekToPhaseEnd: (phaseIdx: number) => void;
}

export interface MotionWindow {
  __motionState?: MotionState;
  __motionControls?: MotionControls;
}
