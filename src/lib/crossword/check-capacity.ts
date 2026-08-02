/**
 * Cheap feasibility check for a custom-word request — usable on both the server
 * (fast guard before the ~110s generation budget) and the client (live flagging
 * as the user adds words). Pure: no server-only dependencies.
 *
 * Two provably-impossible cases are caught:
 *  1. A word longer than both grid dimensions — it can't fit in any slot.
 *  2. Custom letters filling too large a share of the grid to leave room for
 *     the crossing fill words. The 0.43 threshold sits comfortably between the
 *     densest layouts that still generate (e.g. 9×13 with 7 words ≈ 0.37) and
 *     those that never do (e.g. 8×11 with the same 7 words ≈ 0.49).
 */

import { normalizeAnswer } from "@/lib/crossword/normalize";

/** Share of the grid above which generation reliably fails. */
const HARD_FILL_RATIO = 0.43;
/** Share above which generation still works but gets slow / flaky — worth a heads-up. */
const TIGHT_FILL_RATIO = 0.35;

export interface CapacityAnalysis {
  /** Normalized custom words longer than the grid's max dimension (can't fit). */
  tooLong: string[];
  /**
   * Placeable but risky-long words: as long as, or longer than, the grid's
   * SHORTER side, so they only fit in the long direction and eat a near-full
   * line. Heavily cross-constrained — the biggest single cause of a dense grid
   * failing to generate. Excludes {@link tooLong} (those are impossible, not
   * merely risky). Surfaced as a soft warning at word-entry time.
   */
  longWords: string[];
  /** Custom letters exceed the share the grid can hold — provably impossible. */
  overCapacity: boolean;
  /** Fraction of grid cells the custom letters would consume (0..1). */
  fillRatio: number;
  /** Feasible, but dense enough that generation may be slow or fail. */
  tight: boolean;
  /** First user-facing blocking error, or null if the request can be attempted. */
  message: string | null;
  /** Measured reliable custom-word count for this grid — the "up to N" figure. */
  recommendedMax: number;
  /** Count of usable custom words currently requested. */
  wordCount: number;
  /** More words requested than the grid reliably fits (still attemptable). */
  overRecommended: boolean;
}

/**
 * Measured reliable custom-word capacity per grid: the most realistic (French
 * given-name) custom words that still generate at ~100% on the single-threaded
 * engine. Small grids choke well below their raw fill-ratio limit, so this is a
 * measured lookup keyed to the offered formats, not a formula. Off-menu sizes
 * fall back to a gentle, capped extrapolation. Source: scripts/capacity-guidance.ts.
 */
export function recommendedCustomWords(width: number, height: number): number {
  const area = width * height;
  if (area <= 40) return 1; // 5×7
  if (area <= 88) return 6; // 8×11
  if (area <= 117) return 8; // 9×13
  if (area <= 187) return 9; // 11×15, 11×17
  return Math.min(14, Math.round(area / 18)); // larger than any offered format
}

/** Letters that are scarce in French fill — hard to satisfy at crossings. */
const RARE_LETTERS = new Set("JKQWXYZ".split(""));

function countRare(word: string): number {
  let n = 0;
  for (const ch of word) if (RARE_LETTERS.has(ch)) n++;
  return n;
}

/**
 * Should this request run on the boosted-CPU endpoint? "Easy" grids — few, short,
 * common-letter words and no demanding mot caché — generate fast on the classic
 * (cheaper) tier. Anything harder (many words, a long word, several rare letters,
 * a dense fill, or a rare/long hidden word) gets more cores so it finishes inside
 * the time budget. Pure + shared, so the client picks the endpoint and the server
 * can double-check with the same logic.
 */
export function needsBoostedCompute(
  width: number,
  height: number,
  customClues: { answer: string; clue: string }[],
  hiddenWord?: string,
): boolean {
  const words = customClues
    .map((c) => normalizeAnswer(c.answer))
    .filter((w) => w.length >= 2);
  const hidden = hiddenWord ? normalizeAnswer(hiddenWord) : "";

  const wordCount = words.length;
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const rare = words.reduce((n, w) => n + countRare(w), 0) + countRare(hidden);
  const customLetters = words.reduce((n, w) => n + w.length, 0);
  const fillRatio = width * height > 0 ? customLetters / (width * height) : 0;

  // Each condition alone is enough to want the extra cores.
  if (wordCount >= 3) return true;              // more than a couple of words
  if (longest >= 7) return true;                // a long word to cross-constrain
  if (rare >= 2) return true;                   // several scarce letters
  if (fillRatio > TIGHT_FILL_RATIO) return true; // dense custom fill
  if (hidden.length >= 7) return true;          // a long mot caché to satisfy
  if (hidden.length >= 2 && countRare(hidden) >= 1) return true; // rare-letter mot caché
  return false;
}

