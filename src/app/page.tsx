"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Wordmark from "@/components/brand/Wordmark";
import LandingScreenStack, {
  type DemoStage,
  type ReaderRole,
} from "@/components/landing/LandingScreenStack";
import {
  MovementOne,
  MovementTwo,
  MovementPlaybook,
  MovementThree,
  MovementFour,
  MovementFive,
  MovementSix,
} from "@/components/landing/LandingMovements";
import Screen1GameDay from "@/components/landing/screens/Screen1GameDay";
import Screen2Refusal from "@/components/landing/screens/Screen2Refusal";
import ScreenPlaybook from "@/components/landing/screens/ScreenPlaybook";
import Screen3Readers from "@/components/landing/screens/Screen3Readers";
import Screen4Source from "@/components/landing/screens/Screen4Source";
import Screen5Body from "@/components/landing/screens/Screen5Body";
import Screen6Exit from "@/components/landing/screens/Screen6Exit";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Theme = "dark" | "light";

export default function Home() {
  const [stage, setStage] = useState<DemoStage>(1);
  const [role, setRole] = useState<ReaderRole>("coach");
  const [roleLocked, setRoleLocked] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? localStorage.getItem("motion-theme")
      : null) as Theme | null;
    const mql =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: light)")
        : null;
    const initial: Theme = stored || (mql?.matches ? "light" : "dark");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    const storedRole = localStorage.getItem("motion-role") as ReaderRole | null;
    if (storedRole) {
      setRole(storedRole);
      setRoleLocked(true);
    }
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-movement]");
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-movement");
          if (id) {
            const n = parseInt(id.replace("m", ""), 10);
            if (n >= 1 && n <= 7) setStage(n as DemoStage);
          }
        }
      },
      { threshold: [0.4, 0.6, 0.8], rootMargin: "-10% 0px -30% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("motion-theme", next);
  };

  const cycleRole = () => {
    const order: ReaderRole[] = ["coach", "player", "student"];
    const idx = order.indexOf(role);
    const next = order[(idx + 1) % order.length];
    setRole(next);
    setRoleLocked(true);
    localStorage.setItem("motion-role", next);
  };

  const handleRoleHover = (r: ReaderRole) => {
    if (!roleLocked) setRole(r);
  };

  return (
    <div
      ref={rootRef}
      style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100vh" }}
    >
      <TopNav />

      <main
        className="landing-grid"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 48px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
          gap: 72,
          alignItems: "flex-start",
        }}
      >
        <div>
          <MovementOne />
          <MobileScreenSlot>
            <Screen1GameDay />
          </MobileScreenSlot>
          <MovementTwo />
          <MobileScreenSlot>
            <Screen2Refusal />
          </MobileScreenSlot>
          <MovementPlaybook />
          <MobileScreenSlot>
            <ScreenPlaybook active />
          </MobileScreenSlot>
          <MovementThree role={role} onRoleHover={handleRoleHover} />
          <MobileScreenSlot>
            <Screen3Readers role={role} />
          </MobileScreenSlot>
          <MovementFour />
          <MobileScreenSlot>
            <Screen4Source />
          </MobileScreenSlot>
          <MovementFive />
          <MobileScreenSlot>
            <Screen5Body />
          </MobileScreenSlot>
          <MovementSix />
          <MobileScreenSlot>
            <Screen6Exit />
          </MobileScreenSlot>
        </div>

        <aside
          className="landing-aside"
          style={{
            position: "sticky",
            top: 88,
            height: "calc(100vh - 120px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <LandingScreenStack stage={stage} role={role} />
        </aside>
      </main>

      <footer
        style={{
          maxWidth: 1440,
          margin: "120px auto 0",
          padding: "48px",
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--citation)",
          }}
        >
          Motion · coaching intelligence · © 2026
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--citation)",
          }}
        >
          Terms · Privacy · Colophon
        </span>
      </footer>

      <CornerChip
        side="left"
        label={`reading as — ${role}`}
        onClick={cycleRole}
      />
      <CornerChip side="right" label={`theme — ${theme}`} onClick={toggleTheme} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Mobile screen slots: hidden on desktop (screens live in the
             * sticky aside), shown inline under each movement on mobile so
             * every diagram actually appears in view as the user scrolls.
             * Fixed height because the screens themselves use height:100%
             * (see screens/shared.tsx screenShell). */
            .mobile-screen-slot { display: none; }

            @media (max-width: 1023px) {
              .landing-grid {
                grid-template-columns: 1fr !important;
                gap: 32px !important;
                padding: 0 24px !important;
              }
              /* The sticky aside lives below all 7 movements in a collapsed
               * single-column layout, so the IntersectionObserver has already
               * advanced to stage 7 by the time it's visible — meaning only
               * Screen6Exit would ever render. Hide it on mobile; inline
               * slots below each movement take over. */
              .landing-aside { display: none !important; }
              .mobile-screen-slot {
                display: block;
                height: 560px;
                margin: 8px 0 48px;
              }
            }
            @media (max-width: 768px) {
              .nav-links { display: none !important; }
              .mobile-screen-slot { height: 520px; margin: 8px 0 40px; }
            }
          `,
        }}
      />
    </div>
  );
}

/* ────────────────────── Top nav ────────────────────── */
function TopNav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "18px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Wordmark size="nav" style={{ color: "var(--fg)" }} />
        <div className="nav-links" style={{ display: "flex", gap: 36 }}>
          <a href="#m2" style={navLink}>
            The plan
          </a>
          <a href="#m3" style={navLink}>
            Playbook
          </a>
          <a href="#m4" style={navLink}>
            Readers
          </a>
          <a href="#m5" style={navLink}>
            Source
          </a>
          <a href="#m7" style={navLink}>
            Access
          </a>
        </div>
      </div>
    </nav>
  );
}

const navLink: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--paper-dim)",
  letterSpacing: "-0.005em",
};

/* ────────── Mobile screen slot ──────────
 * Wraps a screen in a fixed-height box that is hidden on desktop (via the
 * global .mobile-screen-slot rule in page CSS) and visible on <1024px. The
 * fixed height is required because screens use height:100% for their shell
 * (see screens/shared.tsx). */
function MobileScreenSlot({ children }: { children: React.ReactNode }) {
  return <div className="mobile-screen-slot">{children}</div>;
}

/* ────────────────────── Corner chips ────────────────────── */
function CornerChip({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const pos: CSSProperties = side === "left" ? { left: 24 } : { right: 24 };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "fixed",
        bottom: 18,
        ...pos,
        zIndex: 100,
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "lowercase",
        color: hover ? "var(--fg)" : "var(--paper-dim)",
        padding: "8px 10px",
        background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        border: "1px solid var(--rule)",
        transition: "color 160ms ease, border-color 160ms ease",
      }}
    >
      {label}
    </button>
  );
}
