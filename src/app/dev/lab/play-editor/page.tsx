// Copyright: Your Name. Apache 2.0
// Play-editor Tier 0 — split-pane authoring lab.
//
// Left: plain textarea holding a V7Play object (JSON *or* JS-object-literal
// — parsed via `new Function("return (" + input + ")")` since this is a
// dev-only tool). Right: live PlayViewerV7 render of the last valid parse.
// Top toolbar: load a template, see parse status, download as a .ts file.
//
// This is the MINIMUM viable authoring surface — the point is to measure
// wall-clock time to hand-author one play inside it, then decide whether the
// Tier 1 build (drag-to-place coords, arrow drawing) is worth it.

"use client";

import { useCallback, useRef, useState } from "react";

import CourtDrawer, {
  type DrawerInitial,
  type DrawerMarker,
  type DrawerPlayer,
  type DrawerResult,
  type DrawerWaypoint,
} from "@/components/atoms/CourtDrawer";
import PlayViewerV7 from "@/components/atoms/PlayViewerV7";
import { blackPlay } from "@/data/plays/black";
import { iversonRamV7 } from "@/data/plays/iverson-ram-v7";
import { lakersFlareSlipV7 } from "@/data/plays/lakers-flare-slip";
import type { V7Play } from "@/lib/plays/v7-types";
import { toV7Shape } from "@/lib/plays/toV7";

const EMPTY_STUB: V7Play = {
  name: "New Play",
  tag: "",
  desc: "",
  coachNote: "",
  concepts: { counters: [], bestFor: "", related: [] },
  players: {
    "1": [0, 32],
    "2": [-16, 24],
    "3": [16, 24],
    "4": [-20, 6],
    "5": [20, 6],
  },
  roster: {
    "1": { name: "PG", pos: "PG" },
    "2": { name: "SG", pos: "SG" },
    "3": { name: "SF", pos: "SF" },
    "4": { name: "PF", pos: "PF" },
    "5": { name: "C", pos: "C" },
  },
  defense: {
    X1: [0, 30],
    X2: [-14, 22],
    X3: [14, 22],
    X4: [-18, 8],
    X5: [18, 8],
  },
  ballStart: "1",
  phases: [
    {
      label: "Phase 1",
      text: "",
      spotlightText: {},
      actions: [],
      defenseActions: [],
    },
  ],
};

const TEMPLATES: Record<string, () => V7Play> = {
  empty: () => structuredClone(EMPTY_STUB),
  "lakers-flare-slip": () => structuredClone(lakersFlareSlipV7) as V7Play,
  "iverson-ram (6-phase extraction)": () =>
    structuredClone(iversonRamV7) as V7Play,
  black: () => toV7Shape(blackPlay),
};

type ParseResult =
  | { ok: true; play: V7Play; error: null }
  | { ok: false; play: null; error: string };

