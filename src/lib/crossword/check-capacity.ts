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

/** Share of the grid above which generation reliably fails. */
const HARD_FILL_RATIO = 0.43;
/** Share above which generation still works but gets slow / flaky — worth a heads-up. */
const TIGHT_FILL_RATIO = 0.35;

export interface CapacityAnalysis {
  /** Normalized custom words longer than the grid's max dimension (can't fit). */
  tooLong: string[];
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

export function analyzeCapacity(
  width: number,
  height: number,
  customClues: { answer: string; clue: string }[],
): CapacityAnalysis {
  const words = customClues
    .map((c) => c.answer.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2);

  const maxDim = Math.max(width, height);
  const tooLong = words.filter((w) => w.length > maxDim);
  const customLetters = words.reduce((n, w) => n + w.length, 0);
  const fillRatio = width * height > 0 ? customLetters / (width * height) : 0;
  const overCapacity = fillRatio > HARD_FILL_RATIO;

  let message: string | null = null;
  if (tooLong.length > 0) {
    const w = tooLong[0];
    message = `Le mot « ${w} » (${w.length} lettres) est trop long pour une grille ${width}×${height}. Choisissez une grille plus grande ou raccourcissez le mot.`;
  } else if (overCapacity) {
    message = `Trop de mots personnalisés pour une grille ${width}×${height}. Choisissez une grille plus grande ou retirez quelques mots.`;
  }

  const recommendedMax = recommendedCustomWords(width, height);
  return {
    tooLong,
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
