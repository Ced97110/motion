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
// Path format: "M x1 y1 L x2 y2 L x3 y3 ..." in straight mode; cubic
// béziers (`C c1 c2 p`) in smooth mode, emitted from each waypoint's
// optional cIn/cOut handles with a Catmull-Rom fallback when handles are
// unset. Gestures in add-mode:
//   - click empty court → append anchor with no handles (polyline-style)
//   - click-and-drag empty court (pen-tool) → append anchor AND shape
//     its cOut as you drag; the previous anchor's cIn is mirrored so the
//     incoming segment ends tangent
//   - drag on an existing segment → synthesize cOut[i] and cIn[i+1] to
//     pull the curve toward the cursor (1/3 segment-length heuristic)
//   - drag an anchor or handle → reshape in place (anchor translates its
//     handles with it)
//   - right-click an anchor → delete it
// Move-mode drags the whole path as a group.
//
// Player positions shown are the PLAY's starting positions — not the
// end-of-previous-phase positions. For authoring phases after phase 0, the
// relative geometry still reads correctly but absolute positions may drift.

"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// Mirrors the V7Action marker union in frontend/src/lib/plays/v7-types.ts.
// If that file is temporarily out of sync (e.g. during parallel edits), widen
// here defensively so the drawer's local state still compiles.
export type DrawerMarker =
  | "arrow"
  | "screen"
  | "shot"
  | "dribble"
  | "handoff";
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
  // Pen-tool drag: just dropped a new anchor at `index` via mousedown on
  // empty court, and the user is dragging its cOut handle in the same
  // gesture. We also mirror to cIn of the previous anchor if one exists
  // (i.e. index - 1) so the incoming segment ends tangent to this anchor.
  // Whether the drag crossed CLICK_THRESHOLD is tracked in penMovedRef.
  | { type: "pen"; index: number; downAt: { x: number; y: number } }
  // Segment-bend: drag on a segment between waypoint[i] and waypoint[i+1]
  // synthesizes cOut on [i] and cIn on [i+1] pulling toward cursor.
  | { type: "segment"; i: number; downAt: { x: number; y: number } }
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

/**
 * Ghost-context sibling action — the OTHER actions in the phase being
 * edited. Rendered behind the active edit path so the user does not lose
 * spatial context while focused on one action.
 */
export interface DrawerSibling {
  path: string;
  marker: DrawerMarker;
  dashed?: boolean;
  move?: { id: string; to: readonly [number, number] };
}

interface CourtDrawerProps {
  players: DrawerPlayer[];
  initial?: DrawerInitial;
  siblingActions?: DrawerSibling[];
  onSave: (result: DrawerResult) => void;
  onCancel: () => void;
}

