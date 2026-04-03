import { readFileSync } from "fs";
import { join } from "path";
import { WordList } from "@/lib/crossword/word-list";

let cachedWl: WordList | null = null;
let cachedClueDb: Map<string, string[]> | null = null;

function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function load() {
  if (cachedWl && cachedClueDb) return;

  const wl = new WordList();
  const clueDb = new Map<string, string[]>();

  // Load scraped clue-answer pairs (best quality)
  try {
    const filePath = join(process.cwd(), "data", "french-clues-dicomots.tsv");
    const content = readFileSync(filePath, "utf-8");
    const seen = new Set<string>();

    for (const line of content.split("\n").slice(1)) {
      const tab = line.indexOf("\t");
      if (tab === -1) continue;
      const rawAnswer = line.slice(0, tab);
      const clue = line.slice(tab + 1).trim();
      if (!rawAnswer || !clue) continue;

      const answer = normalize(rawAnswer);
      if (answer.length < 3 || answer.length > 15) continue;

      const key = answer + "|" + clue;
      if (seen.has(key)) continue;
      seen.add(key);

      wl.addWord(answer, 90); // Much higher score for words with real clues
      if (!clueDb.has(answer)) clueDb.set(answer, []);
      clueDb.get(answer)!.push(clue);
    }

    console.log(`Scraped clues: ${clueDb.size} words with clues`);
  } catch {
    console.log("French clue file not found");
  }

  // Also load full French word list (fills gaps, lower score)
  try {
    const filePath = join(process.cwd(), "data", "french-words-full.txt");
    const content = readFileSync(filePath, "utf-8");
    let extra = 0;

    for (const line of content.split("\n")) {
      const word = normalize(line.trim());
      if (word.length < 3 || word.length > 15) continue;
      if (!/^[A-Z]+$/.test(word)) continue;
      if (!wl.has(word)) {
        wl.addWord(word, 10); // Low score, only used as fallback fill
        extra++;
      }
    }

    console.log(`Extra French words: ${extra}`);
  } catch {
    // No extra word list
  }

  console.log(`Total French words: ${wl.size}`);

  cachedWl = wl;
  cachedClueDb = clueDb;
}

export function getFrenchWordList(): WordList {
  load();
  return cachedWl!;
}

export function getFrenchClueDb(): Map<string, string[]> {
  load();
  return cachedClueDb!;
}
