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
  /** Custom letters exceed the share the grid can hold — provably impossible. */
  overCapacity: boolean;
  /** Fraction of grid cells the custom letters would consume (0..1). */
  fillRatio: number;
  /** Feasible, but dense enough that generation may be slow or fail. */
  tight: boolean;
  /** First user-facing blocking error, or null if the request can be attempted. */
  message: string | null;
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

  return {
    tooLong,
    overCapacity,
    fillRatio,
    tight: message === null && fillRatio > TIGHT_FILL_RATIO,
    message,
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
