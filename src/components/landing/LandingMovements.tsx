"use client";

import { useState, type CSSProperties } from "react";
import type { ReaderRole } from "./LandingScreenStack";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

const numStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--citation)",
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "clamp(28px, 3.6vw, 44px)",
  fontWeight: 500,
  letterSpacing: "-0.015em",
  lineHeight: 1.12,
  color: "var(--fg)",
  marginBottom: 20,
};

const bodyStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 17,
  lineHeight: 1.58,
  color: "var(--paper-dim)",
  maxWidth: 520,
};

const sectionStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "120px 0 80px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

function Shell({
  num,
  title,
  body,
  children,
  id,
}: {
  num: string;
  title: React.ReactNode;
  body: React.ReactNode;
  children?: React.ReactNode;
  id: string;
}) {
  return (
    <section id={id} data-movement={id} style={sectionStyle}>
      <div style={numStyle}>{num}</div>
      <h2 style={titleStyle}>{title}</h2>
      <p style={bodyStyle}>{body}</p>
      {children}
    </section>
  );
}

/* ─────────── 1 · Claim (visceral) ─────────── */
export function MovementOne() {
  return (
    <Shell
      id="m1"
      num="Movement 01 · The claim"
      title={
        <>
          The plan is ready <em style={{ fontStyle: "normal", color: "var(--paper-dim)" }}>before</em> you ask for it.
        </>
      }
      body={
        <>
          Motion is a coaching intelligence that has read the sport&apos;s
          literature and watches your season unfold, so that every time you
          open it, the next right move is already on the screen.
        </>
      }
    />
  );
}

/* ─────────── 2 · Refusal of the menu ─────────── */
export function MovementTwo() {
  return (
    <Shell
      id="m2"
      num="Movement 02 · The refusal of the menu"
      title={
        <>
          Nine hundred thirty-four plays in the book. Four of them belong to Thursday.
        </>
      }
      body={
        <>
          Most tools hand the coach a library and wish her luck. Motion does
          the opposite. It reads the roster, the schedule, the last game, and
          the opponent, and returns the four plays that will matter tonight —
          each with a one-line reason it was chosen.
        </>
      }
    >
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 20,
          alignItems: "center",
          maxWidth: 520,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 64,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
            color: "var(--fg)",
            lineHeight: 0.9,
          }}
        >
          934<span style={{ color: "var(--paper-mute)" }}> → </span>4
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--citation)",
            lineHeight: 1.5,
          }}
        >
          plays in the book<br />plays chosen tonight
        </span>
      </div>
    </Shell>
  );
}

