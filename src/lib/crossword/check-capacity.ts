/**
 * Cheap feasibility check for a custom-word request. Returns a user-facing
 * French error string if the request cannot possibly fit the grid, else null.
 *
 * Two provably-impossible cases are caught:
 *  1. A word longer than both grid dimensions — it can't fit in any slot.
 *  2. Custom letters filling too large a share of the grid to leave room for
 *     the crossing fill words. The 0.43 threshold sits comfortably between the
 *     densest layouts that still generate (e.g. 9×13 with 7 words ≈ 0.37) and
 *     those that never do (e.g. 8×11 with the same 7 words ≈ 0.49).
 */
export function checkCapacity(
  width: number,
  height: number,
  customClues: { answer: string; clue: string }[],
): string | null {
  const words = customClues
    .map((c) => c.answer.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2);
  if (words.length === 0) return null;

  const maxDim = Math.max(width, height);
  const tooLong = words.find((w) => w.length > maxDim);
  if (tooLong) {
    return `Le mot « ${tooLong} » (${tooLong.length} lettres) est trop long pour une grille ${width}×${height}. Choisissez une grille plus grande ou raccourcissez le mot.`;
  }

  const customLetters = words.reduce((n, w) => n + w.length, 0);
  if (customLetters > width * height * 0.43) {
    return `Trop de mots personnalisés pour une grille ${width}×${height}. Choisissez une grille plus grande ou retirez quelques mots.`;
  }

  return null;
}