export function analyzeCapacity(
  width: number,
  height: number,
  customClues: { answer: string; clue: string }[],
): CapacityAnalysis {
  const words = customClues
    .map((c) => normalizeAnswer(c.answer))
    .filter((w) => w.length >= 2);

  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  const tooLong = words.filter((w) => w.length > maxDim);
  // Placeable (<= maxDim) but as long as / longer than the short side: only fits
  // the long direction, so it's cross-constrained and hard to place.
  const longWords = words.filter((w) => w.length <= maxDim && w.length >= minDim);
  const customLetters = words.reduce((n, w) => n + w.length, 0);
  const fillRatio = width * height > 0 ? customLetters / (width * height) : 0;
  const overCapacity = fillRatio > HARD_FILL_RATIO;

  let message: string | null = null;
  if (tooLong.length > 0) {
    const w = tooLong[0];
    message = `Le mot « ${w} » (${w.length} lettres) est trop long pour une grille ${width}×${height}. Choisissez une grille plus grande ou raccourcissez le mot.`;
  } else if (longWords.length > 0) {
    // Blocking (not just a warning): a word this long only fits the grid's long
    // side, is heavily cross-constrained, and reliably makes generation fail.
    const w = longWords[0];
    message = `Le mot « ${w} » (${w.length} lettres) est trop long pour être placé de façon fiable dans une grille ${width}×${height}. Utilisez un mot de ${minDim - 1} lettres maximum, ou choisissez une grille plus grande.`;
  } else if (overCapacity) {
    message = `Trop de mots personnalisés pour une grille ${width}×${height}. Choisissez une grille plus grande ou retirez quelques mots.`;
  }

  const recommendedMax = recommendedCustomWords(width, height);
  return {
    tooLong,
    longWords,
    overCapacity,
    fillRatio,
    tight: message === null && fillRatio > TIGHT_FILL_RATIO,
    message,
    recommendedMax,
    wordCount: words.length,
    overRecommended: message === null && words.length > recommendedMax,
  };
}

/**
 * Blocking check for an impossible mot caché — a hidden word the grid can't
 * spell out no matter how it fills. Returns a French error, or null if the word
 * is empty (no mot caché) or plausibly placeable.
 *
 * We only block the provably/near-certainly impossible, since the generator
 * already falls back gracefully and the UI reports a miss after the fact —
 * over-blocking a word that WOULD work is worse than letting a borderline one
 * through:
 *  - fewer than 2 letters once folded (nothing to hide),
 *  - longer than the grid can supply distinct letter cells for,
 *  - needs 3+ of one scarce letter (J/K/Q/W/X/Y/Z), or 5+ scarce letters total —
 *    French fill can seed a rare letter or two, never a pile of them.
 */
export function checkHiddenWord(
  width: number,
  height: number,
  hiddenWord: string | undefined,
): string | null {
  const raw = (hiddenWord ?? "").trim();
  if (!raw) return null; // no mot caché requested
  const word = normalizeAnswer(raw);
  if (word.length < 2) {
    return "Le mot caché doit contenir au moins 2 lettres.";
  }

  // Rough count of letter (white) cells: comb borders + interior, minus the
  // ~15% that become clue cells. Conservative, so we only flag the clearly-too-long.
  const letterCells = Math.floor(width * height * 0.5);
  if (word.length > letterCells) {
    return `Le mot caché « ${word} » (${word.length} lettres) est trop long pour être caché dans une grille ${width}×${height}.`;
  }

  const rareByLetter = new Map<string, number>();
  for (const ch of word) {
    if (RARE_LETTERS.has(ch)) rareByLetter.set(ch, (rareByLetter.get(ch) ?? 0) + 1);
  }
  let rareTotal = 0;
  for (const [ch, n] of rareByLetter) {
    rareTotal += n;
    if (n >= 3) {
      return `Le mot caché « ${word} » demande trop de « ${ch} » : cette lettre est trop rare pour apparaître autant de fois dans la grille.`;
    }
  }
  if (rareTotal >= 5) {
    return `Le mot caché « ${word} » contient trop de lettres rares pour être caché de façon fiable dans une grille ${width}×${height}.`;
  }

  return null;
}

/**
 * Returns a user-facing French error string if the request cannot possibly fit
 * the grid, else null. Thin wrapper over {@link analyzeCapacity} for the server
 * guard.
 */
export function checkCapacity(
  width: number,
  height: number,
  customClues: { answer: string; clue: string }[],
): string | null {
  return analyzeCapacity(width, height, customClues).message;
}
