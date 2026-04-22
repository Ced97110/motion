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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CourtDrawer, {
  type DrawerInitial,
  type DrawerMarker,
  type DrawerPlayer,
  type DrawerResult,
  type DrawerSibling,
  type DrawerWaypoint,
} from "@/components/atoms/CourtDrawer";
import PlayViewerV7 from "@/components/atoms/PlayViewerV7";
import { blackPlay } from "@/data/plays/black";
import { lakersFlareSlipV7 } from "@/data/plays/lakers-flare-slip";
import type { V7Action, V7Play } from "@/lib/plays/v7-types";
import { derivePhasePreviewPlay } from "@/lib/plays/phase-simulator";
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
    // extractor emits `path: ""` by design. Rather than a degenerate
    // fallback (legal SVG but zero-visible), synthesize a real straight-line
    // `M x0 y0 L x1 y1` from the moving player's currently-tracked position
    // to `action.move.to`. This makes every extracted action visible as an
    // arrow/screen/handoff on first render while the user has not yet hand-
    // drawn a curve. Actions with no `move` still fall back to the degenerate
    // path so the viewer's getPointAtLength call does not throw.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    type Pt = readonly [number, number];
    const synthesizeActions = (
      actions: unknown,
      positions: Map<string, Pt>,
    ): unknown => {
      if (!Array.isArray(actions)) return actions;
      return actions.map((a: unknown) => {
        if (!a || typeof a !== "object") return a;
        const act = a as {
          path?: unknown;
          move?: { id?: unknown; to?: unknown } | null;
        };
        const hasPath =
          typeof act.path === "string" && act.path.trim().length > 0;
        if (hasPath) return a;
        const move = act.move;
        const moveId =
          move && typeof move === "object" && typeof move.id === "string"
            ? move.id
            : null;
        const to =
          move &&
          typeof move === "object" &&
          Array.isArray(move.to) &&
          move.to.length === 2 &&
          typeof move.to[0] === "number" &&
          typeof move.to[1] === "number"
            ? ([move.to[0], move.to[1]] as Pt)
            : null;
        if (moveId !== null && to !== null) {
          const from = positions.get(moveId) ?? to;
          const synth = `M ${r2(from[0])} ${r2(from[1])} L ${r2(to[0])} ${r2(to[1])}`;
          // Advance the tracked position AFTER emitting the line, so the
          // next action on the same player starts where this one ended.
          positions.set(moveId, to);
          return { ...act, path: synth };
        }
        // No move metadata — fall back to degenerate path so the viewer's
        // getPointAtLength call does not throw InvalidStateError.
        return { ...act, path: "M 0 0 L 0.001 0" };
      });
    };
    const seedPositions = (): Map<string, Pt> => {
      const m = new Map<string, Pt>();
      const players = play.players as Record<string, unknown> | undefined;
      if (players && typeof players === "object") {
        for (const [id, pt] of Object.entries(players)) {
          if (
            Array.isArray(pt) &&
            pt.length === 2 &&
            typeof pt[0] === "number" &&
            typeof pt[1] === "number"
          ) {
            m.set(id, [pt[0], pt[1]] as Pt);
          }
        }
      }
      return m;
    };
    const phases = play.phases;
    // Main-line phases share one tracked-position map (player keeps moving
    // across phases). Branch options each get a DEEP-CLONED snapshot so
    // sibling branches do not contaminate each other.
    const mainPositions = seedPositions();
    if (Array.isArray(phases)) {
      phases.forEach((ph: unknown) => {
        if (!ph || typeof ph !== "object") return;
        const phase = ph as { actions?: unknown };
        phase.actions = synthesizeActions(phase.actions, mainPositions);
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
        // Each branch option gets its own DEEP-CLONED snapshot of the
        // post-main-line positions — branches are alternate futures and
        // must not contaminate each other.
        options.forEach((opt: unknown) => {
          if (!opt || typeof opt !== "object") return;
          const o = opt as { phase?: { actions?: unknown } };
          if (o.phase && typeof o.phase === "object") {
            const branchPositions = new Map<string, Pt>();
            for (const [id, pt] of mainPositions) {
              branchPositions.set(id, [pt[0], pt[1]] as Pt);
            }
            o.phase.actions = synthesizeActions(
              o.phase.actions,
              branchPositions,
            );
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

interface WikiPlayListItem {
  slug: string;
  name: string;
  phaseCount: number;
  hasDiagram: boolean;
  blockCount: number;
}

type WikiImportSource =
  | "wiki-structured"
  | "wiki-partial"
  | "wiki-no-diagram"
  | string;

interface WikiImportResponse {
  play: V7Play | null;
  todos: string[];
  source: WikiImportSource;
}

type WikiTier = "structured" | "partial" | "no-diagram";

function classifyWikiTier(item: WikiPlayListItem): WikiTier {
  if (!item.hasDiagram) return "no-diagram";
  if (item.blockCount >= item.phaseCount) return "structured";
  return "partial";
}

const TIER_ORDER: Record<WikiTier, number> = {
  structured: 0,
  partial: 1,
  "no-diagram": 2,
};

const API_BASE = process.env.NEXT_PUBLIC_MOTION_API_URL ?? "http://localhost:8080";

// localStorage slot for the in-progress edit. Single slot — the lab is a
// single-user dev tool, so one draft is plenty. Picking "empty" from the
// template dropdown is the explicit reset path.
const DRAFT_KEY = "motion:play-editor:draft";

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
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiList, setWikiList] = useState<WikiPlayListItem[] | null>(null);
  const [wikiListLoading, setWikiListLoading] = useState(false);
  const [wikiListError, setWikiListError] = useState<string | null>(null);
  const [wikiImportingSlug, setWikiImportingSlug] = useState<string | null>(
    null,
  );
  const [wikiRowError, setWikiRowError] = useState<{
    slug: string;
    message: string;
  } | null>(null);
  const [wikiInlineNotice, setWikiInlineNotice] = useState<string | null>(null);
  // Gate auto-save until we've had a chance to restore — avoids overwriting a
  // stored draft with the initialState default on mount.
  const [draftRestored, setDraftRestored] = useState(false);
  // When non-null, the right pane renders a single-phase preview (with
  // players repositioned to their state at the START of that phase) instead
  // of the full play. Null == normal end-to-end playback.
  const [previewPhase, setPreviewPhase] = useState<number | null>(null);

  // Restore once on mount. Runs only client-side (useEffect is never SSR'd).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { input?: unknown };
        if (typeof parsed.input === "string" && parsed.input.length > 0) {
          setState((prev) => applyInput(prev, parsed.input as string, []));
        }
      }
    } catch {
      // Corrupt JSON or storage disabled — fall back to initialState.
    }
    setDraftRestored(true);
  }, []);

  // Debounced save on every input change. Skipped until the restore effect
  // has run (see `draftRestored`) so we never clobber the stored draft with
  // initialState during the first render.
  useEffect(() => {
    if (!draftRestored) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            input: state.input,
            lastModified: Date.now(),
          }),
        );
      } catch {
        // Quota exceeded / storage disabled — silently drop the save.
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [state.input, draftRestored]);

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
          marker: V7Action["marker"];
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

  const handleAddPhase = useCallback(() => {
    const currentCount = state.displayPlay.phases?.length ?? 0;
    setState((prev) => {
      const play = prev.displayPlay;
      const phases = Array.isArray(play.phases) ? [...play.phases] : [];
      const nextPhases = [
        ...phases,
        {
          label: `Phase ${phases.length + 1}`,
          text: "",
          actions: [],
        },
      ];
      const nextPlay = { ...play, phases: nextPhases };
      return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
    });
    // Select the newly-appended phase (new last index).
    setDrawPhaseIndex(currentCount);
  }, [state.displayPlay.phases?.length]);

  const handleDuplicatePhase = useCallback(
    (phaseIndex: number) => {
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        const target = phases[phaseIndex];
        if (!target) return prev;
        const clone = structuredClone(target);
        const nextPhases = [
          ...phases.slice(0, phaseIndex + 1),
          clone,
          ...phases.slice(phaseIndex + 1),
        ];
        const nextPlay = { ...play, phases: nextPhases };
        return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
      });
      // Select the duplicated phase (right after the source).
      setDrawPhaseIndex(phaseIndex + 1);
    },
    [],
  );

  const handleDeletePhase = useCallback(
    (phaseIndex: number) => {
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        if (phases.length <= 1) return prev; // guard: must keep ≥1 phase
        const nextPhases = phases.filter((_, i) => i !== phaseIndex);
        const nextPlay = { ...play, phases: nextPhases };
        return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
      });
      setDrawPhaseIndex((prevIdx) => {
        // If deleting the active phase or one before it, shift selection.
        if (prevIdx === phaseIndex) return Math.max(0, phaseIndex - 1);
        if (prevIdx > phaseIndex) return prevIdx - 1;
        return prevIdx;
      });
    },
    [],
  );

  const handleMovePhase = useCallback(
    (phaseIndex: number, direction: -1 | 1) => {
      const targetIdx = phaseIndex + direction;
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        if (targetIdx < 0 || targetIdx >= phases.length) return prev;
        const nextPhases = [...phases];
        const [moved] = nextPhases.splice(phaseIndex, 1);
        nextPhases.splice(targetIdx, 0, moved);
        const nextPlay = { ...play, phases: nextPhases };
        return applyInput(prev, JSON.stringify(nextPlay, null, 2), prev.todos);
      });
      setDrawPhaseIndex((prevIdx) => {
        if (prevIdx === phaseIndex) return targetIdx;
        if (prevIdx === targetIdx) return phaseIndex;
        return prevIdx;
      });
    },
    [],
  );

  const handleRenamePhase = useCallback(
    (phaseIndex: number, nextLabel: string) => {
      setState((prev) => {
        const play = prev.displayPlay;
        const phases = Array.isArray(play.phases) ? [...play.phases] : [];
        const target = phases[phaseIndex];
        if (!target) return prev;
        phases[phaseIndex] = { ...target, label: nextLabel };
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

  const fetchWikiList = useCallback(async () => {
    setWikiListLoading(true);
    setWikiListError(null);
    try {
      const response = await fetch(`${API_BASE}/api/playlab/wiki-plays`);
      if (!response.ok) throw new Error(`API ${response.status}`);
      const body = (await response.json()) as WikiPlayListItem[];
      setWikiList(body);
    } catch (err) {
      setWikiListError(err instanceof Error ? err.message : String(err));
      setWikiList(null);
    } finally {
      setWikiListLoading(false);
    }
  }, []);

  const handleOpenWiki = useCallback(() => {
    setWikiOpen(true);
    setWikiRowError(null);
    setWikiInlineNotice(null);
    // Re-fetch every open — wiki may have changed between opens.
    void fetchWikiList();
  }, [fetchWikiList]);

  const handleCloseWiki = useCallback(() => {
    setWikiOpen(false);
    setWikiRowError(null);
    setWikiInlineNotice(null);
    setWikiImportingSlug(null);
  }, []);

  const handleImportWiki = useCallback(
    async (item: WikiPlayListItem) => {
      setWikiImportingSlug(item.slug);
      setWikiRowError(null);
      setWikiInlineNotice(null);
      try {
        const response = await fetch(
          `${API_BASE}/api/playlab/import-wiki/${encodeURIComponent(item.slug)}`,
        );
        if (!response.ok) throw new Error(`API ${response.status}`);
        const body = (await response.json()) as WikiImportResponse;
        if (body.source === "wiki-no-diagram" || body.play === null) {
          setWikiInlineNotice(
            `"${item.name}" has only prose — use Extract from prose instead.`,
          );
          return;
        }
        const taggedTodos = (body.todos ?? []).map((t) => `[wiki] ${t}`);
        setState((prev) =>
          applyInput(prev, JSON.stringify(body.play, null, 2), taggedTodos),
        );
        setWikiOpen(false);
      } catch (err) {
        setWikiRowError({
          slug: item.slug,
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setWikiImportingSlug(null);
      }
    },
    [],
  );

  const handleProseFromWiki = useCallback(
    (item: WikiPlayListItem) => {
      setProse(`# ${item.name}\n\n`);
      setWikiOpen(false);
      setProseOpen(true);
    },
    [],
  );

  // If the active preview phase slips out of bounds after a delete or
  // wiki re-import, fall back to normal playback. Done in an effect so we
  // never trigger a setState during render.
  const phaseCount = state.displayPlay.phases?.length ?? 0;
  useEffect(() => {
    if (previewPhase !== null && previewPhase >= phaseCount) {
      setPreviewPhase(null);
    }
  }, [previewPhase, phaseCount]);

  // Derive a single-phase play whenever previewPhase is active. Memoized
  // so the PlayViewerV7 only rebuilds when the source play or the target
  // phase changes — avoids restarting the GSAP timeline on every render.
  const previewedPlay = useMemo<V7Play>(() => {
    if (previewPhase === null) return state.displayPlay;
    return derivePhasePreviewPlay(state.displayPlay, previewPhase);
  }, [state.displayPlay, previewPhase]);

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
        onOpenWiki={handleOpenWiki}
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
      {wikiOpen && (
        <WikiModal
          list={wikiList}
          loading={wikiListLoading}
          listError={wikiListError}
          importingSlug={wikiImportingSlug}
          rowError={wikiRowError}
          inlineNotice={wikiInlineNotice}
          onRetryList={fetchWikiList}
          onImport={handleImportWiki}
          onProseFallback={handleProseFromWiki}
          onClose={handleCloseWiki}
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
              siblingActions={buildSiblingActions(
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
              <PhaseList
                phases={state.displayPlay.phases ?? []}
                activeIndex={drawPhaseIndex}
                onSelect={setDrawPhaseIndex}
                onAdd={handleAddPhase}
                onDuplicate={handleDuplicatePhase}
                onDelete={handleDeletePhase}
                onMove={handleMovePhase}
                onRename={handleRenamePhase}
                onPreview={(i) => setPreviewPhase(i)}
              />
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
              {previewPhase !== null && (
                <PreviewBanner
                  phaseIndex={previewPhase}
                  phaseLabel={
                    state.displayPlay.phases?.[previewPhase]?.label ?? ""
                  }
                  onExit={() => setPreviewPhase(null)}
                />
              )}
              <PlayViewerV7
                key={previewPhase === null ? "full" : `preview-${previewPhase}`}
                play={previewedPlay}
              />
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

/**
 * Collect the OTHER actions in the same phase as ghost context for the
 * drawer. When `excludeIndex` is null (new-action flow) all phase actions
 * are returned; when editing action N, that action is omitted so the ghost
 * layer does not double up on the live edit path.
 */
function buildSiblingActions(
  phase: V7Play["phases"][number] | undefined,
  excludeIndex: number | null,
): DrawerSibling[] {
  const actions = phase?.actions ?? [];
  const siblings: DrawerSibling[] = [];
  actions.forEach((a, i) => {
    if (excludeIndex !== null && i === excludeIndex) return;
    const path = typeof a.path === "string" ? a.path : "";
    if (path.trim().length === 0) return;
    const sibling: DrawerSibling = { path, marker: a.marker };
    if (a.dashed) sibling.dashed = true;
    if (a.move) sibling.move = { id: a.move.id, to: a.move.to };
    siblings.push(sibling);
  });
  return siblings;
}

function derivePlayerDots(play: V7Play): DrawerPlayer[] {
  // Lab authoring surface deliberately hides defenders from the drawer —
  // the user doesn't want to author defense in the lab. `play.defense`
  // stays in the schema (imports and downloads round-trip it), but we do
  // not surface defender positions as draggable/snappable targets here.
  const offensive: DrawerPlayer[] = Object.entries(play.players ?? {}).map(
    ([id, pt]) => ({ id, x: pt[0], y: pt[1], isDefender: false }),
  );
  return offensive;
}

function Toolbar({
  parseError,
  onTemplate,
  onDownload,
  onOpenProse,
  onOpenWiki,
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
  onOpenWiki: () => void;
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
      <button
        type="button"
        onClick={onOpenWiki}
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
        import from wiki
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
          V7Play draft: metadata, phases, spotlight text. You refine coordinates, draw
          curves, and tweak prose in the editor.
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

function PhaseList({
  phases,
  activeIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onRename,
  onPreview,
}: {
  phases: V7Play["phases"];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number, direction: -1 | 1) => void;
  onRename: (i: number, label: string) => void;
  onPreview: (i: number) => void;
}) {
  const count = phases.length;
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
          marginBottom: count > 0 ? 6 : 0,
        }}
      >
        <span style={{ color: "#aaa", letterSpacing: 0.4 }}>
          phases · {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
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
          + add phase
        </button>
      </div>
      {count > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {phases.map((phase, i) => {
            const isActive = i === activeIndex;
            const isFirst = i === 0;
            const isLast = i === count - 1;
            const isOnly = count === 1;
            return (
              <div
                key={i}
                onClick={() => onSelect(i)}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  padding: "4px 6px",
                  background: isActive ? "#1a1a1a" : "#0b0b0b",
                  border: isActive ? "1px solid #f59e0b" : "1px solid #222",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: "#aaa", minWidth: 14 }}>{i + 1}.</span>
                <input
                  type="text"
                  value={phase.label ?? ""}
                  onChange={(e) => onRename(i, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: "#e5e5e5",
                    border: "none",
                    outline: "none",
                    padding: "2px 4px",
                    fontFamily: "inherit",
                    fontSize: 11,
                  }}
                />
                <span style={{ color: "#666" }}>
                  {(phase.actions?.length ?? 0)} act
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(i, -1);
                  }}
                  disabled={isFirst}
                  aria-label="move phase up"
                  style={{
                    background: "transparent",
                    color: isFirst ? "#444" : "#aaa",
                    border: "1px solid #333",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: isFirst ? "not-allowed" : "pointer",
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(i, 1);
                  }}
                  disabled={isLast}
                  aria-label="move phase down"
                  style={{
                    background: "transparent",
                    color: isLast ? "#444" : "#aaa",
                    border: "1px solid #333",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: isLast ? "not-allowed" : "pointer",
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(i);
                  }}
                  aria-label="preview phase"
                  title="preview this phase only"
                  style={{
                    background: "transparent",
                    color: "#f26b1f",
                    border: "1px solid #333",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(i);
                  }}
                  aria-label="duplicate phase"
                  style={{
                    background: "transparent",
                    color: "#aaa",
                    border: "1px solid #333",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  dup
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(i);
                  }}
                  disabled={isOnly}
                  aria-label="delete phase"
                  title={isOnly ? "at least one phase required" : "delete phase"}
                  style={{
                    background: "transparent",
                    color: isOnly ? "#444" : "#ff6b6b",
                    border: "1px solid #333",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: isOnly ? "not-allowed" : "pointer",
                  }}
                >
                  del
                </button>
              </div>
            );
          })}
        </div>
      )}
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

function PreviewBanner({
  phaseIndex,
  phaseLabel,
  onExit,
}: {
  phaseIndex: number;
  phaseLabel: string;
  onExit: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
        padding: "8px 12px",
        background: "#1a0d05",
        border: "1px solid #f26b1f",
        color: "#f26b1f",
        fontSize: 11,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        letterSpacing: 0.3,
      }}
    >
      <span>
        previewing phase {phaseIndex + 1}
        {phaseLabel ? ` · ${phaseLabel}` : ""}
      </span>
      <button
        type="button"
        onClick={onExit}
        style={{
          background: "transparent",
          color: "#f26b1f",
          border: "1px solid #f26b1f",
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        exit preview
      </button>
    </div>
  );
}

function TodoBanner({ todos }: { todos: string[] }) {
  // Defense is out-of-scope for the lab — any defender-related TODOs from
  // the extractor are noise here. Filter them out before display.
  const visibleTodos = todos.filter((t) => !/defen[sc]e|defender/i.test(t));
  if (visibleTodos.length === 0) return null;
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
      {visibleTodos.map((t, i) => (
        <span key={i} style={{ marginRight: 12 }}>
          · {t}
        </span>
      ))}
    </div>
  );
}

function tierBadge(tier: WikiTier): {
  label: string;
  fg: string;
  bg: string;
  border: string;
} {
  if (tier === "structured") {
    return {
      label: "structured",
      fg: "#0b0b0b",
      bg: "#7bdc7b",
      border: "#7bdc7b",
    };
  }
  if (tier === "partial") {
    return {
      label: "partial",
      fg: "#0b0b0b",
      bg: "#f0c674",
      border: "#f0c674",
    };
  }
  return {
    label: "no diagram — use prose instead",
    fg: "#aaa",
    bg: "transparent",
    border: "#444",
  };
}

function WikiModal({
  list,
  loading,
  listError,
  importingSlug,
  rowError,
  inlineNotice,
  onRetryList,
  onImport,
  onProseFallback,
  onClose,
}: {
  list: WikiPlayListItem[] | null;
  loading: boolean;
  listError: string | null;
  importingSlug: string | null;
  rowError: { slug: string; message: string } | null;
  inlineNotice: string | null;
  onRetryList: () => void;
  onImport: (item: WikiPlayListItem) => void;
  onProseFallback: (item: WikiPlayListItem) => void;
  onClose: () => void;
}) {
  // Same backdrop-dismiss guard as ProseModal: only close if both mousedown
  // and mouseup land on the backdrop.
  const mouseDownOnBackdrop = useRef(false);
  const [query, setQuery] = useState("");

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sortedFiltered = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (item) =>
            item.slug.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q),
        )
      : list;
    // Stable tier-then-alpha sort.
    return [...filtered].sort((a, b) => {
      const ta = TIER_ORDER[classifyWikiTier(a)];
      const tb = TIER_ORDER[classifyWikiTier(b)];
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
  }, [list, query]);

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
          width: "min(820px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              letterSpacing: 0.4,
            }}
          >
            import from wiki
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
          Pick a wiki play to load its structured shape directly into the lab
          (bypasses the LLM extractor). Structured pages load cleanly; partial
          and no-diagram pages need follow-up authoring.
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter by slug or name…"
          spellCheck={false}
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: 12,
            padding: "6px 10px",
            background: "#0b0b0b",
            color: "#e5e5e5",
            border: "1px solid #333",
            outline: "none",
          }}
        />
        {inlineNotice && (
          <div
            style={{
              padding: "8px 10px",
              background: "#1a1408",
              color: "#f0c674",
              fontSize: 11,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>{inlineNotice}</span>
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 300,
            overflow: "auto",
            border: "1px solid #222",
            background: "#0b0b0b",
          }}
        >
          {loading && (
            <div
              style={{
                padding: 16,
                fontSize: 12,
                color: "#888",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              }}
            >
              loading wiki plays…
            </div>
          )}
          {!loading && listError !== null && (
            <div
              style={{
                padding: 16,
                fontSize: 12,
                color: "#ff6b6b",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              }}
            >
              <span>✗ {listError}</span>
              <button
                type="button"
                onClick={onRetryList}
                style={{
                  background: "transparent",
                  color: "#e5e5e5",
                  border: "1px solid #333",
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                retry
              </button>
            </div>
          )}
          {!loading && listError === null && sortedFiltered.length === 0 && (
            <div
              style={{
                padding: 16,
                fontSize: 12,
                color: "#888",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              }}
            >
              {list === null ? "no data" : "no matches"}
            </div>
          )}
          {!loading &&
            listError === null &&
            sortedFiltered.map((item) => {
              const tier = classifyWikiTier(item);
              const badge = tierBadge(tier);
              const isImporting = importingSlug === item.slug;
              const thisRowError =
                rowError && rowError.slug === item.slug ? rowError.message : null;
              const isNoDiagram = tier === "no-diagram";
              return (
                <div
                  key={item.slug}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "8px 12px",
                    borderBottom: "1px solid #1a1a1a",
                    background: "#0b0b0b",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                        fontSize: 11,
                        color: "#aaa",
                        minWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.slug}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#e5e5e5",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#888",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                        minWidth: 48,
                        textAlign: "right",
                      }}
                    >
                      {item.phaseCount} ph
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        color: badge.fg,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                        letterSpacing: 0.3,
                      }}
                    >
                      {badge.label}
                    </span>
                    {isNoDiagram ? (
                      <button
                        type="button"
                        onClick={() => onProseFallback(item)}
                        style={{
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        use prose →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onImport(item)}
                        disabled={isImporting}
                        style={{
                          background: isImporting ? "#333" : "#f26b1f",
                          color: isImporting ? "#666" : "#0b0b0b",
                          border: "none",
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: isImporting ? "not-allowed" : "pointer",
                        }}
                      >
                        {isImporting ? "loading…" : "load"}
                      </button>
                    )}
                  </div>
                  {thisRowError !== null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 11,
                        color: "#ff6b6b",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                      }}
                    >
                      <span>✗ {thisRowError}</span>
                      <button
                        type="button"
                        onClick={() => onImport(item)}
                        style={{
                          background: "transparent",
                          color: "#e5e5e5",
                          border: "1px solid #333",
                          padding: "2px 8px",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        retry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#666",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
          }}
        >
          <span>
            {list === null
              ? ""
              : `${sortedFiltered.length} / ${list.length} play${list.length === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#aaa",
              border: "1px solid #333",
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}
