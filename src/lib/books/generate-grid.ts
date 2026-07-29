import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateFlecheVector, type DifficultyMode, type VectorGenResult } from "@/lib/crossword/fleche-vector-gen";
import { getFrenchWordList, getFrenchClueDb, getFrenchClueDifficulty, ensureLoaded } from "@/lib/crossword/load-french-clues";
import { getFlechePool } from "@/lib/crossword/fleche-pool-singleton";
import { generateCrosswordCode, retryOnUniqueViolation } from "@/lib/code";
import { normalizeAnswer, normalizeClueText } from "@/lib/crossword/normalize";

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
  const hiddenWord = input.hiddenWord?.trim() || undefined;
  const genParams = {
    width: input.width,
    height: input.height,
    customClues: input.customClues,
    hiddenWord,
    difficulty: input.difficulty,
  };

  // Stored clue texts went through normalizeClueText (trim + sentence case,
  // ALL-CAPS lowercased) but the corpus strings are raw — so fold BOTH sides to
  // the normalized, case-insensitive form before comparing, mirroring the
  // in-grid de-dup. Without this, corpus "palace londonien" (stored as "Palace
  // londonien") escapes the filter and the clue repeats across grids. The pool
  // path sends the pre-folded set (with foldExcludedClues so workers fold the
  // corpus side too); the fallback path folds against its own filtered copy.
  const usedCluesFolded = new Set<string>();
  for (const c of input.usedClues) {
    usedCluesFolded.add(normalizeClueText(c).toUpperCase());
  }

  // Prefer the warm worker pool — the same mechanism as /fleche: every worker
  // holds its own corpus copy and races a different random layout, so dense
  // custom-word/hidden-word grids succeed far more often per wall-second. The
  // book's no-repeat invariant holds unchanged: workers drop excludeAnswers and
  // excludeClues from their per-job corpus copy exactly like the fallback filter
  // below (word exclusion pre-filtered to ≥ MIN_LOCKED_WORD_LENGTH here, since
  // short structural filler must stay available — see the constant). Custom-word
  // jobs get a freshly rebuilt word list + cloned clue DB inside the worker, so
  // one user's custom words never leak into shared state. Fall back to
  // single-threaded only when the pool is unavailable (disabled, failed init in
  // this environment) or ERRORS — a pool that ran and found no solution is a
  // real failure, so re-running single-threaded would just fail again.
  let result: VectorGenResult | null = null;
  let handledByPool = false;
  const pool = await getFlechePool();
  if (pool) {
    try {
      const excludeAnswers: string[] = [];
      for (const w of input.usedWords) {
        if (w.length >= MIN_LOCKED_WORD_LENGTH) excludeAnswers.push(w);
      }
      const r = await pool.generate(genParams, {
        excludeAnswers,
        excludeClues: [...usedCluesFolded],
        foldExcludedClues: true,
        maxWaitMs: 118000,
      });
      result = r.result;
      handledByPool = true;
    } catch (poolErr) {
      console.error("[book-grid] pool error, single-threaded fallback:", poolErr);
    }
  }

  if (!handledByPool) {
    await ensureLoaded();
    const wordList = getFrenchWordList();
    const rawClueDb = getFrenchClueDb();
    const clueDifficulty = getFrenchClueDifficulty();

    // Filter the clue DB to enforce the book's exclusions: drop any substantive
    // word already placed on another grid (hard word exclusion, ≥ MIN_LOCKED_WORD_
    // LENGTH — see the constant for why short filler is exempt), and drop any clue
    // text already used elsewhere (clue de-dup). Dropping a word from clueDb removes
    // it from every fill domain — the generator only ever places words that have a
    // real clue. ALWAYS pass a copy so the process-wide cached clueDb can never be
    // mutated (the generator also copy-on-writes; this is defense-in-depth —
    // shallow-copying ~80K entries of shared array refs is cheap).
    let clueDb: Map<string, string[]>;
    if (usedCluesFolded.size > 0 || input.usedWords.size > 0) {
      clueDb = new Map();
      for (const [word, clues] of rawClueDb) {
        // word already on another grid in the book
        if (word.length >= MIN_LOCKED_WORD_LENGTH && input.usedWords.has(word)) continue;
        const filtered =
          usedCluesFolded.size > 0
            ? clues.filter((c) => !usedCluesFolded.has(normalizeClueText(c).toUpperCase()))
            : clues;
        if (filtered.length > 0) clueDb.set(word, filtered);
      }
    } else {
      clueDb = new Map(rawClueDb);
    }

    result = generateFlecheVector(genParams, wordList, clueDb, clueDifficulty);
  }

  if (!result || !result.success) return null;

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
