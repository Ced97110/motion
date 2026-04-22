// Copyright: Your Name. Apache 2.0
// CourtDrawer — click-to-waypoint path authoring for the play-editor lab.
//
// Renders a simplified half-court SVG (same viewBox as PlayViewerV7:
// "-28 -3 56 50") with the play's current player and defender positions as
// labeled dots. Clicks on the court place waypoints; a path preview connects
// them in sequence. The user picks marker type (arrow / screen / shot +
// optional dashed) and hits "save" — the component calls `onSave` with the
// generated SVG path string and waypoint list.
//
// Path format: "M x1 y1 L x2 y2 L x3 y3 ...". Straight-line segments only —
// no cubic béziers yet. Tier 2 will add drag-able control points.
//
// Player positions shown are the PLAY's starting positions — not the
// end-of-previous-phase positions. For authoring phases after phase 0, the
// relative geometry still reads correctly but absolute positions may drift.

"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type DrawerMarker = "arrow" | "screen" | "shot";
export type DrawerMode = "add" | "move";
export type DrawerCurvature = "straight" | "smooth";

export interface DrawerWaypoint {
  x: number;
  y: number;
  // Optional cubic bezier control handles for the segments adjacent to this
  // node. When present, the path builder uses them verbatim (preserving a
  // hand-tuned curve). When absent, Catmull-Rom spline fills in a tangent.
  // - cIn:  inbound handle, shapes the segment ENDING at this node
  // - cOut: outbound handle, shapes the segment STARTING from this node
  cIn?: { x: number; y: number };
  cOut?: { x: number; y: number };
}

type DragTarget =
  | { type: "anchor"; index: number }
  | { type: "cIn"; index: number }
  | { type: "cOut"; index: number }
  | null;

export interface DrawerResult {
  marker: DrawerMarker;
  dashed: boolean;
  path: string;
  waypoints: DrawerWaypoint[];
  moveId: string | null; // player id this action moves, if any
  editIndex: number | null; // null = append new action; number = replace at index
}

export interface DrawerInitial {
  waypoints?: DrawerWaypoint[];
  marker?: DrawerMarker;
  dashed?: boolean;
  moveId?: string | null;
  editIndex?: number | null;
}

export interface DrawerPlayer {
  id: string;
  x: number;
  y: number;
  isDefender: boolean;
}

interface CourtDrawerProps {
  players: DrawerPlayer[];
  initial?: DrawerInitial;
  onSave: (result: DrawerResult) => void;
  onCancel: () => void;
}