function parsePlayInput(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, play: null, error: "empty input" };
  try {
    // Dev-tool-only eval: accepts JSON *and* JS object literals (unquoted
    // keys, trailing commas). Do not port this pattern to any user-input path.
    const fn = new Function(`return (${trimmed});`);
    const candidate = fn() as unknown;
    if (!candidate || typeof candidate !== "object") {
      return { ok: false, play: null, error: "parsed value is not an object" };
    }
    const play = candidate as Partial<V7Play> & { branchPoint?: unknown };
    const missing: string[] = [];
    if (!play.name) missing.push("name");
    if (!play.players) missing.push("players");
    if (!Array.isArray(play.phases)) missing.push("phases");
    if (!play.roster) missing.push("roster");
    if (missing.length > 0) {
      return {
        ok: false,
        play: null,
        error: `missing required fields: ${missing.join(", ")}`,
      };
    }
    // Defensive: PlayViewerV7's animation calls getPointAtLength on every
    // action's path; an empty string throws InvalidStateError. The prose
    // extractor emits `path: ""` by design (so the user draws them). Give
    // any empty path a degenerate fallback so the viewer does not crash —
    // it renders nothing visible but animation keeps ticking.
    const sanitizeActions = (actions: unknown): unknown => {
      if (!Array.isArray(actions)) return actions;
      return actions.map((a: unknown) => {
        if (!a || typeof a !== "object") return a;
        const act = a as { path?: unknown };
        if (typeof act.path !== "string" || act.path.trim().length === 0) {
          return { ...act, path: "M 0 0 L 0.001 0" };
        }
        return a;
      });
    };
    const phases = play.phases;
    if (Array.isArray(phases)) {
      phases.forEach((ph: unknown) => {
        if (!ph || typeof ph !== "object") return;
        const phase = ph as { actions?: unknown };
        phase.actions = sanitizeActions(phase.actions);
      });
    }

    // Defensive: PlayViewerV7 crashes if branchPoint.options[].phase is missing
    // or malformed. LLM extractors sometimes emit flat option shapes; strip
    // them so the viewer still renders.
    if (play.branchPoint !== null && play.branchPoint !== undefined) {
      const bp = play.branchPoint as { options?: unknown };
      const options = Array.isArray(bp.options) ? bp.options : null;
      const allValid =
        options !== null &&
        options.every((opt: unknown) => {
          if (!opt || typeof opt !== "object") return false;
          const o = opt as { phase?: unknown };
          if (!o.phase || typeof o.phase !== "object") return false;
          const ph = o.phase as { actions?: unknown };
          return Array.isArray(ph.actions);
        });
      if (!allValid) {
        (play as { branchPoint?: unknown }).branchPoint = undefined;
      } else if (options !== null) {
        // Apply the same empty-path sanitizer to branch option phases.
        options.forEach((opt: unknown) => {
          if (!opt || typeof opt !== "object") return;
          const o = opt as { phase?: { actions?: unknown } };
          if (o.phase && typeof o.phase === "object") {
            o.phase.actions = sanitizeActions(o.phase.actions);
          }
        });
      }
    }
    return { ok: true, play: play as V7Play, error: null };
  } catch (err) {
    return {
      ok: false,
      play: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled-play";
}

function camelize(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function downloadAsTypescript(play: V7Play): void {
  const slug = slugify(play.name);
  const varName = `${camelize(slug)}V7`;
  const body = JSON.stringify(play, null, 2);
  const file = `// Copyright: Your Name. Apache 2.0
// Authored via /dev/lab/play-editor (Tier 0).

import type { V7Play } from "@/lib/plays/v7-types";

export const ${varName}: V7Play = ${body};
`;
  const blob = new Blob([file], { type: "application/typescript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}.ts`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface EditorState {
  input: string;
  parseError: string | null;
  displayPlay: V7Play;
  todos: string[];
}

interface ExtractResponse {
  play: V7Play;
  todos: string[];
  source: string;
}

const API_BASE = process.env.NEXT_PUBLIC_MOTION_API_URL ?? "http://localhost:8080";

function initialState(): EditorState {
  return {
    input: JSON.stringify(lakersFlareSlipV7, null, 2),
    parseError: null,
    displayPlay: lakersFlareSlipV7,
    todos: [],
  };
}

function applyInput(
  prev: EditorState,
  nextInput: string,
  nextTodos?: string[],
): EditorState {
  const parse = parsePlayInput(nextInput);
  return {
    input: nextInput,
    parseError: parse.ok ? null : parse.error,
    // Keep the last successful parse so a mid-typing syntax error does not
    // blank the preview — the viewer holds the previous good state.
    displayPlay: parse.ok ? parse.play : prev.displayPlay,
    todos: nextTodos ?? prev.todos,
  };
}

export default function PlayEditorPage() {
  const [state, setState] = useState<EditorState>(initialState);
  const [proseOpen, setProseOpen] = useState(false);
  const [prose, setProse] = useState("");
  const [extractBusy, setExtractBusy] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawPhaseIndex, setDrawPhaseIndex] = useState(0);
  const [drawActionIndex, setDrawActionIndex] = useState<number | null>(null);

  const handleInput = useCallback((next: string) => {
    setState((prev) => applyInput(prev, next));
  }, []);

  const handleTemplate = useCallback((key: string) => {
    const factory = TEMPLATES[key];
    if (!factory) return;
    setState((prev) =>
      applyInput(prev, JSON.stringify(factory(), null, 2), []),
    );
  }, []);

  const handleDownload = useCallback(() => {
    if (state.parseError !== null) return;
    downloadAsTypescript(state.displayPlay);
  }, [state.displayPlay, state.parseError]);

  const handleAppendAction = useCallback(
    (result: DrawerResult) => {
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        const target = phases[drawPhaseIndex];
        if (!target) return prev;
        const newAction: {
          marker: "arrow" | "screen" | "shot";
          path: string;
          dashed?: boolean;
          move?: { id: string; to: readonly [number, number] };
        } = {
          marker: result.marker,
          path: result.path,
        };
        if (result.dashed) newAction.dashed = true;
        if (result.moveId) {
          const last = result.waypoints[result.waypoints.length - 1];
          newAction.move = { id: result.moveId, to: [last.x, last.y] };
        }
        const existing = target.actions ?? [];
        const nextActions =
          result.editIndex !== null && result.editIndex < existing.length
            ? existing.map((a, i) => (i === result.editIndex ? newAction : a))
            : [...existing, newAction];
        phases[drawPhaseIndex] = { ...target, actions: nextActions };
        const nextPlay = { ...play, phases };
        return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
      });
      setDrawMode(false);
      setDrawActionIndex(null);
    },
    [drawPhaseIndex],
  );

  const handleDeleteAction = useCallback(
    (phaseIndex: number, actionIndex: number) => {
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        const target = phases[phaseIndex];
        if (!target) return prev;
        const existing = target.actions ?? [];
        phases[phaseIndex] = {
          ...target,
          actions: existing.filter((_, i) => i !== actionIndex),
        };
        const nextPlay = { ...play, phases };
        return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
      });
    },
    [],
  );

  const handleExtract = useCallback(async () => {
    if (!prose.trim()) return;
    setExtractBusy(true);
    setExtractError(null);
    try {
      const response = await fetch(`${API_BASE}/api/playlab/extract-prose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prose }),
      });
      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }
      const body = (await response.json()) as ExtractResponse;
      setState((prev) =>
        applyInput(prev, JSON.stringify(body.play, null, 2), body.todos),
      );
      setProseOpen(false);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtractBusy(false);
    }
  }, [prose]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0b0b0b",
        color: "#e5e5e5",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <Toolbar
        parseError={state.parseError}
        onTemplate={handleTemplate}
        onDownload={handleDownload}
        onOpenProse={() => setProseOpen(true)}
        drawMode={drawMode}
        onToggleDraw={() => {
          setDrawMode((v) => {
            if (v) return false; // turning off
            setDrawActionIndex(null); // new action when turning on from toolbar
            return true;
          });
        }}
        phaseCount={state.displayPlay.phases?.length ?? 0}
        drawPhaseIndex={drawPhaseIndex}
        setDrawPhaseIndex={setDrawPhaseIndex}
      />
      {proseOpen && (
        <ProseModal
          prose={prose}
          setProse={setProse}
          busy={extractBusy}
          error={extractError}
          onExtract={handleExtract}
          onClose={() => setProseOpen(false)}
        />
      )}
      {state.todos.length > 0 && <TodoBanner todos={state.todos} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 1fr) minmax(480px, 1fr)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <textarea
          value={state.input}
          onChange={(e) => handleInput(e.target.value)}
          spellCheck={false}
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            padding: "12px 16px",
            border: "none",
            borderRight: "1px solid #222",
            background: "#0b0b0b",
            color: "#e5e5e5",
            resize: "none",
            outline: "none",
            whiteSpace: "pre",
          }}
        />
        <div
          style={{
            overflow: "auto",
            padding: 16,
            background: "#0b0b0b",
          }}
        >
          {drawMode ? (
            <CourtDrawer
              key={`${drawPhaseIndex}-${drawActionIndex ?? "new"}`}
              players={derivePlayerDots(state.displayPlay)}
              initial={buildDrawerInitial(
                state.displayPlay.phases?.[drawPhaseIndex],
                drawActionIndex,
              )}
              onSave={handleAppendAction}
              onCancel={() => {
                setDrawMode(false);
                setDrawActionIndex(null);
              }}
            />
          ) : (
            <>
              <ActionList
                phase={state.displayPlay.phases?.[drawPhaseIndex]}
                phaseIndex={drawPhaseIndex}
                onEdit={(i) => {
                  setDrawActionIndex(i);
                  setDrawMode(true);
                }}
                onNew={() => {
                  setDrawActionIndex(null);
                  setDrawMode(true);
                }}
                onDelete={(i) => handleDeleteAction(drawPhaseIndex, i)}
              />
              <PlayViewerV7 play={state.displayPlay} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Parse an SVG path string into waypoints with preserved cubic bezier
 * control handles. Straight segments leave `cIn`/`cOut` undefined; cubic
 * segments populate the previous waypoint's `cOut` (first control) and the
 * ending waypoint's `cIn` (second control). Round-trips a hand-tuned bezier
 * path byte-for-byte modulo number formatting.
 */
function parsePathToWaypoints(d: string): DrawerWaypoint[] {
  if (!d) return [];
  const tokens = d
    .replace(/([MLCZmlcz])/g, " $1 ")
    .split(/[\s,]+/)
    .filter(Boolean);
  const nodes: DrawerWaypoint[] = [];
  let i = 0;
  let cmd: string | null = null;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MLCmlc]$/.test(tok)) {
      cmd = tok.toUpperCase();
      i += 1;
      continue;
    }
    if ((cmd === "M" || cmd === "L") && i + 1 < tokens.length) {
      const x = Number(tokens[i]);
      const y = Number(tokens[i + 1]);
      i += 2;
      if (!Number.isNaN(x) && !Number.isNaN(y)) nodes.push({ x, y });
    } else if (cmd === "C" && i + 5 < tokens.length) {
      const c1x = Number(tokens[i]);
      const c1y = Number(tokens[i + 1]);
      const c2x = Number(tokens[i + 2]);
      const c2y = Number(tokens[i + 3]);
      const x = Number(tokens[i + 4]);
      const y = Number(tokens[i + 5]);
      i += 6;
      if (
        [c1x, c1y, c2x, c2y, x, y].every((n) => !Number.isNaN(n))
      ) {
        if (nodes.length > 0) {
          const prev = nodes[nodes.length - 1];
          nodes[nodes.length - 1] = { ...prev, cOut: { x: c1x, y: c1y } };
        }
        nodes.push({ x, y, cIn: { x: c2x, y: c2y } });
      }
    } else {
      i += 1; // unknown token, skip
    }
  }
  return nodes;
}

function buildDrawerInitial(
  phase: V7Play["phases"][number] | undefined,
  actionIndex: number | null,
): DrawerInitial {
  if (!phase || actionIndex === null) return {};
  const action = phase.actions?.[actionIndex];
  if (!action) return {};
  const validMarkers: ReadonlyArray<DrawerMarker> = ["arrow", "screen", "shot"];
  const marker: DrawerMarker = validMarkers.includes(action.marker as DrawerMarker)
    ? (action.marker as DrawerMarker)
    : "arrow";
  return {
    waypoints: parsePathToWaypoints(action.path ?? ""),
    marker,
    dashed: action.dashed ?? false,
    moveId: action.move?.id ?? null,
    editIndex: actionIndex,
  };
}

function derivePlayerDots(play: V7Play): DrawerPlayer[] {
  const offensive: DrawerPlayer[] = Object.entries(play.players ?? {}).map(
    ([id, pt]) => ({ id, x: pt[0], y: pt[1], isDefender: false }),
  );
  const defensive: DrawerPlayer[] = Object.entries(play.defense ?? {}).map(
    ([id, pt]) => ({ id, x: pt[0], y: pt[1], isDefender: true }),
  );
  return [...offensive, ...defensive];
}

function Toolbar({
  parseError,
  onTemplate,
  onDownload,
  onOpenProse,
  drawMode,
  onToggleDraw,
  phaseCount,
  drawPhaseIndex,
  setDrawPhaseIndex,
}: {
  parseError: string | null;
  onTemplate: (key: string) => void;
  onDownload: () => void;
  onOpenProse: () => void;
  drawMode: boolean;
  onToggleDraw: () => void;
  phaseCount: number;
  drawPhaseIndex: number;
  setDrawPhaseIndex: (i: number) => void;
}) {
  const isValid = parseError === null;
  return (
    <header
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #222",
        display: "flex",
        gap: 12,
        alignItems: "center",
        fontSize: 12,
        background: "#111",
      }}
    >
      <span
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        play-editor · tier 0
      </span>
      <span style={{ color: "#666" }}>|</span>
      <label htmlFor="template" style={{ color: "#aaa" }}>
        template:
      </label>
      <select
        id="template"
        defaultValue=""
        onChange={(e) => onTemplate(e.target.value)}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "4px 8px",
          fontSize: 12,
        }}
      >
        <option value="" disabled>
          choose…
        </option>
        <option value="empty">empty stub</option>
        <option value="lakers-flare-slip">lakers-flare-slip</option>
        <option value="iverson-ram (6-phase extraction)">
          iverson-ram (6-phase extraction)
        </option>
        <option value="black">black (source → v7)</option>
      </select>
      <button
        type="button"
        onClick={onOpenProse}
        style={{
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        import prose → LLM
      </button>
      <span style={{ color: "#666" }}>|</span>
      <label htmlFor="draw-phase" style={{ color: "#aaa" }}>
        phase:
      </label>
      <select
        id="draw-phase"
        value={drawPhaseIndex}
        onChange={(e) => setDrawPhaseIndex(Number(e.target.value))}
        disabled={phaseCount === 0}
        style={{
          background: "#222",
          color: "#e5e5e5",
          border: "1px solid #333",
          padding: "4px 8px",
          fontSize: 12,
        }}
      >
        {phaseCount === 0 ? (
          <option value={0}>(no phases)</option>
        ) : (
          Array.from({ length: phaseCount }).map((_, i) => (
            <option key={i} value={i}>
              phase {i + 1}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        onClick={onToggleDraw}
        disabled={phaseCount === 0 || !isValid}
        style={{
          background: drawMode ? "#f59e0b" : "#6b21a8",
          color: "#fff",
          border: "none",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: phaseCount === 0 || !isValid ? "not-allowed" : "pointer",
          opacity: phaseCount === 0 || !isValid ? 0.4 : 1,
        }}
      >
        {drawMode ? "exit draw" : "✎ draw action"}
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={!isValid}
        style={{
          background: isValid ? "#2b5" : "#333",
          color: isValid ? "#000" : "#666",
          border: "none",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: isValid ? "pointer" : "not-allowed",
        }}
      >
        download .ts
      </button>
      <span
        style={{
          marginLeft: "auto",
          color: isValid ? "#7bdc7b" : "#ff6b6b",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        }}
      >
        {isValid ? "✓ valid" : `✗ ${parseError}`}
      </span>
    </header>
  );
}

function ProseModal({
  prose,
  setProse,
  busy,
  error,
  onExtract,
  onClose,
}: {
  prose: string;
  setProse: (v: string) => void;
  busy: boolean;
  error: string | null;
  onExtract: () => void;
  onClose: () => void;
}) {
  // Only dismiss on a click that both STARTED and ENDED on the backdrop
  // itself. This lets the user drag a text selection across the textarea
  // edge without the modal closing mid-selection.
  const mouseDownOnBackdrop = useRef(false);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #333",
          width: "min(800px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              letterSpacing: 0.4,
            }}
          >
            paste book prose → LLM extract
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#888",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.5 }}>
          Paste the overview + numbered instructions + coaching points. Claude extracts a
          V7Play draft: metadata, phases, spotlight text, plausible defender reactions. You
          refine coordinates, draw curves, and tweak prose in the editor.
        </p>
        <textarea
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          placeholder="Paste the play's prose from the book here..."
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 300,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            padding: 12,
            background: "#0b0b0b",
            color: "#e5e5e5",
            border: "1px solid #333",
            outline: "none",
            resize: "vertical",
          }}
        />
        {error && (
          <div style={{ fontSize: 11, color: "#ff6b6b", fontFamily: "monospace" }}>
            ✗ {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              background: "transparent",
              color: "#aaa",
              border: "1px solid #333",
              padding: "6px 14px",
              fontSize: 12,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onExtract}
            disabled={busy || !prose.trim()}
            style={{
              background: busy || !prose.trim() ? "#333" : "#3b82f6",
              color: busy || !prose.trim() ? "#666" : "#fff",
              border: "none",
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: busy || !prose.trim() ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "extracting…" : "extract with Claude"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionList({
  phase,
  phaseIndex,
  onEdit,
  onNew,
  onDelete,
}: {
  phase: V7Play["phases"][number] | undefined;
  phaseIndex: number;
  onEdit: (i: number) => void;
  onNew: () => void;
  onDelete: (i: number) => void;
}) {
  const actions = phase?.actions ?? [];
  return (
    <div
      style={{
        marginBottom: 12,
        padding: "8px 10px",
        background: "#141414",
        border: "1px solid #222",
        fontSize: 11,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: actions.length > 0 ? 6 : 0,
        }}
      >
        <span style={{ color: "#aaa", letterSpacing: 0.4 }}>
          phase {phaseIndex + 1} · {actions.length} action
          {actions.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onNew}
          style={{
            background: "#6b21a8",
            color: "#fff",
            border: "none",
            padding: "3px 8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + new action
        </button>
      </div>
      {actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {actions.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "4px 6px",
                background: "#0b0b0b",
                border: "1px solid #222",
              }}
            >
              <span style={{ color: "#aaa", minWidth: 14 }}>{i + 1}.</span>
              <span
                style={{
                  color:
                    a.marker === "screen"
                      ? "#ffa500"
                      : a.marker === "shot"
                        ? "#ff6b6b"
                        : "#fff",
                  minWidth: 48,
                }}
              >
                {a.marker}
                {a.dashed ? " · dashed" : ""}
              </span>
              <span style={{ color: "#888" }}>
                {a.move?.id ? `moves ${a.move.id}` : a.ball ? `pass ${a.ball.from}→${a.ball.to}` : "—"}
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => onEdit(i)}
                style={{
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  padding: "2px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(i)}
                style={{
                  background: "transparent",
                  color: "#ff6b6b",
                  border: "1px solid #333",
                  padding: "2px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodoBanner({ todos }: { todos: string[] }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #222",
        background: "#1a1408",
        color: "#f0c674",
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <span
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
          fontWeight: 700,
          marginRight: 8,
        }}
      >
        TODO:
      </span>
      {todos.map((t, i) => (
        <span key={i} style={{ marginRight: 12 }}>
          · {t}
        </span>
      ))}
    </div>
  );
}
