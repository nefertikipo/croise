/**
 * Fold a word to the bare A-Z alphabet used by crossword grids.
 *
 * French answers arrive with accents and ligatures (garçon, élève, cœur). A grid
 * cell can only hold a plain letter A-Z, so we fold each character to its base:
 *   ç → C, é → E, œ → OE, æ → AE, then uppercase and drop anything left over.
 *
 * IMPORTANT: do NOT use a bare `.toUpperCase().replace(/[^A-Z]/g, "")`. That
 * *deletes* accented letters instead of folding them — "garçon" becomes "GARON"
 * and "élève" becomes "LVE". Ligatures also need explicit handling because they
 * do not decompose under NFD (`"cœur".normalize("NFD")` keeps the œ, so a plain
 * NFD strip yields "CUR"). Always route through this helper.
 */
export function normalizeAnswer(word: string): string {
  return word
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Normalize a clue's casing to sentence case for display.
 *
 * The corpus mixes styles: some clues are screaming ALL CAPS ("IL AIME SON
 * HERBE"), others are lowercase ("petit félin"). We fold both to sentence case —
 * first letter uppercase, the rest as-is — so a generated grid reads
 * consistently. All-caps clues are lowercased first (they also lost their
 * accents in the corpus, which we can't recover); mixed/lowercase clues keep
 * their internal capitals so proper nouns survive ("médecin de Molière").
 */
export function normalizeClueText(clue: string): string {
  const trimmed = clue.trim();
  if (!trimmed) return trimmed;
  const hasLower = /[a-zà-ÿ]/.test(trimmed);
  const isAllCaps = !hasLower; // no lowercase letter at all → screaming caps
  const base = isAllCaps ? trimmed.toLowerCase() : trimmed;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Word-break offsets for a multi-word answer (e.g. "BON ANNIVERSAIRE").
 *
 * Returns the letter indices at which a new word begins in the folded answer —
 * the boundary sits *before* each returned index. "BON ANNIVERSAIRE" folds to
 * "BONANNIVERSAIRE" and returns [3] (a break between the 3rd and 4th cell). The
 * grid still places every letter contiguously; these offsets drive the dotted
 * cell borders that mark where one word ends and the next begins.
 */
export function answerBreaks(raw: string): number[] {
  const lengths = raw
    .split(/\s+/)
    .map((w) => normalizeAnswer(w).length)
    .filter((n) => n > 0);
  const breaks: number[] = [];
  let acc = 0;
  for (let i = 0; i < lengths.length - 1; i++) {
    acc += lengths[i];
    breaks.push(acc);
  }
  return breaks;
}
