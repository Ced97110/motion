"use client";

import { useMemo } from "react";

interface Tile {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function generateTiles(seed: number): Tile[] {
  const tiles: Tile[] = [];
  const colors = [
    "#ca913c", "#d19d47", "#c88d32", "#c98a28", "#daa549", "#cc9338",
    "#cc9844", "#d19740", "#ca8c2f", "#c48f3d", "#d49d44", "#c89240",
    "#d19f48", "#cd9d4e", "#c89742", "#d6a447", "#d3a24a", "#ce943d",
    "#ce9742", "#cb8d3d", "#cf8f31", "#da9f3b", "#c48930", "#c88f37",
    "#d3a24e", "#c5832d", "#cf9a3f", "#d7a246", "#d8a651", "#c37e28",
    "#c49245", "#c78925",
  ];
  let rng = seed;
  let x = -28;
  let id = 0;
  const rand = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng & 0x7fffffff) / 2147483647;
  };
  while (x < 28) {
    const w = x < -27.5 || x > 27.5 ? 0.52 : 0.94;
    let y = -3;
    const segs = 2 + Math.floor(rand() * 2);
    for (let s = 0; s < segs; s++) {
      const ch = Math.min(
        s === segs - 1 ? 99 : 3 + rand() * 35,
        50 - (y + 3)
      );
      if (ch > 0) {
        tiles.push({
          id: id++,
          x,
          y,
          w,
          h: ch,
          fill: colors[Math.floor(rand() * colors.length)],
        });
      }
      y += ch;
      if (y >= 47) break;
    }
    x += w;
  }
  return tiles;
}

export default function WoodTiles() {
  const tiles = useMemo(() => generateTiles(42), []);

  return (
    <>
      <rect width="56" height="50" x="-28" y="-3" fill="rgb(219,192,151)" />
      <g>
        {tiles.map((t) => (
          <rect
            key={t.id}
            x={t.x}
            y={t.y}
            width={t.w}
            height={t.h}
            fill={t.fill}
          />
        ))}
      </g>
      <rect
        x="-28"
        y="-3"
        width="56"
        height="50"
        fill="rgb(245,225,205)"
        fillOpacity="0.65"
      />
      <defs>
        <radialGradient id="vig" cx="50%" cy="45%" r="62%">
          <stop offset="65%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
        </radialGradient>
      </defs>
      <rect x="-28" y="-3" width="56" height="50" fill="url(#vig)" />
    </>
  );
}