export default function CourtDrawer({
  players,
  initial,
  onSave,
  onCancel,
}: CourtDrawerProps) {
  const [waypoints, setWaypoints] = useState<DrawerWaypoint[]>(
    () => initial?.waypoints ?? [],
  );
  const [marker, setMarker] = useState<DrawerMarker>(
    () => initial?.marker ?? "arrow",
  );
  const [dashed, setDashed] = useState(() => initial?.dashed ?? false);
  const [moveId, setMoveId] = useState<string>(() => initial?.moveId ?? "");
  const [mode, setMode] = useState<DrawerMode>("add");
  const [curvature, setCurvature] = useState<DrawerCurvature>("smooth");
  const editIndex = initial?.editIndex ?? null;
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const panStartRef = useRef<{
    origin: DrawerWaypoint;
    base: DrawerWaypoint[];
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const pickSvgPoint = useCallback(
    (clientX: number, clientY: number): DrawerWaypoint | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const local = pt.matrixTransform(ctm.inverse());
      // Round to 1 decimal to keep path strings legible.
      return {
        x: Math.round(local.x * 10) / 10,
        y: Math.round(local.y * 10) / 10,
      };
    },
    [],
  );

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.target !== e.currentTarget) return;
      if (mode !== "move") return;
      const pt = pickSvgPoint(e.clientX, e.clientY);
      if (!pt) return;
      panStartRef.current = { origin: pt, base: waypoints };
      (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    },
    [mode, pickSvgPoint, waypoints],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only ADD-mode creates waypoints. Move mode uses pointerdown instead.
      if (mode !== "add") return;
      if (e.target !== e.currentTarget) return;
      const pt = pickSvgPoint(e.clientX, e.clientY);
      if (!pt) return;
      setWaypoints((prev) => [...prev, pt]);
    },
    [mode, pickSvgPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragging !== null) {
        const pt = pickSvgPoint(e.clientX, e.clientY);
        if (!pt) return;
        setWaypoints((prev) => {
          const next = [...prev];
          const node = { ...next[dragging.index] };
          if (dragging.type === "anchor") {
            // Move the anchor AND shift its handles by the same delta, so
            // the curve's local shape is preserved while the whole node
            // translates.
            const dx = pt.x - node.x;
            const dy = pt.y - node.y;
            node.x = pt.x;
            node.y = pt.y;
            if (node.cIn) {
              node.cIn = {
                x: round1(node.cIn.x + dx),
                y: round1(node.cIn.y + dy),
              };
            }
            if (node.cOut) {
              node.cOut = {
                x: round1(node.cOut.x + dx),
                y: round1(node.cOut.y + dy),
              };
            }
          } else if (dragging.type === "cIn") {
            node.cIn = { x: pt.x, y: pt.y };
          } else if (dragging.type === "cOut") {
            node.cOut = { x: pt.x, y: pt.y };
          }
          next[dragging.index] = node;
          return next;
        });
        return;
      }
      if (panStartRef.current) {
        const pt = pickSvgPoint(e.clientX, e.clientY);
        if (!pt) return;
        const { origin, base } = panStartRef.current;
        const dx = pt.x - origin.x;
        const dy = pt.y - origin.y;
        setWaypoints(
          base.map((w) => ({
            x: round1(w.x + dx),
            y: round1(w.y + dy),
            cIn: w.cIn
              ? { x: round1(w.cIn.x + dx), y: round1(w.cIn.y + dy) }
              : undefined,
            cOut: w.cOut
              ? { x: round1(w.cOut.x + dx), y: round1(w.cOut.y + dy) }
              : undefined,
          })),
        );
      }
    },
    [dragging, pickSvgPoint],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    panStartRef.current = null;
  }, []);

  const materializeHandles = useCallback((index: number) => {
    setWaypoints((prev) => {
      if (prev.length < 2) return prev;
      const node = prev[index];
      const hasBothNeeded =
        (index === 0 || node.cIn !== undefined) &&
        (index === prev.length - 1 || node.cOut !== undefined);
      if (hasBothNeeded) return prev;
      const next = [...prev];
      const last = next.length - 1;
      const p0 = next[Math.max(0, index - 1)];
      const p1 = next[index];
      const p2 = next[Math.min(last, index + 1)];
      const tx = (p2.x - p0.x) / 6;
      const ty = (p2.y - p0.y) / 6;
      next[index] = {
        ...p1,
        cIn: index === 0 ? p1.cIn : p1.cIn ?? {
          x: round1(p1.x - tx),
          y: round1(p1.y - ty),
        },
        cOut: index === last ? p1.cOut : p1.cOut ?? {
          x: round1(p1.x + tx),
          y: round1(p1.y + ty),
        },
      };
      return next;
    });
  }, []);

  const handleAnchorPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      setActiveIndex(index);
      if (curvature === "smooth") materializeHandles(index);
      setDragging({ type: "anchor", index });
      (e.currentTarget as SVGCircleElement).setPointerCapture?.(e.pointerId);
    },
    [curvature, materializeHandles],
  );

  const handleHandlePointerDown = useCallback(
    (type: "cIn" | "cOut", index: number) =>
      (e: React.PointerEvent<SVGCircleElement>) => {
        e.stopPropagation();
        setDragging({ type, index });
        (e.currentTarget as SVGCircleElement).setPointerCapture?.(e.pointerId);
      },
    [],
  );

  const handleAnchorContextMenu = useCallback(
    (index: number) => (e: React.MouseEvent<SVGCircleElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setWaypoints((prev) => prev.filter((_, i) => i !== index));
      setActiveIndex(null);
    },
    [],
  );

  const pathPreview = useMemo(
    () => buildPath(waypoints, curvature),
    [waypoints, curvature],
  );

  const canSave = waypoints.length >= 2;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave({
      marker,
      dashed,
      path: pathPreview,
      waypoints,
      moveId: moveId || null,
      editIndex,
    });
  }, [canSave, marker, dashed, pathPreview, waypoints, moveId, editIndex, onSave]);

  const handleUndo = useCallback(() => {
    setWaypoints((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setWaypoints([]);
  }, []);

  const strokeColor = marker === "screen" ? "#ffa500" : "#ffffff";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 12,
      }}
    >
      <Toolbar
        marker={marker}
        setMarker={setMarker}
        dashed={dashed}
        setDashed={setDashed}
        moveId={moveId}
        setMoveId={setMoveId}
        mode={mode}
        setMode={setMode}
        curvature={curvature}
        setCurvature={setCurvature}
        players={players}
        waypointCount={waypoints.length}
        canSave={canSave}
        onSave={handleSave}
        onCancel={onCancel}
        onUndo={handleUndo}
        onClear={handleClear}
        editIndex={editIndex}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "#141414",
          border: "1px solid #333",
          position: "relative",
        }}
      >
        <svg
          ref={svgRef}
          viewBox="-28 -3 56 50"
          preserveAspectRatio="xMidYMid meet"
          onClick={handleClick}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            width: "100%",
            height: "100%",
            cursor:
              dragging !== null
                ? "grabbing"
                : mode === "move"
                  ? "grab"
                  : "crosshair",
            touchAction: "none",
          }}
        >
          <CourtBackground />
          {players.map((p) => (
            <PlayerMarker key={p.id} player={p} highlight={p.id === moveId} />
          ))}
          {pathPreview && (
            <path
              d={pathPreview}
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.5}
              strokeDasharray={dashed ? "1.5 1" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
          {activeIndex !== null && waypoints[activeIndex]?.cIn && (
            <line
              x1={waypoints[activeIndex].x}
              y1={waypoints[activeIndex].y}
              x2={waypoints[activeIndex].cIn!.x}
              y2={waypoints[activeIndex].cIn!.y}
              stroke="#f59e0b"
              strokeWidth={0.2}
              strokeDasharray="0.6 0.4"
              pointerEvents="none"
            />
          )}
          {activeIndex !== null && waypoints[activeIndex]?.cOut && (
            <line
              x1={waypoints[activeIndex].x}
              y1={waypoints[activeIndex].y}
              x2={waypoints[activeIndex].cOut!.x}
              y2={waypoints[activeIndex].cOut!.y}
              stroke="#f59e0b"
              strokeWidth={0.2}
              strokeDasharray="0.6 0.4"
              pointerEvents="none"
            />
          )}
          {waypoints.map((w, i) => {
            const isActive = i === activeIndex;
            const isDraggingAnchor =
              dragging?.type === "anchor" && dragging.index === i;
            return (
              <circle
                key={`anchor-${i}`}
                cx={w.x}
                cy={w.y}
                r={isDraggingAnchor ? 1.1 : isActive ? 1.0 : 0.9}
                fill={
                  i === 0
                    ? "#3b82f6"
                    : i === waypoints.length - 1
                      ? "#2b5"
                      : "#fff"
                }
                stroke={isActive ? "#f59e0b" : "#000"}
                strokeWidth={isActive ? 0.3 : 0.15}
                style={{ cursor: isDraggingAnchor ? "grabbing" : "grab" }}
                onPointerDown={handleAnchorPointerDown(i)}
                onContextMenu={handleAnchorContextMenu(i)}
              />
            );
          })}
          {activeIndex !== null && waypoints[activeIndex]?.cIn && (
            <circle
              cx={waypoints[activeIndex].cIn!.x}
              cy={waypoints[activeIndex].cIn!.y}
              r={0.65}
              fill="#f59e0b"
              stroke="#000"
              strokeWidth={0.12}
              style={{
                cursor:
                  dragging?.type === "cIn" && dragging.index === activeIndex
                    ? "grabbing"
                    : "grab",
              }}
              onPointerDown={handleHandlePointerDown("cIn", activeIndex)}
            />
          )}
          {activeIndex !== null && waypoints[activeIndex]?.cOut && (
            <circle
              cx={waypoints[activeIndex].cOut!.x}
              cy={waypoints[activeIndex].cOut!.y}
              r={0.65}
              fill="#f59e0b"
              stroke="#000"
              strokeWidth={0.12}
              style={{
                cursor:
                  dragging?.type === "cOut" && dragging.index === activeIndex
                    ? "grabbing"
                    : "grab",
              }}
              onPointerDown={handleHandlePointerDown("cOut", activeIndex)}
            />
          )}
        </svg>
        <Legend />
      </div>
    </div>
  );
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Build an SVG path from waypoints. "straight" = polyline; "smooth" emits
 * cubic béziers using each node's explicit control handles when present,
 * falling back to a Catmull-Rom tangent (same tension 1/6 used when no
 * handles are set). A path loaded with hand-tuned control points round-trips
 * through this builder without shape loss.
 */
function buildPath(
  waypoints: DrawerWaypoint[],
  curvature: DrawerCurvature,
): string {
  if (waypoints.length === 0) return "";
  if (waypoints.length === 1) {
    const p = waypoints[0];
    return `M ${p.x} ${p.y}`;
  }
  if (curvature === "straight") {
    const [first, ...rest] = waypoints;
    return (
      `M ${first.x} ${first.y}` +
      rest.map((p) => ` L ${p.x} ${p.y}`).join("")
    );
  }
  const pts = waypoints;
  const last = pts.length - 1;
  const segments: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < last; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(last, i + 2)];
    const c1 =
      p1.cOut ?? {
        x: round1(p1.x + (p2.x - p0.x) / 6),
        y: round1(p1.y + (p2.y - p0.y) / 6),
      };
    const c2 =
      p2.cIn ?? {
        x: round1(p2.x - (p3.x - p1.x) / 6),
        y: round1(p2.y - (p3.y - p1.y) / 6),
      };
    segments.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`);
  }
  return segments.join(" ");
}

function Toolbar({
  marker,
  setMarker,
  dashed,
  setDashed,
  moveId,
  setMoveId,
  mode,
  setMode,
  curvature,
  setCurvature,
  players,
  waypointCount,
  canSave,
  onSave,
  onCancel,
  onUndo,
  onClear,
  editIndex,
}: {
  marker: DrawerMarker;
  setMarker: (m: DrawerMarker) => void;
  dashed: boolean;
  setDashed: (v: boolean) => void;
  moveId: string;
  setMoveId: (id: string) => void;
  mode: DrawerMode;
  setMode: (m: DrawerMode) => void;
  curvature: DrawerCurvature;
  setCurvature: (c: DrawerCurvature) => void;
  players: DrawerPlayer[];
  waypointCount: number;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onClear: () => void;
  editIndex: number | null;
}) {
  const offensivePlayers = players.filter((p) => !p.isDefender);
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        background: "#111",
        border: "1px solid #222",
        fontSize: 11,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 0.4 }}>
        drawer{editIndex !== null ? ` · editing action ${editIndex + 1}` : " · new action"}
      </span>
      <span style={{ color: "#666" }}>|</span>
      <label htmlFor="mode" style={{ color: "#aaa" }}>
        tool:
      </label>
      <select
        id="mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as DrawerMode)}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "3px 6px",
          fontSize: 11,
        }}
      >
        <option value="add">add point (click)</option>
        <option value="move">move path (drag)</option>
      </select>
      <label htmlFor="curve" style={{ color: "#aaa" }}>
        curve:
      </label>
      <select
        id="curve"
        value={curvature}
        onChange={(e) => setCurvature(e.target.value as DrawerCurvature)}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "3px 6px",
          fontSize: 11,
        }}
      >
        <option value="smooth">smooth</option>
        <option value="straight">straight</option>
      </select>
      <span style={{ color: "#666" }}>|</span>
      <label htmlFor="marker" style={{ color: "#aaa" }}>
        marker:
      </label>
      <select
        id="marker"
        value={marker}
        onChange={(e) => setMarker(e.target.value as DrawerMarker)}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "3px 6px",
          fontSize: 11,
        }}
      >
        <option value="arrow">arrow (cut / move)</option>
        <option value="screen">screen</option>
        <option value="shot">shot</option>
      </select>
      <label style={{ color: "#aaa", display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={dashed}
          onChange={(e) => setDashed(e.target.checked)}
        />
        dashed (pass)
      </label>
      <span style={{ color: "#666" }}>|</span>
      <label htmlFor="moveId" style={{ color: "#aaa" }}>
        moves:
      </label>
      <select
        id="moveId"
        value={moveId}
        onChange={(e) => setMoveId(e.target.value)}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "3px 6px",
          fontSize: 11,
        }}
      >
        <option value="">— no player —</option>
        {offensivePlayers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id}
          </option>
        ))}
      </select>
      <span style={{ color: "#666" }}>|</span>
      <span style={{ color: "#aaa" }}>
        waypoints: <strong style={{ color: "#fff" }}>{waypointCount}</strong>
      </span>
      <button
        type="button"
        onClick={onUndo}
        disabled={waypointCount === 0}
        style={{
          background: waypointCount === 0 ? "#222" : "#333",
          color: waypointCount === 0 ? "#555" : "#e5e5e5",
          border: "none",
          padding: "4px 8px",
          fontSize: 11,
          cursor: waypointCount === 0 ? "not-allowed" : "pointer",
        }}
      >
        undo
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={waypointCount === 0}
        style={{
          background: waypointCount === 0 ? "#222" : "#333",
          color: waypointCount === 0 ? "#555" : "#e5e5e5",
          border: "none",
          padding: "4px 8px",
          fontSize: 11,
          cursor: waypointCount === 0 ? "not-allowed" : "pointer",
        }}
      >
        clear
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "transparent",
          color: "#aaa",
          border: "1px solid #333",
          padding: "4px 10px",
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        style={{
          background: canSave ? "#2b5" : "#333",
          color: canSave ? "#000" : "#666",
          border: "none",
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: canSave ? "pointer" : "not-allowed",
        }}
      >
        save action
      </button>
    </div>
  );
}

function CourtBackground() {
  return (
    <g stroke="#555" strokeWidth={0.3} fill="none">
      <rect x={-25} y={-3} width={50} height={50} />
      <line x1={-25} y1={47} x2={25} y2={47} />
      <rect x={-8} y={-3} width={16} height={22} />
      <line x1={-8} y1={19} x2={8} y2={19} />
      <path d="M -6 19 A 6 6 0 0 0 6 19" />
      <circle cx={0} cy={5} r={0.75} stroke="#ff6b6b" />
      <line x1={-3} y1={4} x2={3} y2={4} stroke="#ff6b6b" />
      <path d="M -22 -3 L -22 10 A 22 22 0 0 0 22 10 L 22 -3" />
      <circle cx={0} cy={19} r={6} stroke="#3a3a3a" strokeDasharray="0.8 0.8" />
    </g>
  );
}

function PlayerMarker({
  player,
  highlight,
}: {
  player: DrawerPlayer;
  highlight: boolean;
}) {
  const r = 1.6;
  return (
    <g pointerEvents="none">
      <circle
        cx={player.x}
        cy={player.y}
        r={r}
        fill={player.isDefender ? "#2a2a2a" : highlight ? "#3b82f6" : "#e5e5e5"}
        stroke={
          player.isDefender ? "#666" : highlight ? "#60a5fa" : "#fff"
        }
        strokeWidth={0.2}
      />
      <text
        x={player.x}
        y={player.y}
        fontSize={1.6}
        fill={player.isDefender ? "#aaa" : highlight ? "#fff" : "#000"}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-monospace, monospace"
        fontWeight={700}
      >
        {player.id}
      </text>
    </g>
  );
}

function Legend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        padding: "6px 10px",
        background: "rgba(0, 0, 0, 0.7)",
        border: "1px solid #333",
        fontSize: 10,
        color: "#aaa",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        lineHeight: 1.5,
        pointerEvents: "none",
      }}
    >
      add-mode: click to place · drag point to reshape · right-click point to delete · move-mode: drag court to translate whole path
    </div>
  );
}
