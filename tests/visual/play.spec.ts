import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page, type Locator } from "@playwright/test";
import type { MotionState, MotionWindow } from "./types";

// Mirrors the viewBox in src/components/court/CourtSVG.tsx
const VIEW = { minX: -28, maxX: 28, minY: -3, maxY: 47 } as const;
const COURT_SELECTOR = 'svg[viewBox="-28 -3 56 50"]';
const MIN_DUPLICATE_DIST = 1.0; // SVG units — below this is a duplicate, not a legitimate close setup

const PLAYS_DIR = join(__dirname, "..", "..", "src", "data", "plays");

function discoverPlaySlugs(): string[] {
  return readdirSync(PLAYS_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

async function waitForViewerReady(page: Page, timeoutMs = 30_000): Promise<number> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as MotionWindow;
      return w.__motionState != null && w.__motionState.isAnim === false;
    },
    null,
    { timeout: timeoutMs },
  );
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const w = window as unknown as MotionWindow;
    return w.__motionState!.phaseCount;
  });
}

async function seekToPhaseEnd(page: Page, phaseIdx: number): Promise<MotionState> {
  await page.evaluate((n) => {
    const w = window as unknown as MotionWindow;
    w.__motionControls!.seekToPhaseEnd(n);
  }, phaseIdx);
  await page.waitForFunction(
    (n) => {
      const w = window as unknown as MotionWindow;
      const s = w.__motionState;
      return s != null && s.isAnim === false && s.phaseIdx === n && s.actIdx === -1;
    },
    phaseIdx,
    { timeout: 5_000 },
  );
  return page.evaluate(() => {
    const w = window as unknown as MotionWindow;
    return w.__motionState!;
  });
}

async function setLabelMode(page: Page, mode: 0 | 1 | 2): Promise<void> {
  await page.evaluate((m) => {
    const w = window as unknown as MotionWindow;
    w.__motionControls!.setLabelMode(m);
  }, mode);
  await page.waitForFunction(
    (m) => {
      const w = window as unknown as MotionWindow;
      return w.__motionState?.labelMode === m;
    },
    mode,
    { timeout: 2_000 },
  );
}

const LABEL_MODES: Array<{ mode: 0 | 1 | 2; name: string }> = [
  { mode: 0, name: "num" },
  { mode: 1, name: "pos" },
  { mode: 2, name: "name" },
];

function assertPositionsValid(pos: Record<string, [number, number]>): void {
  const entries = Object.entries(pos);
  expect(entries.length, "should have at least 5 players").toBeGreaterThanOrEqual(5);

  for (const [id, [x, y]] of entries) {
    expect(x, `player ${id} x (${x}) out of viewBox`).toBeGreaterThanOrEqual(VIEW.minX);
    expect(x, `player ${id} x (${x}) out of viewBox`).toBeLessThanOrEqual(VIEW.maxX);
    expect(y, `player ${id} y (${y}) out of viewBox`).toBeGreaterThanOrEqual(VIEW.minY);
    expect(y, `player ${id} y (${y}) out of viewBox`).toBeLessThanOrEqual(VIEW.maxY);
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, [ax, ay]] = entries[i];
      const [idB, [bx, by]] = entries[j];
      const dist = Math.hypot(ax - bx, ay - by);
      expect(
        dist,
        `players ${idA} and ${idB} too close: ${dist.toFixed(2)} SVG units`,
      ).toBeGreaterThan(MIN_DUPLICATE_DIST);
    }
  }
}

async function assertNoLabelOverlap(court: Locator): Promise<void> {
  const boxes = await court.locator("g > svg > text").evaluateAll((els) =>
    els.map((el) => {
      const r = (el as SVGGraphicsElement).getBoundingClientRect();
      return { label: el.textContent ?? "", x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const disjoint =
        a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(
        disjoint,
        `labels "${a.label}" and "${b.label}" bbox overlap`,
      ).toBe(true);
    }
  }
}

const slugs = discoverPlaySlugs();

for (const slug of slugs) {
  test.describe(`visual audit: ${slug}`, () => {
    // Serial so the mount test warms up the dev-server compile before the heavier
    // phase-boundary test runs, and so a 404 in beforeEach short-circuits cleanly.
    test.describe.configure({ mode: "serial" });

    test.beforeEach(async ({ page }) => {
      const response = await page.goto(`/plays/${slug}`);
      if (response && response.status() === 404) {
        test.skip(true, `No wiki page registered for /plays/${slug} — route returns 404`);
      }
    });

    test("viewer mounts with phases registered", async ({ page }) => {
      const phaseCount = await waitForViewerReady(page);
      expect(phaseCount, `${slug} should have at least one phase`).toBeGreaterThan(0);
    });

    test("phase boundaries pass state + bbox + pixel checks", async ({ page }) => {
      const phaseCount = await waitForViewerReady(page);
      const court = page.locator(COURT_SELECTOR);

      for (let i = 0; i < phaseCount; i++) {
        const state = await seekToPhaseEnd(page, i);
        await page.waitForTimeout(100);
        assertPositionsValid(state.pos);

        // # mode is the baseline: state + bbox + pixel regression.
        await setLabelMode(page, 0);
        await page.waitForTimeout(100);
        await assertNoLabelOverlap(court);
        await expect(court).toHaveScreenshot(`${slug}-phase-${i}.png`, {
          maxDiffPixels: 100,
          animations: "disabled",
        });

        // POS and NAME modes: bbox-only. NAME is where long roster labels
        // expose collisions invisible in # mode.
        for (const { mode, name } of LABEL_MODES.slice(1)) {
          await setLabelMode(page, mode);
          await page.waitForTimeout(100);
          try {
            await assertNoLabelOverlap(court);
          } catch (err) {
            throw new Error(
              `phase ${i} ${name}-mode label collision: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    });
  });
}