/* ─────────── 3 · Three readers ─────────── */
export function MovementThree({
  role,
  onRoleHover,
}: {
  role: ReaderRole;
  onRoleHover: (r: ReaderRole) => void;
}) {
  const rows: Array<{ key: ReaderRole; label: string; line: string }> = [
    {
      key: "coach",
      label: "Coach",
      line: "You open Motion on game night and the plan is waiting — opponent, four plays, matchups, the one adjustment likely to matter at halftime. You didn't build it. You refine it.",
    },
    {
      key: "player",
      label: "Player",
      line: "Motion shows you only what belongs to you tonight: your plays, your drills, your body's weak link, and the archetype you are becoming. Nothing the team doesn't need you to know.",
    },
    {
      key: "student",
      label: "Student of the game",
      line: "You already think in the sport's language. Motion is the instrument that sharpens that thinking — a cited wiki, a Socratic drill, a live-game companion that explains what you just watched.",
    },
  ];

  return (
    <Shell
      id="m3"
      num="Movement 03 · The three readers"
      title={<>The same system. Three assemblies. You will recognize yours.</>}
      body={
        <>
          Motion is not three products. It is one system of atoms that
          assembles differently depending on who is opening the app tonight.
          Hover a row — the working screen on the right re-emphasizes.
        </>
      }
    >
      <div
        style={{
          marginTop: 32,
          border: "1px solid var(--rule)",
        }}
      >
        {rows.map((r) => {
          const active = r.key === role;
          return (
            <button
              key={r.key}
              onMouseEnter={() => onRoleHover(r.key)}
              onFocus={() => onRoleHover(r.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "24px 28px",
                borderBottom: "1px solid var(--rule)",
                background: active ? "var(--signal)" : "transparent",
                transition: "background 200ms ease-in-out",
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: active ? "var(--fg)" : "var(--citation)",
                  marginBottom: 10,
                  transition: "color 200ms ease",
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: active ? "var(--fg)" : "var(--paper-dim)",
                  transition: "color 200ms ease",
                  maxWidth: 560,
                }}
              >
                {r.line}
              </div>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ─────────── 4 · Source ─────────── */
export function MovementFour() {
  return (
    <Shell
      id="m4"
      num="Movement 04 · The source"
      title={<>Every answer traces back to a page you can read.</>}
      body={
        <>
          Motion&apos;s knowledge is a compiled wiki of 2,440 pages of coaching
          literature — seven books, cross-linked, cited. No search bar over the
          open internet. No black-box answer. Every recommendation carries the
          page number. The page number works.
        </>
      }
    >
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "6px 18px",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--paper-dim)",
          fontVariantNumeric: "tabular-nums",
          maxWidth: 520,
        }}
      >
        <span>Professional set-play compendium</span>
        <span style={{ color: "var(--citation)" }}>934 pp.</span>
        <span>Coaches Playbook</span>
        <span style={{ color: "var(--citation)" }}>371 pp.</span>
        <span>Let&apos;s Talk Defense</span>
        <span style={{ color: "var(--citation)" }}>274 pp.</span>
        <span>Skills &amp; Drills</span>
        <span style={{ color: "var(--citation)" }}>239 pp.</span>
        <span>Basketball Anatomy</span>
        <span style={{ color: "var(--citation)" }}>200 pp.</span>
        <span>Offensive Skills</span>
        <span style={{ color: "var(--citation)" }}>200 pp.</span>
        <span>Basketball For Coaches</span>
        <span style={{ color: "var(--citation)" }}>200 pp.</span>
      </div>
    </Shell>
  );
}

/* ─────────── 5 · Body in the system ─────────── */
export function MovementFive() {
  return (
    <Shell
      id="m5"
      num="Movement 05 · The body in the system"
      title={<>The shot, the quad, the sleep, the lapse in the third quarter. One system reads them all.</>}
      body={
        <>
          Anatomy is not a tab in Motion; it is a layer through every feature.
          A shot that falls short traces to quad endurance. A late-game
          defensive lapse traces to conditioning. A turnover pattern traces to
          sleep. The recommendation is a drill; the drill is cited; the
          citation is on the shelf behind you.
        </>
      }
    />
  );
}

/* ─────────── 6 · Identity ─────────── */
export function MovementSix() {
  const [hover, setHover] = useState(false);
  return (
    <section
      id="m6"
      data-movement="m6"
      style={{
        minHeight: "100vh",
        padding: "120px 0 120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={numStyle}>Movement 06 · The invitation</div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: "clamp(72px, 9vw, 128px)",
          letterSpacing: "-0.034em",
          lineHeight: 0.9,
          color: "var(--fg)",
          marginBottom: 24,
        }}
      >
        Motion
      </div>

      <p
        style={{
          ...bodyStyle,
          fontSize: 19,
          color: "var(--fg)",
          maxWidth: 560,
          marginBottom: 12,
        }}
      >
        Motion has read the books. You don&apos;t have to.
      </p>

      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--citation)",
          marginBottom: 48,
        }}
      >
        Basketball, now. Football, fall 2026.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        <button
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.02em",
            padding: "16px 28px",
            background: "var(--fg)",
            color: "var(--bg)",
            border: "1px solid var(--fg)",
            transition: "opacity 160ms ease",
          }}
        >
          Start for free
        </button>
        <a
          href="#request"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--fg)",
            borderBottom: hover ? "1px solid var(--citation)" : "1px solid transparent",
            paddingBottom: 2,
            transition: "border-bottom-color 120ms ease",
          }}
        >
          Request access
        </a>
      </div>
    </section>
  );
}
