import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateFlecheVector, type DifficultyMode } from "@/lib/crossword/fleche-vector-gen";
import { getFrenchWordList, getFrenchClueDb, getFrenchClueDifficulty, ensureLoaded } from "@/lib/crossword/load-french-clues";
import { generateCrosswordCode } from "@/lib/code";
import { normalizeAnswer } from "@/lib/crossword/normalize";

interface CustomClue {
  answer: string;
  clue: string;
}

/**
 * Only answers this long or longer are locked out across a book's grids. The
 * 2–3 letter words are irreplaceable structural glue — the dense fléchés fill
 * relies on a tiny pool of them (~70 clued: ET, OU, ÂNE, ÉTÉ, AIR, OSE…) to
 * satisfy the potence spine and comb crossings. Banning those after the first
 * grid starves the solver: simulations excluding *every* used word could not
 * fill past ~5 grids of 11×17 (grid 6 took 232s, grids 7+ timed out). 4-letter
 * words, by contrast, number in the thousands, so locking the used ones still
 * leaves ample supply — a 10-grid sim at this threshold locked 379 words with 0
 * repeats and all grids filling in ≤16s. So we lock everything ≥4 (the most we
 * can without starvation) and let only 2–3 letter filler repeat, which no reader
 * notices. Tune here if you want more/fewer words locked.
 */
export const MIN_LOCKED_WORD_LENGTH = 4;

interface GenerateGridInput {
  width: number;
  height: number;
  title: string;
  customClues: CustomClue[];
  /** Clue texts already used elsewhere in the book, to avoid repeats. */
  usedClues: Set<string>;
  /**
   * Normalized answers already placed on other grids in the book. These are hard
   * -excluded from generation so a word never appears on two grids. Custom words
   * are always kept (re-added inside the generator), so passing a custom word
   * here has no effect.
   */
  usedWords: Set<string>;
  /** Target clue difficulty. Default "balanced". */
  difficulty?: DifficultyMode;
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
  const clueDifficulty = getFrenchClueDifficulty();

  // Filter the clue DB to enforce the book's exclusions: drop any substantive
  // word already placed on another grid (hard word exclusion, ≥ MIN_LOCKED_WORD_
  // LENGTH — see the constant for why short filler is exempt), and drop any clue
  // text already used elsewhere (clue de-dup). Dropping a word from clueDb removes
  // it from every fill domain — the generator only ever places words that have a
  // real clue. Build a copy so the shared cached clueDb is left untouched.
  let clueDb = rawClueDb;
  if (input.usedClues.size > 0 || input.usedWords.size > 0) {
    clueDb = new Map();
    for (const [word, clues] of rawClueDb) {
      // word already on another grid in the book
      if (word.length >= MIN_LOCKED_WORD_LENGTH && input.usedWords.has(word)) continue;
      const filtered =
        input.usedClues.size > 0
          ? clues.filter((c) => !input.usedClues.has(c))
          : clues;
      if (filtered.length > 0) clueDb.set(word, filtered);
    }
  }

  const result = generateFlecheVector(
    {
      width: input.width,
      height: input.height,
      customClues: input.customClues,
      difficulty: input.difficulty,
    },
    wordList,
    clueDb,
    clueDifficulty,
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
    input.customClues.map((c) => normalizeAnswer(c.answer)),
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
