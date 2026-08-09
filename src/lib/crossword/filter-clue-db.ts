import { normalizeClueText } from "@/lib/crossword/normalize";

/**
 * Apply a book's / a regeneration's exclusions to the clue DB, producing the
 * filtered map the generator fills from. Single source of truth shared by the
 * worker pool, the single-threaded fallback, and the book grid path — so all
 * three exclude identically.
 *
 * - `excludeAnswers`: normalized answers to drop entirely (removing a word from
 *   the clue DB removes it from every fill domain, since the generator only
 *   places words that have a real clue). Compared case-insensitively. The CALLER
 *   decides which answers to pass — e.g. the book path passes only words ≥
 *   MIN_LOCKED_WORD_LENGTH, keeping the 2–3 letter structural glue in the pool.
 * - `excludeClues`: clue texts to drop, so a clue never repeats. Compared with
 *   BOTH sides folded through `normalizeClueText` + upper-cased, because stored
 *   clue texts were normalized (sentence-cased) while the corpus strings are
 *   raw — an exact match would let "palace londonien" escape a stored "Palace
 *   londonien" and repeat across grids.
 *
 * Returns the ORIGINAL map unchanged (same reference) when there is nothing to
 * exclude — the generator copy-on-writes before injecting custom words, so no
 * caller mutates the shared corpus.
 */
export function filterClueDb(
  rawClueDb: Map<string, string[]>,
  excludeAnswers?: string[],
  excludeClues?: string[],
): Map<string, string[]> {
  const exclA = new Set((excludeAnswers ?? []).map((a) => a.toUpperCase()));
  const exclC = new Set(
    (excludeClues ?? []).map((c) => normalizeClueText(c).toUpperCase()),
  );
  if (exclA.size === 0 && exclC.size === 0) return rawClueDb;

  const out = new Map<string, string[]>();
  for (const [word, clues] of rawClueDb) {
    if (exclA.has(word)) continue; // word already placed elsewhere
    const filtered =
      exclC.size > 0
        ? clues.filter((c) => !exclC.has(normalizeClueText(c).toUpperCase()))
        : clues;
    if (filtered.length > 0) out.set(word, filtered);
  }
  return out;
}
