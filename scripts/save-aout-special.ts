/**
 * Save a solved grid produced by scripts/gen-aout-special.ts to the DB and mint
 * a shareable code. Reads .context/aout-special-<GRID>.json, inserts the
 * crossword + placed words (custom clues verbatim, corpus fillers typographically
 * normalized), and prints the /grille/<code> URL.
 *
 *   set -a; source .env.local; set +a
 *   GRID=K pnpm tsx scripts/save-aout-special.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateCrosswordCode, retryOnUniqueViolation } from "@/lib/code";
import { normalizeClueText } from "@/lib/crossword/normalize";

const GRID = (process.env.GRID || "K").toUpperCase();
const TITLE = process.env.TITLE || "Spécial août";
const IN = resolve(process.cwd(), ".context", `aout-special-${GRID}.json`);

interface WordRow {
  answer: string;
  direction: "right" | "down";
  number: number;
  startRow: number;
  startCol: number;
  length: number;
  clueText: string;
  isCustom: boolean;
  difficulty: number | null;
  breaks: string | null;
}
interface Solved {
  width: number;
  height: number;
  pattern: string;
  solution: string;
  hiddenWord: string | null;
  words: WordRow[];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — run: set -a; source .env.local; set +a");
    process.exit(1);
  }
  const solved: Solved = JSON.parse(readFileSync(IN, "utf8"));
  console.log(`Loaded ${IN}: ${solved.width}×${solved.height}, ${solved.words.length} words`);

  const saved = await retryOnUniqueViolation(async () => {
    const code = generateCrosswordCode();
    const [row] = await db
      .insert(crosswords)
      .values({
        code,
        ownerId: null,
        language: "fr",
        title: TITLE,
        width: solved.width,
        height: solved.height,
        gridPattern: solved.pattern,
        gridSolution: solved.solution,
        hiddenWord: solved.hiddenWord,
        status: "ready",
      })
      .returning({ id: crosswords.id, code: crosswords.code });
    return row;
  });

  const rows = solved.words.map((w) => ({
    crosswordId: saved.id,
    answer: w.answer,
    direction: w.direction,
    number: w.number,
    startRow: w.startRow,
    startCol: w.startCol,
    length: w.length,
    // Custom clues stay verbatim; corpus fillers get sentence-case cleanup.
    clueText: w.isCustom ? w.clueText : normalizeClueText(w.clueText),
    isCustom: w.isCustom,
    difficulty: w.difficulty,
    breaks: w.breaks,
  }));
  await db.insert(placedWords).values(rows);

  console.log(`\n${"=".repeat(56)}`);
  console.log(`SAVED. code = ${saved.code}`);
  console.log(`View at /grille/${saved.code}`);
  console.log(`${"=".repeat(56)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
