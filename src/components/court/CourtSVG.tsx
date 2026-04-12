"use client";

import { ReactNode } from "react";
import WoodTiles from "./WoodTiles";
import CourtLines from "./CourtLines";

interface CourtSVGProps {
  children: ReactNode;
}

export default function CourtSVG({ children }: CourtSVGProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-28 -3 56 50"
      style={{ display: "block", width: "100%" }}
      fontFamily="Roboto,sans-serif"
    >
      {/* LAYER 1: Wood */}
      <WoodTiles />
      {/* LAYER 2: Court lines */}
      <CourtLines />
      {/* Layers 3-6 injected by PlayViewer */}
      {children}
    </svg>
  );
}
