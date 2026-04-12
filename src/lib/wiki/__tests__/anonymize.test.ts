// Tests for the anonymizer. Pure offline regex behavior.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anonymize, findResidualPII } from "../anonymize";
import type { AnonymizeContext } from "../types";

function ctx(overrides: Partial<AnonymizeContext> = {}): AnonymizeContext {
  return {
    teamNames: [],
    opponentNames: [],
    playerNames: [],
    coachNames: [],
    locations: [],
    dateWindowDays: 30,
    referenceDate: "2026-04-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("anonymize — sensitive name scrubbing", () => {
  it("removes user-entered team, coach, and player names while preserving coaching insight", () => {
    const input =
      "At Lincoln HS last week, Coach Smith told Tommy Jones to run the weak-side flare screen — it works against zone.";
    const { text, removed } = anonymize(
      input,
      ctx({
        teamNames: ["Lincoln HS"],
        coachNames: ["Coach Smith"],
        playerNames: ["Tommy Jones"],
      }),
    );
    assert.ok(
      !text.includes("Lincoln HS"),
      "team name should be scrubbed",
    );
    assert.ok(
      !text.includes("Coach Smith"),
      "coach name should be scrubbed",
    );
    assert.ok(!text.includes("Tommy"), "player first name should be scrubbed");
    assert.ok(!text.includes("Jones"), "player last name should be scrubbed");
    assert.match(
      text,
      /weak-side flare screen/i,
      "general coaching insight should remain",
    );
    assert.match(text, /works against zone/i);
    assert.ok(removed.some((r) => r.startsWith("team:")));
    assert.ok(removed.some((r) => r.startsWith("coach:")));
    assert.ok(removed.some((r) => r.startsWith("player:")));
  });

  it("scrubs opponent names", () => {
    const input = "We play Washington Prep on Friday.";
    const { text, removed } = anonymize(
      input,
      ctx({ opponentNames: ["Washington Prep"] }),
    );
    assert.ok(!text.includes("Washington Prep"));
    assert.ok(removed.includes("opponent:Washington Prep"));
  });

  it("scrubs locations", () => {
    const input = "Tournament is in Springfield this weekend.";
    const { text, removed } = anonymize(
      input,
      ctx({ locations: ["Springfield"] }),
    );
    assert.ok(!text.includes("Springfield"));
    assert.ok(removed.includes("location:Springfield"));
  });

  it("handles first-name-only and last-name-only references", () => {
    const input = "Tommy needs to stay in his stance. Jones is rotating late.";
    const { text } = anonymize(input, ctx({ playerNames: ["Tommy Jones"] }));
    assert.ok(!text.includes("Tommy"));
    assert.ok(!text.includes("Jones"));
    assert.match(text, /stance/);
  });

  it("is case-insensitive on supplied names", () => {
    const input = "LINCOLN hs is running a 1-3-1.";
    const { text } = anonymize(input, ctx({ teamNames: ["Lincoln HS"] }));
    assert.ok(!/lincoln hs/i.test(text));
  });

  it("preserves general basketball vocabulary even when player names share common words", () => {
    const input = "The flare screen opens a catch-and-shoot window for Jones.";
    const { text } = anonymize(input, ctx({ playerNames: ["Jones"] }));
    assert.match(text, /flare screen/);
    assert.match(text, /catch-and-shoot/);
    assert.ok(!text.includes("Jones"));
  });

  it("scrubs email addresses and phone numbers unconditionally", () => {
    const input = "Call me at (555) 123-4567 or coach@example.com to review.";
    const { text, removed } = anonymize(input, ctx());
    assert.ok(!/\(555\) 123-4567/.test(text));
    assert.ok(!/coach@example\.com/.test(text));
    assert.ok(removed.includes("email"));
    assert.ok(removed.includes("phone"));
  });

  it("scrubs recent dates within the configured window", () => {
    const input =
      "The game was on 2026-04-10 and the tape shows we lost containment.";
    const { text, removed } = anonymize(
      input,
      ctx({ referenceDate: "2026-04-12T00:00:00.000Z", dateWindowDays: 30 }),
    );
    assert.ok(!text.includes("2026-04-10"));
    assert.ok(removed.some((r) => r.startsWith("date:")));
    assert.match(text, /tape shows we lost containment/);
  });

  it("preserves dates far outside the window", () => {
    const input = "This concept was first documented in 1978-02-14 by the author.";
    const { text } = anonymize(
      input,
      ctx({ referenceDate: "2026-04-12T00:00:00.000Z", dateWindowDays: 30 }),
    );
    assert.match(text, /1978-02-14/);
  });

  it("does not mutate the input string", () => {
    const input = "Coach Smith said go.";
    const original = input;
    anonymize(input, ctx({ coachNames: ["Coach Smith"] }));
    assert.equal(input, original);
  });

  it("dedupes the removed audit log", () => {
    const input = "Coach Smith, Coach Smith, Coach Smith.";
    const { removed } = anonymize(input, ctx({ coachNames: ["Coach Smith"] }));
    const coachEntries = removed.filter((r) => r === "coach:Coach Smith");
    assert.equal(coachEntries.length, 1);
  });
});

describe("findResidualPII", () => {
  it("detects leftover phone numbers", () => {
    assert.deepEqual(findResidualPII("Call 555-123-4567"), ["residual-phone"]);
  });
  it("detects leftover emails", () => {
    assert.deepEqual(findResidualPII("ping a@b.co"), ["residual-email"]);
  });
  it("returns empty for clean text", () => {
    assert.deepEqual(findResidualPII("weak-side flare screen vs zone"), []);
  });
});
