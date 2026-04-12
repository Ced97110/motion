// Regression guard: prevent NBA team + institution + top-player names from
// leaking back into src/ or the wiki. Run as CI / pre-commit gate.
//
// Invoke: `npm run check:nba-terms`
// Exit 0 if clean, 1 if any match found.
//
// Extend DENYLIST as new cases surface. Add specific whitelist-patterns to
// ALLOWED_IN_PATHS if a legitimate usage needs an exception.

import * as fs from "node:fs";
import * as path from "node:path";

interface Match {
  file: string;
  line: number;
  term: string;
  content: string;
}

const ROOTS = [
  path.join(process.cwd(), "src"),
  path.join(process.cwd(), "knowledge-base", "wiki"),
];

const SCAN_EXTS = new Set([".ts", ".tsx", ".md"]);

/** Ignore list: files where false positives are expected (e.g. the lint itself). */
const ALLOWED_IN_PATHS: readonly string[] = [
  "scripts/check-nba-terms.ts",
  // log.md is historical append-only per project convention; flag but don't block
  "knowledge-base/wiki/log.md",
];

/** Denylist as case-insensitive word-boundary regex. */
const DENYLIST: Array<{ term: string; pattern: RegExp }> = [
  // NBA teams.
  // "Heat" and "Magic" are omitted — too many false positives in basketball
  // body/training content ("body heat", "magic of X"). They're caught below
  // as qualified "Miami Heat" / "Orlando Magic".
  ...["Lakers", "Celtics", "Warriors", "Bulls", "Nets", "Knicks",
      "Spurs", "Clippers", "76ers", "Sixers", "Rockets", "Mavericks",
      "Grizzlies", "Thunder", "Kings", "Suns", "Hornets", "Nuggets",
      "Pelicans", "Trail Blazers", "Timberwolves", "Jazz", "Pistons",
      "Pacers", "Cavaliers", "Bucks", "Hawks", "Raptors", "Wizards"]
    .map((t) => ({ term: t, pattern: new RegExp(`\\b${t}\\b`, "i") })),
  // Qualified team names that would be ambiguous as single words
  { term: "Miami Heat", pattern: /\bMiami Heat\b/i },
  { term: "Orlando Magic", pattern: /\bOrlando Magic\b/i },
  { term: "Detroit Pistons", pattern: /\bDetroit Pistons\b/i },
  { term: "Chicago Bulls", pattern: /\bChicago Bulls\b/i },
  // College programs
  ...["UCLA", "Duke", "Kansas", "Kentucky", "Villanova", "Princeton",
      "Syracuse", "North Carolina", "UConn"]
    .map((t) => ({ term: t, pattern: new RegExp(`\\b${t}\\b`, "i") })),
  // NBA player names (top stars — expand as needed)
  ...["LeBron", "Kareem", "Michael Jordan", "Kobe Bryant", "Shaquille",
      "Magic Johnson", "Larry Bird", "Stephen Curry", "Kevin Durant",
      "Giannis", "Luka", "Jokic", "Jayson Tatum", "Joel Embiid",
      "Kawhi", "Scottie Pippen", "Phil Johnson", "D'Angelo Russell",
      "Austin Reaves", "Rui Hachimura", "Anthony Davis"]
    .map((t) => ({ term: t, pattern: new RegExp(`\\b${t.replace(/'/g, "['’]")}\\b`, "i") })),
];

function* walk(root: string): Generator<string> {
  if (!fs.existsSync(root)) return;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "_review") continue;
        stack.push(full);
        continue;
      }
      if (!SCAN_EXTS.has(path.extname(entry.name))) continue;
      yield full;
    }
  }
}

function isAllowed(filePath: string): boolean {
  const rel = path.relative(process.cwd(), filePath);
  return ALLOWED_IN_PATHS.some((p) => rel.includes(p));
}

function scan(): Match[] {
  const matches: Match[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (isAllowed(file)) continue;
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      lines.forEach((content, i) => {
        for (const { term, pattern } of DENYLIST) {
          if (pattern.test(content)) {
            matches.push({ file, line: i + 1, term, content: content.trim() });
          }
        }
      });
    }
  }
  return matches;
}

function main() {
  const matches = scan();
  if (matches.length === 0) {
    console.log("✓ No NBA/institution/player names detected in src/ or wiki.");
    process.exit(0);
  }
  console.error(`✗ ${matches.length} forbidden term occurrence(s):\n`);
  const byFile = new Map<string, Match[]>();
  for (const m of matches) {
    if (!byFile.has(m.file)) byFile.set(m.file, []);
    byFile.get(m.file)!.push(m);
  }
  for (const [file, ms] of byFile) {
    const rel = path.relative(process.cwd(), file);
    console.error(`  ${rel}`);
    for (const m of ms.slice(0, 3)) {
      const snippet = m.content.length > 120 ? m.content.slice(0, 117) + "..." : m.content;
      console.error(`    L${m.line} [${m.term}]: ${snippet}`);
    }
    if (ms.length > 3) console.error(`    ... +${ms.length - 3} more`);
  }
  console.error(
    "\nRemediation: replace with archetype-based or descriptive terms. " +
      "See docs/specs/design-system.md + project CLAUDE.md rule.",
  );
  process.exit(1);
}

main();
