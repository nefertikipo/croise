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
