// Game Day Flow — three-phase adaptive screen for courtside use.
// Implements docs/specs/game-plan.md "Game Day Flow — Atomic Workflow".
// Reference: docs/reference-screens/GameDayFlow.jsx (approved).

"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  Clock,
  Shield,
  Swords,
  Zap,
  AlertTriangle,
  ChevronRight,
  Check,
  Play,
  Activity,
  Wifi,
  WifiOff,
  UserPlus,
  Undo2,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { BallDot } from "@/components/atoms/BallDot";
import {
  ACCENT,
  ACCENT_SOFT,
  BG_PAGE,
  BG_SURFACE,
  BORDER_MEDIUM,
  BORDER_STRONG,
  BORDER_SUBTLE,
  COLOR_AMBER,
  COLOR_GREEN,
  COLOR_PURPLE,
  COLOR_RED,
  TEXT_DIM,
  TEXT_GHOST,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "@/lib/design-tokens";
import {
  AI_ADJ,
  BOX,
  CHIP_DATA,
  FALLBACK_ADJ,
  GAME,
  LIVE_EXPLOITS,
} from "./mock-data";

type Phase = "pregame" | "halftime" | "live";
type ChipCategory = "offense" | "defense" | "situational";

const ROOT_STYLE: CSSProperties = {
  minHeight: "100vh",
  background: BG_PAGE,
  color: TEXT_MUTED,
  fontFamily: "inherit",
  fontSize: 13,
};

export function GameDayFlow() {
  const [phase, setPhase] = useState<Phase>("halftime");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdj, setShowAdj] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasGamePlan, setHasGamePlan] = useState(true);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [showTrackerInvite, setShowTrackerInvite] = useState(false);
  const [showQuickPlay, setShowQuickPlay] = useState(false);
  const [customChip, setCustomChip] = useState("");
  const [showCustomInput, setShowCustomInput] = useState<ChipCategory | null>(null);
  const [gameTime, setGameTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setGameTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const toggleChip = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowAdj(false);
  };
  const selectedCount = selected.size;

  return (
    <div style={ROOT_STYLE}>
      <GameBar
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((v) => !v)}
        gameTime={gameTime}
      />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px 0" }}>
        <div style={{ display: "flex", gap: 0, border: `1px solid ${BORDER_STRONG}` }}>
          {(
            [
              { id: "pregame", label: "Pre-game", sub: "Review plan" },
              { id: "halftime", label: "Halftime", sub: "Quick adjust" },
              { id: "live", label: "Live", sub: "Stat exploits" },
            ] as const
          ).map(({ id, label, sub }) => {
            const active = phase === id;
            return (
              <div
                key={id}
                onClick={() => setPhase(id)}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: active ? ACCENT_SOFT : "transparent",
                  borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                  borderRight: `1px solid ${BORDER_STRONG}`,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 900 : 500,
                    color: active ? ACCENT : TEXT_DIM,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: active ? ACCENT : TEXT_GHOST,
                    marginTop: 2,
                  }}
                >
                  {sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 20px 60px" }}>
        {phase === "pregame" && (
          <PreGamePanel
            hasGamePlan={hasGamePlan}
            onGeneratePlan={() => setHasGamePlan(true)}
          />
        )}

        {phase === "halftime" && (
          <HalftimePanel
            selected={selected}
            selectedCount={selectedCount}
            showAdj={showAdj}
            showQuickPlay={showQuickPlay}
            showScoreInput={showScoreInput}
            showCustomInput={showCustomInput}
            customChip={customChip}
            isOffline={isOffline}
            onToggleChip={toggleChip}
            onShowAdj={() => setShowAdj(true)}
            onHideAdj={() => setShowAdj(false)}
            onShowQuickPlay={() => setShowQuickPlay(true)}
            onHideQuickPlay={() => setShowQuickPlay(false)}
            onToggleScoreInput={() => setShowScoreInput((v) => !v)}
            onSetCustomInput={setShowCustomInput}
            onSetCustomChip={setCustomChip}
          />
        )}

        {phase === "live" && (
          <LivePanel
            showTrackerInvite={showTrackerInvite}
            onToggleTrackerInvite={() => setShowTrackerInvite((v) => !v)}
          />
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

// ── Game bar ─────────────────────────────────────────────────────────────

function GameBar({
  isOffline,
  onToggleOffline,
  gameTime,
}: {
  isOffline: boolean;
  onToggleOffline: () => void;
  gameTime: string;
}) {
  return (
    <div
      style={{
        background: BG_SURFACE,
        borderBottom: `1px solid ${BORDER_STRONG}`,
        padding: "0 20px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              letterSpacing: "-0.5px",
            }}
          >
            motion
            <BallDot size={6} />
          </div>
          <div style={{ height: 18, width: 1, background: BORDER_MEDIUM }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 8,
                height: 8,
                background: COLOR_RED,
                borderRadius: "50%",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLOR_RED,
                textTransform: "uppercase",
              }}
            >
              Live
            </span>
          </div>
          {isOffline && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 6px",
                background: `${COLOR_AMBER}15`,
                border: `1px solid ${COLOR_AMBER}30`,
              }}
            >
              <WifiOff size={10} color={COLOR_AMBER} />
              <span style={{ fontSize: 9, color: COLOR_AMBER, fontWeight: 600 }}>
                Offline
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              You
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: TEXT_PRIMARY }}>
              {GAME.score.us}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: TEXT_GHOST,
              fontWeight: 600,
              padding: "4px 8px",
              border: `1px solid ${BORDER_MEDIUM}`,
            }}
          >
            {GAME.quarter}
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {GAME.opponent.split(" ")[0]}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: COLOR_RED }}>
              {GAME.score.them}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM }}>
            <Clock size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
            {gameTime}
          </span>
          <div
            onClick={onToggleOffline}
            style={{
              cursor: "pointer",
              padding: "3px 6px",
              border: `1px solid ${BORDER_MEDIUM}`,
              fontSize: 9,
              color: TEXT_DIM,
            }}
          >
            {isOffline ? <Wifi size={10} /> : <WifiOff size={10} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pre-game panel ───────────────────────────────────────────────────────

function PreGamePanel({
  hasGamePlan,
  onGeneratePlan,
}: {
  hasGamePlan: boolean;
  onGeneratePlan: () => void;
}) {
  if (!hasGamePlan) {
    return (
      <div>
        <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
          <Zap size={24} color={COLOR_PURPLE} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 900, color: TEXT_PRIMARY, marginBottom: 4 }}>
            No game plan yet
          </div>
          <div style={{ fontSize: 13, color: TEXT_DIM }}>
            Generate one in 90 seconds
          </div>
        </div>
        <div style={{ border: `1px solid ${BORDER_STRONG}`, padding: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TEXT_MUTED,
              marginBottom: 8,
            }}
          >
            Who are you playing tonight?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Opponent name..."
              style={{
                flex: 1,
                padding: "10px 12px",
                background: BG_PAGE,
                border: `1px solid ${BORDER_MEDIUM}`,
                color: TEXT_PRIMARY,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={onGeneratePlan}
              style={{
                padding: "10px 20px",
                background: ACCENT,
                border: "none",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              Quick plan
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: TEXT_GHOST }}>
            Or{" "}
            <span
              onClick={onGeneratePlan}
              style={{ color: ACCENT, cursor: "pointer" }}
            >
              skip — generate from your team strengths
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: TEXT_GHOST,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Tonight&apos;s game plan · vs {GAME.opponent}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              padding: "4px 10px",
              border: `1px solid ${BORDER_MEDIUM}`,
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_DIM,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <ArrowLeftRight size={9} /> Edit lineup
          </div>
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${BORDER_STRONG}`,
          marginBottom: 12,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: TEXT_GHOST,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Defensive scheme
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: TEXT_PRIMARY }}>
            {GAME.plan.scheme}
          </div>
        </div>
        <Shield size={20} color={COLOR_GREEN} />
      </div>

      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: TEXT_GHOST,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 6,
        }}
      >
        Plays to run
      </div>
      {GAME.plan.plays.map((play, i) => (
        <div
          key={play}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `1px solid ${ACCENT}40`,
              background: ACCENT_SOFT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              color: ACCENT,
            }}
          >
            {i + 1}
          </div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
            {play}
          </div>
          <ChevronRight size={14} color={TEXT_DIM} />
        </div>
      ))}

      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          borderLeft: `2px solid ${COLOR_PURPLE}`,
          background: `${COLOR_PURPLE}08`,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: COLOR_PURPLE,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Key matchup
        </div>
        <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          Force their key guard right on every ball screen. His left floater is
          54% — his right is 28%. ICE everything.
        </p>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "10px 14px",
          border: `1px dashed ${BORDER_MEDIUM}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          color: TEXT_DIM,
          fontSize: 11,
        }}
      >
        + Add warmup observation
      </div>
    </div>
  );
}

