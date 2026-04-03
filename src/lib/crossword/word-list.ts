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

  addWord(word: string, score: number = 50) {
    const upper = word.toUpperCase().trim();
    if (upper.length < 3 || !/^[A-Z]+$/.test(upper)) return;
    if (this.allWords.has(upper)) return;

    this.allWords.add(upper);
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

  getByLength(length: number): WordEntry[] {
    return this.words.get(length) ?? [];
  }

  getByConstraint(length: number, position: number, letter: string): string[] {
    return this.index.get(`${length}:${position}:${letter.toUpperCase()}`) ?? [];
  }

  has(word: string): boolean {
    return this.allWords.has(word.toUpperCase());
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
