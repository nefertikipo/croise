/** Non-breaking space — glues tokens so a line can't break between them. */
export const NBSP = "\u00A0";

/**
 * French typography: never leave a one-letter word (à, y, a, ô…) hanging at the
 * end of a wrapped line. Glue each single-letter word to the word that follows
 * it with a non-breaking space so the line can't break between them.
 *
 * Matters in the narrow mots fléchés clue cells, where aggressive `break-word`
 * wrapping (screen) or greedy word-wrap (PDF) would otherwise strand a lone
 * letter on its own line. Consecutive one-letter words chain together ("il y a"
 * stays on one line).
 */
export function preventFrenchOrphans(text: string): string {
  return (
    text
      // Glue a one-letter word to the word that FOLLOWS it. Lookbehind (not a
      // consuming group) for the boundary so consecutive one-letter words chain
      // — "il y a" keeps both spaces glued rather than leaving the space between
      // "y" and "a" free to break.
      .replace(/(?<=^|[\s(«])(\p{L})[ \t]+/gu, (_m, letter: string) => `${letter}${NBSP}`)
      // A one-letter word at the very END has no following word to glue to (e.g.
      // "symbole du gramme : g"), so glue it to what PRECEDES it instead, so it
      // can't wrap onto a line by itself.
      .replace(/[ \t]+(\p{L})$/u, (_m, letter: string) => `${NBSP}${letter}`)
  );
}

/** Zero-width space — an optional line-break opportunity with no visible width. */
export const ZWSP = "\u200B";

/**
 * Insert break opportunities inside long words so that when the clue box is too
 * narrow to hold a word whole, the browser can only break it at a spot that
 * leaves at least two characters on each side — a forced break must never strand
 * a single letter on its own line.
 *
 * Opportunities are placed after every second character and kept >=2 chars from
 * each end, so they sit >=2 apart: any single break, or run of breaks, yields
 * lines of >=2 characters. Pair this with `overflow-wrap: normal` on screen so
 * the browser breaks ONLY at these safe points (and at spaces), never at an
 * arbitrary character. The PDF path enforces the same rule in `breakIntoChunks`.
 */
export function insertSoftBreaks(text: string): string {
  return text.replace(/\p{L}{4,}/gu, (word) => {
    let out = "";
    for (let i = 0; i < word.length; i++) {
      out += word[i];
      const emitted = i + 1;
      if (emitted >= 2 && emitted % 2 === 0 && word.length - emitted >= 2) {
        out += ZWSP;
      }
    }
    return out;
  });
}