// ── Halftime panel ───────────────────────────────────────────────────────

function HalftimePanel({
  selected,
  selectedCount,
  showAdj,
  showQuickPlay,
  showScoreInput,
  showCustomInput,
  customChip,
  isOffline,
  onToggleChip,
  onShowAdj,
  onHideAdj,
  onShowQuickPlay,
  onHideQuickPlay,
  onToggleScoreInput,
  onSetCustomInput,
  onSetCustomChip,
}: {
  selected: Set<string>;
  selectedCount: number;
  showAdj: boolean;
  showQuickPlay: boolean;
  showScoreInput: boolean;
  showCustomInput: ChipCategory | null;
  customChip: string;
  isOffline: boolean;
  onToggleChip: (id: string) => void;
  onShowAdj: () => void;
  onHideAdj: () => void;
  onShowQuickPlay: () => void;
  onHideQuickPlay: () => void;
  onToggleScoreInput: () => void;
  onSetCustomInput: (c: ChipCategory | null) => void;
  onSetCustomChip: (v: string) => void;
}) {
  const chipGroups = [
    { key: "offense" as const, label: "Offense", icon: Swords, color: ACCENT },
    { key: "defense" as const, label: "Defense", icon: Shield, color: COLOR_GREEN },
    { key: "situational" as const, label: "Situational", icon: AlertTriangle, color: COLOR_AMBER },
  ];
  const adjustments = isOffline ? FALLBACK_ADJ : AI_ADJ;

  return (
    <div>
      {!showQuickPlay ? (
        <div
          onClick={onShowQuickPlay}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: 8,
            border: `1px solid ${ACCENT}40`,
            background: ACCENT_SOFT,
            marginBottom: 14,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
          }}
        >
          <Play size={12} /> Quick play — timeout? Tap for a play call
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${ACCENT}40`,
            background: ACCENT_SOFT,
            marginBottom: 14,
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: ACCENT,
                textTransform: "uppercase",
              }}
            >
              Quick play call
            </span>
            <X size={12} color={TEXT_DIM} style={{ cursor: "pointer" }} onClick={onHideQuickPlay} />
          </div>
          {GAME.plan.plays.slice(0, 3).map((p, i) => (
            <div
              key={p}
              onClick={onHideQuickPlay}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderBottom: `1px solid ${BORDER_SUBTLE}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: `1px solid ${ACCENT}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: ACCENT,
                }}
              >
                {i + 1}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{p}</span>
              <ChevronRight size={12} color={TEXT_DIM} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 14 }}>
        <div
          onClick={onToggleScoreInput}
          style={{
            padding: "6px 14px",
            border: `1px solid ${BORDER_MEDIUM}`,
            fontSize: 10,
            fontWeight: 600,
            color: TEXT_DIM,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Activity size={10} /> Update score
        </div>
      </div>

      {showScoreInput && (
        <div
          style={{
            border: `1px solid ${BORDER_STRONG}`,
            padding: 14,
            marginBottom: 14,
            display: "flex",
            gap: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ScoreInput label="You" defaultValue={GAME.score.us} />
          <div style={{ fontSize: 16, color: TEXT_GHOST, fontWeight: 600 }}>—</div>
          <ScoreInput label="Them" defaultValue={GAME.score.them} />
          <button
            onClick={onToggleScoreInput}
            style={{
              padding: "8px 16px",
              background: ACCENT,
              border: "none",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: TEXT_GHOST,
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: 3,
          }}
        >
          Tap what you&apos;re seeing · {selectedCount} selected
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM }}>
          {selectedCount === 0
            ? "Select observations or generate from stats alone"
            : selectedCount < 3
              ? "Add more for better adjustments"
              : "Ready to generate"}
        </div>
      </div>

      {chipGroups.map(({ key, label, icon: Icon, color }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon size={10} /> {label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CHIP_DATA[key].map((c) => {
              const on = selected.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => onToggleChip(c.id)}
                  style={{
                    padding: "10px 16px",
                    border: `1px solid ${on ? color : BORDER_MEDIUM}`,
                    background: on ? `${color}12` : "transparent",
                    color: on ? color : TEXT_MUTED,
                    fontSize: 13,
                    fontWeight: on ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    userSelect: "none",
                    transition: "all 0.1s",
                  }}
                >
                  {on && <Check size={12} />}
                  {c.label}
                </div>
              );
            })}
            {showCustomInput === key ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  value={customChip}
                  onChange={(e) => onSetCustomChip(e.target.value)}
                  placeholder="Other..."
                  maxLength={50}
                  autoFocus
                  style={{
                    padding: "10px 12px",
                    border: `1px solid ${color}`,
                    background: "transparent",
                    color: TEXT_PRIMARY,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    width: 160,
                  }}
                />
                <button
                  onClick={() => {
                    if (customChip.trim()) {
                      onToggleChip(`custom_${key}`);
                      onSetCustomInput(null);
                    }
                  }}
                  style={{
                    padding: "10px 12px",
                    background: color,
                    border: "none",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <div
                onClick={() => onSetCustomInput(key)}
                style={{
                  padding: "10px 16px",
                  border: `1px dashed ${BORDER_MEDIUM}`,
                  color: TEXT_DIM,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Other
              </div>
            )}
          </div>
        </div>
      ))}

      {!showAdj && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <button
            onClick={onShowAdj}
            style={{
              padding: "14px 32px",
              background: ACCENT,
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 900,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 200 50"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <path
                d="M-10 25 Q50 8 100 25 Q150 42 210 25"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.2"
              />
            </svg>
            <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={14} />{" "}
              {selectedCount === 0 ? "Generate from stats" : "Generate adjustments"}
            </span>
          </button>
          {selectedCount === 0 && (
            <div style={{ fontSize: 10, color: TEXT_GHOST, marginTop: 6 }}>
              AI will analyze the box score — no observations needed
            </div>
          )}
        </div>
      )}

      {showAdj && (
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: isOffline ? COLOR_AMBER : COLOR_PURPLE,
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isOffline ? (
                <>
                  <WifiOff size={10} /> Quick adjustments (offline)
                </>
              ) : (
                <>
                  <Zap size={10} /> AI halftime adjustments
                </>
              )}
            </div>
            <div onClick={onHideAdj} style={{ fontSize: 10, color: TEXT_DIM, cursor: "pointer" }}>
              Update ↻
            </div>
          </div>

          {adjustments.map((adj, i) => {
            const Icon =
              adj.type === "offense"
                ? Swords
                : adj.type === "defense"
                  ? Shield
                  : AlertTriangle;
            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${adj.color}30`,
                  marginBottom: 8,
                  padding: "14px 16px",
                  borderLeft: `3px solid ${adj.color}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Icon size={14} color={adj.color} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: adj.color,
                      textTransform: "uppercase",
                    }}
                  >
                    {adj.type}
                  </span>
                  {adj.priority === "high" && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        background: `${COLOR_RED}15`,
                        border: `1px solid ${COLOR_RED}30`,
                        color: COLOR_RED,
                        fontWeight: 600,
                      }}
                    >
                      Priority
                    </span>
                  )}
                  {isOffline && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        background: `${COLOR_AMBER}15`,
                        border: `1px solid ${COLOR_AMBER}30`,
                        color: COLOR_AMBER,
                        fontWeight: 600,
                      }}
                    >
                      Cached
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 15, color: TEXT_PRIMARY, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                  {adj.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreInput({ label, defaultValue }: { label: string; defaultValue: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 9,
          color: TEXT_DIM,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        type="number"
        defaultValue={defaultValue}
        style={{
          width: 60,
          padding: 8,
          fontSize: 24,
          fontWeight: 900,
          textAlign: "center",
          background: BG_PAGE,
          border: `1px solid ${BORDER_MEDIUM}`,
          color: TEXT_PRIMARY,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ── Live panel ───────────────────────────────────────────────────────────

function LivePanel({
  showTrackerInvite,
  onToggleTrackerInvite,
}: {
  showTrackerInvite: boolean;
  onToggleTrackerInvite: () => void;
}) {
  const totalFgm = BOX.reduce((s, p) => s + p.fgm, 0);
  const totalFga = BOX.reduce((s, p) => s + p.fga, 0);
  const totalTpm = BOX.reduce((s, p) => s + p.tpm, 0);
  const totalTpa = BOX.reduce((s, p) => s + p.tpa, 0);
  const totalAst = BOX.reduce((s, p) => s + p.ast, 0);
  const totalTo = BOX.reduce((s, p) => s + p.to, 0);

  const teamStats = [
    { label: "FG%", value: totalFga ? Math.round((totalFgm / totalFga) * 100) : 0, good: 45 },
    { label: "3PT%", value: totalTpa ? Math.round((totalTpm / totalTpa) * 100) : 0, good: 33 },
    { label: "Assists", value: totalAst, good: 8 },
    { label: "Turnovers", value: totalTo, good: null as number | null, bad: true },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <div
          onClick={onToggleTrackerInvite}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: `1px solid ${COLOR_PURPLE}40`,
            background: `${COLOR_PURPLE}08`,
            color: COLOR_PURPLE,
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <UserPlus size={10} /> Invite stat tracker
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: `1px solid ${BORDER_MEDIUM}`,
            color: TEXT_DIM,
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeftRight size={10} /> Substitution
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: `1px solid ${BORDER_MEDIUM}`,
            color: TEXT_DIM,
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Undo2 size={10} /> Undo last
        </div>
      </div>

      {showTrackerInvite && (
        <div
          style={{
            border: `1px solid ${COLOR_PURPLE}40`,
            background: `${COLOR_PURPLE}08`,
            padding: "14px 16px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: TEXT_PRIMARY }}>
              Invite a stat tracker
            </div>
            <X size={12} color={TEXT_DIM} style={{ cursor: "pointer" }} onClick={onToggleTrackerInvite} />
          </div>
          <p style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5, margin: "0 0 10px" }}>
            An assistant coach, parent, or team manager can track stats on their
            phone. You see the exploits — they tap the numbers.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                background: BG_PAGE,
                border: `1px solid ${BORDER_MEDIUM}`,
                fontSize: 18,
                fontWeight: 900,
                color: COLOR_PURPLE,
                textAlign: "center",
                letterSpacing: "4px",
                fontFamily: "monospace",
              }}
            >
              MOTION-7284
            </div>
            <button
              style={{
                padding: "10px 14px",
                background: COLOR_PURPLE,
                border: "none",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
          </div>
          <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 6 }}>
            They open motion.app/join and enter this code
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: TEXT_GHOST,
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: 8,
          }}
        >
          AI exploits · updating live
        </div>
        {LIVE_EXPLOITS.map((e, i) => {
          const c =
            e.urgency === "critical"
              ? COLOR_RED
              : e.urgency === "warning"
                ? COLOR_AMBER
                : COLOR_PURPLE;
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${c}30`,
                borderLeft: `3px solid ${c}`,
                marginBottom: 6,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{e.text}</div>
              <div style={{ fontSize: 10, color: TEXT_DIM, flexShrink: 0, marginLeft: 12 }}>
                {e.time}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: TEXT_GHOST,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 6,
        }}
      >
        Box score
      </div>
      <div style={{ border: `1px solid ${BORDER_MEDIUM}`, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 500 }}>
          <thead>
            <tr style={{ background: BG_SURFACE }}>
              {["#", "Name", "Min", "Pts", "Reb", "Ast", "TO", "FG", "3PT", "Fls"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: 6,
                    textAlign: h === "#" || h === "Name" ? "left" : "center",
                    fontWeight: 600,
                    color: TEXT_DIM,
                    fontSize: 9,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${BORDER_SUBTLE}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BOX.map((p) => (
              <tr key={p.num} style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
                <td style={{ padding: 6, fontWeight: 800, color: TEXT_PRIMARY }}>{p.num}</td>
                <td style={{ padding: 6, fontWeight: 600, color: TEXT_MUTED }}>{p.name}</td>
                <td style={{ padding: 6, textAlign: "center", color: TEXT_DIM }}>{p.min}</td>
                <td style={{ padding: 6, textAlign: "center", fontWeight: 800, color: TEXT_PRIMARY }}>
                  {p.pts}
                </td>
                <td style={{ padding: 6, textAlign: "center", color: TEXT_MUTED }}>{p.reb}</td>
                <td style={{ padding: 6, textAlign: "center", color: TEXT_MUTED }}>{p.ast}</td>
                <td style={{ padding: 6, textAlign: "center", color: p.to >= 2 ? COLOR_RED : TEXT_MUTED }}>
                  {p.to}
                </td>
                <td style={{ padding: 6, textAlign: "center", color: TEXT_MUTED }}>
                  {p.fgm}-{p.fga}
                </td>
                <td
                  style={{
                    padding: 6,
                    textAlign: "center",
                    color: p.tpa > 0 && p.tpm === 0 ? COLOR_RED : TEXT_MUTED,
                  }}
                >
                  {p.tpm}-{p.tpa}
                </td>
                <td
                  style={{
                    padding: 6,
                    textAlign: "center",
                    color: p.fls >= 3 ? COLOR_AMBER : TEXT_DIM,
                  }}
                >
                  {p.fls}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 }}>
        {teamStats.map((s) => {
          const isGood = s.bad ? false : s.good != null && s.value >= s.good;
          const color = s.bad ? COLOR_RED : isGood ? COLOR_GREEN : COLOR_AMBER;
          return (
            <div
              key={s.label}
              style={{ border: `1px solid ${BORDER_MEDIUM}`, padding: 10, textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: TEXT_GHOST,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>
                {s.value}
                {s.good != null && !s.bad ? "%" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
