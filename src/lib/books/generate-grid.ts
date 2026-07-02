import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { getFrenchWordList, getFrenchClueDb, ensureLoaded } from "@/lib/crossword/load-french-clues";
import { generateCrosswordCode } from "@/lib/code";

interface CustomClue {
  answer: string;
  clue: string;
}

interface GenerateGridInput {
  width: number;
  height: number;
  title: string;
  customClues: CustomClue[];
  /** Clue texts already used elsewhere in the book, to avoid repeats. */
  usedClues: Set<string>;
}

interface GenerateGridResult {
  crosswordId: string;
  code: string;
}

/**
 * Generate a fléchés grid, persist the crossword + placed words, and return its
 * id/code. Shared by the batch grid-add route and the in-place regenerate route.
 * Returns null if generation fails after max attempts.
 */
export async function generateAndSaveGrid(
  input: GenerateGridInput,
): Promise<GenerateGridResult | null> {
  await ensureLoaded();
  const wordList = getFrenchWordList();
  const rawClueDb = getFrenchClueDb();

  let clueDb = rawClueDb;
  if (input.usedClues.size > 0) {
    clueDb = new Map();
    for (const [word, clues] of rawClueDb) {
      const filtered = clues.filter((c) => !input.usedClues.has(c));
      if (filtered.length > 0) clueDb.set(word, filtered);
    }
  }

  const result = generateFlecheVector(
    { width: input.width, height: input.height, customClues: input.customClues },
    wordList,
    clueDb,
  );
  if (!result.success) return null;

  const { grid, words } = result;
  let pattern = "";
  let solution = "";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      pattern += cell.kind === "blue" ? "#" : ".";
      solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
    }
  }

  const code = generateCrosswordCode();
  const [saved] = await db
    .insert(crosswords)
    .values({
      code,
      title: input.title,
      language: "fr",
      width: grid.width,
      height: grid.height,
      gridPattern: pattern,
      gridSolution: solution,
      status: "ready",
    })
    .returning({ id: crosswords.id });

  const customAnswers = new Set(
    input.customClues.map((c) => c.answer.toUpperCase().replace(/[^A-Z]/g, "")),
  );

  const wordRows = words.map((w, i) => ({
    crosswordId: saved.id,
    answer: w.word,
    direction: w.slot.direction === "horizontal" ? ("right" as const) : ("down" as const),
    number: i + 1,
    startRow: w.slot.cells[0].y,
    startCol: w.slot.cells[0].x,
    length: w.slot.length,
    clueText: w.clueText,
    isCustom: customAnswers.has(w.word),
  }));
  if (wordRows.length > 0) {
    await db.insert(placedWords).values(wordRows);
  }

  return { crosswordId: saved.id, code };
}
