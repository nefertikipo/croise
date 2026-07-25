import type { WordEntry } from "@/lib/crossword/types";

/**
 * In-memory word list with pre-built indexes for fast constraint lookup.
 *
 * The index maps "length:position:letter" -> list of words.
 * e.g. "5:2:A" -> all 5-letter words with 'A' at position 2.
 */
export class WordList {
  private words: Map<number, WordEntry[]> = new Map();
  private index: Map<string, string[]> = new Map();
  private allWords: Set<string> = new Set();
  private scoreByWord: Map<string, number> = new Map();

  addWord(word: string, score: number = 50) {
    const upper = word.toUpperCase().trim();
    if (upper.length < 2 || !/^[A-Z]+$/.test(upper)) return;
    if (this.allWords.has(upper)) return;

    this.allWords.add(upper);
    this.scoreByWord.set(upper, score);
    const entry: WordEntry = { word: upper, score };
    const len = upper.length;

    if (!this.words.has(len)) {
      this.words.set(len, []);
    }
    this.words.get(len)!.push(entry);

    for (let i = 0; i < len; i++) {
      const key = `${len}:${i}:${upper[i]}`;
      if (!this.index.has(key)) {
        this.index.set(key, []);
      }
      this.index.get(key)!.push(upper);
    }
  }

  /**
   * Remove a word previously injected with `addWord`, restoring every index.
   * Used by the generator to give back the process-wide cached word list
   * exactly as it found it after temporarily injecting a caller's custom
   * words (see `generateFlecheVector`) — otherwise one user's invented words
   * would leak into every other user's grids on a warm instance.
   */
  removeWord(word: string) {
    const upper = word.toUpperCase().trim();
    if (!this.allWords.has(upper)) return;

    this.allWords.delete(upper);
    this.scoreByWord.delete(upper);
    const len = upper.length;

    const entries = this.words.get(len);
    if (entries) {
      const i = entries.findIndex((e) => e.word === upper);
      if (i !== -1) entries.splice(i, 1);
    }

    for (let i = 0; i < len; i++) {
      const key = `${len}:${i}:${upper[i]}`;
      const bucket = this.index.get(key);
      if (!bucket) continue;
      const j = bucket.indexOf(upper);
      if (j !== -1) bucket.splice(j, 1);
      if (bucket.length === 0) this.index.delete(key);
    }
  }

  getByLength(length: number): WordEntry[] {
    return this.words.get(length) ?? [];
  }

  getByConstraint(length: number, position: number, letter: string): string[] {
    return this.index.get(`${length}:${position}:${letter.toUpperCase()}`) ?? [];
  }

  has(word: string): boolean {
    return this.allWords.has(word.toUpperCase());
  }

  /** Word quality score (e.g. corpus familiarity). Defaults to 0 if unknown. */
  getScore(word: string): number {
    return this.scoreByWord.get(word.toUpperCase()) ?? 0;
  }

  get size(): number {
    return this.allWords.size;
  }
}

/**
 * Build a word list from the clue database entries.
 * Each unique answer becomes a word, scored by frequency (number of clues referencing it).
 */
export function buildWordListFromClues(
  clues: { answer: string; count: number }[]
): WordList {
  const list = new WordList();
  for (const { answer, count } of clues) {
    const score = Math.min(100, Math.max(1, Math.round(Math.log2(count + 1) * 15)));
    list.addWord(answer, score);
  }
  return list;
}

/**
 * Build a basic word list from a newline-separated string of words.
 * Used as a fallback when the DB isn't seeded yet.
 */
export function buildWordListFromText(text: string): WordList {
  const list = new WordList();
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      list.addWord(trimmed, 50);
    }
  }
  return list;
}