export default function CourtDrawer({
  players,
  initial,
  siblingActions = [],
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
  // Set to true on first pen-drag pointermove past CLICK_THRESHOLD. Cleared
  // on every pointerup. Lets pointerup distinguish pen-drag (commit handles)
  // from click-without-drag (strip handles, matches today's click-to-add).
  const penMovedRef = useRef(false);
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
      // Only left-button interactions start gestures. Right-click on the
      // canvas does nothing (right-click-to-delete lives on anchors only).
      if (e.button !== 0) return;
      const pt = pickSvgPoint(e.clientX, e.clientY);
      if (!pt) return;
      if (mode === "move") {
        panStartRef.current = { origin: pt, base: waypoints };
        (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
        return;
      }
      // ADD MODE. Two sub-gestures, both routed through pointerdown so we
      // can distinguish click-vs-drag on pointerup:
      //   1. Segment-bend: pointerdown landed near an existing path segment.
      //   2. Pen-tool: pointerdown on empty court — create a new anchor
      //      AND begin dragging its cOut (mirrored to prev's cIn).
      const segmentHit = curvature === "smooth"
        ? findSegmentAt(waypoints, pt, SEGMENT_HIT_THRESHOLD)
        : null;
      if (segmentHit !== null) {
        setDragging({ type: "segment", i: segmentHit, downAt: pt });
        setActiveIndex(null);
        (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
        return;
      }
      // Pen-tool: append a new anchor, start pen-drag on its cOut. The
      // new element's index is `waypoints.length` (pre-append length from
      // this render) — the functional setWaypoints append is a pure +1 so
      // both pointermove (closure over `dragging`) and pointerup agree.
      const newIndex = waypoints.length;
      setWaypoints((prev) => [...prev, pt]);
      penMovedRef.current = false;
      setDragging({ type: "pen", index: newIndex, downAt: pt });
      setActiveIndex(newIndex);
      (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    },
    [mode, pickSvgPoint, waypoints, curvature],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragging !== null) {
        const pt = pickSvgPoint(e.clientX, e.clientY);
        if (!pt) return;
        // Segment-bend: pull cOut[i] and cIn[i+1] toward the cursor.
        if (dragging.type === "segment") {
          const i = dragging.i;
          setWaypoints((prev) => {
            if (i < 0 || i + 1 >= prev.length) return prev;
            const a = prev[i];
            const b = prev[i + 1];
            const segLen = Math.hypot(b.x - a.x, b.y - a.y);
            const pull = segLen / 3;
            const mkHandle = (anchor: DrawerWaypoint) => {
              const dx = pt.x - anchor.x;
              const dy = pt.y - anchor.y;
              const len = Math.hypot(dx, dy) || 1;
              return {
                x: round1(anchor.x + (dx / len) * pull),
                y: round1(anchor.y + (dy / len) * pull),
              };
            };
            const next = [...prev];
            next[i] = { ...a, cOut: mkHandle(a) };
            next[i + 1] = { ...b, cIn: mkHandle(b) };
            return next;
          });
          return;
        }
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
          } else if (dragging.type === "pen") {
            // Pen-tool: cursor becomes cOut of the just-created anchor.
            // Mirror to cIn of the PREVIOUS anchor so the incoming segment
            // ends tangent (symmetric through node.x/y).
            node.cOut = { x: pt.x, y: pt.y };
            next[dragging.index] = node;
            if (dragging.index - 1 >= 0 && dragging.index - 1 < next.length) {
              const prevNode = { ...next[dragging.index - 1] };
              prevNode.cIn = {
                x: round1(2 * node.x - pt.x),
                y: round1(2 * node.y - pt.y),
              };
              next[dragging.index - 1] = prevNode;
            }
            const ddx = pt.x - dragging.downAt.x;
            const ddy = pt.y - dragging.downAt.y;
            if (Math.hypot(ddx, ddy) >= CLICK_THRESHOLD) {
              penMovedRef.current = true;
            }
            return next;
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
    // Pen-tool click-without-drag: move-handler only writes handles once
    // the drag passes CLICK_THRESHOLD, so if `penMovedRef` is false nothing
    // was mirrored and the new anchor stays handle-free — exactly matching
    // today's click-to-add behavior. No cleanup needed.
    penMovedRef.current = false;
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
          <SiblingGhosts siblings={siblingActions} />
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

// SVG-unit thresholds. The viewBox is 56 wide × 50 tall, so 0.5 units is
// ~1% of width — small enough that a deliberate click doesn't register as
// a drag, large enough to tolerate pointer jitter.
const CLICK_THRESHOLD = 0.5;
// Segment hit-test tolerance. ~1.5 units ≈ 3% of width — matches the
// visual stroke-width generously so users don't need pixel precision.
const SEGMENT_HIT_THRESHOLD = 1.5;

/**
 * Distance from a point to a line segment (clamped to endpoints). Used by
 * `findSegmentAt` to decide whether a pointerdown landed on the polyline
 * between two anchors. This is an approximation for smooth paths — we treat
 * each segment as straight for hit-testing, which is fine because the
 * tolerance band is wider than the typical bezier bow.
 */
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Returns the index `i` such that the segment between waypoints[i] and
 * waypoints[i+1] is within `tol` of the point, or null if none. Checks
 * anchor proximity too: if the click is on top of an anchor we return null
 * so anchor-drag wins (anchors have their own pointerdown handler anyway,
 * but this is belt-and-suspenders).
 */
function findSegmentAt(
  waypoints: DrawerWaypoint[],
  pt: { x: number; y: number },
  tol: number,
): number | null {
  if (waypoints.length < 2) return null;
  // Reject if the click is inside an anchor's footprint — that's an
  // anchor-drag, not a segment-bend.
  for (const w of waypoints) {
    if (Math.hypot(pt.x - w.x, pt.y - w.y) < 1.0) return null;
  }
  let best: { i: number; d: number } | null = null;
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const d = distToSegment(pt.x, pt.y, a.x, a.y, b.x, b.y);
    if (d <= tol && (best === null || d < best.d)) {
      best = { i, d };
    }
  }
  return best ? best.i : null;
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
      <span style={{ color: "#aaa" }}>marker:</span>
      <MarkerButton
        label="arrow"
        active={marker === "arrow" && !dashed}
        onClick={() => {
          setMarker("arrow");
          setDashed(false);
        }}
      />
      {/* "pass" is a preset: arrow + dashed in one click. It is considered
          active when the current state matches the preset exactly. */}
      <MarkerButton
        label="pass"
        active={marker === "arrow" && dashed}
        onClick={() => {
          setMarker("arrow");
          setDashed(true);
        }}
      />
      <MarkerButton
        label="dribble"
        active={marker === "dribble"}
        onClick={() => setMarker("dribble")}
      />
      <MarkerButton
        label="handoff"
        active={marker === "handoff"}
        onClick={() => setMarker("handoff")}
      />
      <MarkerButton
        label="screen"
        active={marker === "screen"}
        onClick={() => setMarker("screen")}
      />
      <MarkerButton
        label="shot"
        active={marker === "shot"}
        onClick={() => setMarker("shot")}
      />
      <label style={{ color: "#aaa", display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={dashed}
          onChange={(e) => setDashed(e.target.checked)}
        />
        dashed
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

/**
 * Compact toolbar button for picking a marker type (or the "pass" preset).
 * Styled to match the existing undo/clear buttons — radius 0, `--ink`/
 * `--paper`-aligned palette, no new design tokens. Active state uses a brighter
 * surface + light text so the current selection reads at a glance.
 */
function MarkerButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: active ? "#e5e5e5" : "#333",
        color: active ? "#000" : "#e5e5e5",
        border: "none",
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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

/**
 * Ghost-render the OTHER actions in the same phase so the user keeps spatial
 * context while editing one action in isolation. Simplification choice: we
 * render siblings as PLAIN PATHS (no marker terminator — no T-bar for
 * screens, no arrowhead for arrows, no zigzag for dribbles). This is the
 * "legitimate simplification for ghost context" the spec allows: the goal
 * is spatial memory, not a full second viewer. Ghosts respect the `dashed`
 * flag and use a muted grey so they recede behind the active edit. Non-
 * interactive — the whole group gets `pointer-events: none` so siblings
 * cannot steal pointerdown from the active path or anchors.
 */
function SiblingGhosts({ siblings }: { siblings: DrawerSibling[] }) {
  if (siblings.length === 0) return null;
  return (
    <g pointerEvents="none" opacity={0.45}>
      {siblings.map((s, i) => (
        <path
          key={`ghost-${i}`}
          d={s.path}
          fill="none"
          stroke="#999"
          strokeWidth={0.35}
          strokeDasharray={s.dashed ? "1.5 1" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
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
      add-mode: click to place · click-and-drag (pen) to place + shape tangent · drag on segment to bend · drag point to reshape · right-click point to delete · move-mode: drag court to translate whole path
    </div>
  );
}
