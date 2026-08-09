import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import type { DifficultyMode } from "@/lib/crossword/fleche-vector-gen";
import { runFlecheGeneration } from "@/lib/crossword/run-fleche-generation";
import { generateCrosswordCode, retryOnUniqueViolation } from "@/lib/code";
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
  /**
   * Optional hidden word ("mot caché"): the generator steers the fill so the
   * grid's letters can spell it out (best-effort — same semantics as /fleche).
   */
  hiddenWord?: string;
  /** Target clue difficulty. Default "balanced". */
  difficulty?: DifficultyMode;
  /**
   * Optional photo block: a rectangle of cells reserved for a picture. The
   * generator fills around it and those cells persist as `*` in gridPattern
   * (rendered as an empty block). See `photo-presets.ts`.
   */
  reservedRect?: { x: number; y: number; w: number; h: number };
  /**
   * Wall-clock budget (ms) for the layout search. Book grids are personalized
   * (custom words / mot caché), so they get a generous budget — but a BATCH
   * caller must keep this small enough that N grids still fit the function's
   * maxDuration. Defaults to the hard-grid budget for a single grid.
   */
  timeBudgetMs?: number;
  /** Safety-net cap on the pool wait (ms); should sit under maxDuration. */
  maxWaitMs?: number;
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
  // Book exclusions: hard-exclude only substantive words (≥ MIN_LOCKED_WORD_
  // LENGTH — see the constant for why short filler must stay in the pool), and
  // drop clues already used elsewhere. The shared filter folds clue casing (see
  // filterClueDb) so a normalized stored clue still matches its raw corpus form.
  const excludeAnswers = [...input.usedWords].filter(
    (w) => w.length >= MIN_LOCKED_WORD_LENGTH,
  );

  const hiddenWord = input.hiddenWord?.trim() || undefined;

  // Race the worker pool across cores, same as /fleche — this is what lets a
  // personalized book grid fit more than a couple of custom words. Falls back to
  // single-threaded only if the pool errors.
  const result = await runFlecheGeneration(
    {
      width: input.width,
      height: input.height,
      customClues: input.customClues,
      hiddenWord,
      difficulty: input.difficulty,
      reservedRect: input.reservedRect,
      timeBudgetMs: input.timeBudgetMs ?? 240000,
    },
    {
      excludeAnswers,
      excludeClues: [...input.usedClues],
      maxWaitMs: input.maxWaitMs ?? 285000,
    },
  );
  if (!result || !result.success) return null;

  const { grid, words } = result;
  // Reserved (photo-block) cells persist as `*` in gridPattern so the render +
  // print layers show an empty block; they never carry a letter.
  const reserved = grid.reserved;
  let pattern = "";
  let solution = "";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (reserved?.has(`${x},${y}`)) {
        pattern += "*";
        solution += "#";
        continue;
      }
      pattern += cell.kind === "blue" ? "#" : ".";
      solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
    }
  }

  const customAnswers = new Set(
    input.customClues.map((c) => normalizeAnswer(c.answer)),
  );

  // Pre-generate the id so crossword + placed words can be written in ONE
  // atomic db.batch (the neon-http driver has no interactive transactions).
  const crosswordId = crypto.randomUUID();
  const wordRows = words.map((w, i) => ({
    crosswordId,
    answer: w.word,
    direction: w.slot.direction === "horizontal" ? ("right" as const) : ("down" as const),
    number: i + 1,
    startRow: w.slot.cells[0].y,
    startCol: w.slot.cells[0].x,
    length: w.slot.length,
    clueText: w.clueText,
    isCustom: customAnswers.has(w.word),
    difficulty: w.difficulty,
  }));

  const code = await retryOnUniqueViolation(async () => {
    const freshCode = generateCrosswordCode();
    const insertCrossword = db.insert(crosswords).values({
      id: crosswordId,
      code: freshCode,
      title: input.title,
      language: "fr",
      width: grid.width,
      height: grid.height,
      gridPattern: pattern,
      gridSolution: solution,
      hiddenWord: hiddenWord ?? null,
      status: "ready",
    });
    if (wordRows.length > 0) {
      await db.batch([insertCrossword, db.insert(placedWords).values(wordRows)]);
    } else {
      await insertCrossword;
    }
    return freshCode;
  });

  return { crosswordId, code };
}
