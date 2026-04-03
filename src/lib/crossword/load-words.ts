import { readFileSync } from "fs";
import { join } from "path";
import { WordList } from "@/lib/crossword/word-list";
import type { Language } from "@/types";

const cache = new Map<string, WordList>();

/**
 * Normalize a word for crossword use: uppercase, strip diacritics, keep only A-Z.
 */
function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Load word list for a given language.
 * English: scored crossword word list (scored-words.txt)
 * French: plain word list (french-words-full.txt)
 * Cached per language.
 */
export function getWordList(language: Language = "en"): WordList {
  const cached = cache.get(language);
  if (cached) return cached;

  const wl = new WordList();
  const dataDir = join(process.cwd(), "data");

  if (language === "en") {
    loadEnglish(wl, dataDir);
  } else if (language === "fr") {
    loadFrench(wl, dataDir);
  }

  cache.set(language, wl);
  return wl;
}

function loadEnglish(wl: WordList, dataDir: string) {
  try {
    const content = readFileSync(join(dataDir, "scored-words.txt"), "utf-8");
    let count = 0;

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const [word, scoreStr] = trimmed.split(";");
      if (!word || word.length < 3 || word.length > 15) continue;
      if (!/^[A-Z]+$/i.test(word)) continue;

      const score = parseInt(scoreStr, 10);
      if (isNaN(score) || score < 40) continue;

      // Filter out non-words: must contain a vowel, no 3+ consecutive consonants
      const upper = word.toUpperCase();
      if (!/[AEIOU]/.test(upper)) continue;
      if (/[BCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(upper)) continue;

      wl.addWord(word, score);
      count++;
    }

    console.log(`Loaded ${count} English crossword words`);
  } catch {
    console.log("English word list not found, using minimal fallback");
    const basics = ["ACE", "ACT", "ADD", "AGE", "AID", "AIM", "AIR", "ALL", "AND", "ARC",
      "ARE", "ARM", "ART", "ATE", "BAD", "BAG", "BAN", "BAR", "BAT", "BED",
      "BIG", "BIT", "BOX", "BOY", "BUS", "BUT", "BUY", "CAN", "CAP", "CAR",
      "CAT", "COP", "CRY", "CUP", "CUT", "DAD", "DAY", "DIG", "DOG", "DRY",
      "EAR", "EAT", "EGG", "END", "ERA", "EVE", "EYE", "FAN", "FAR", "FAT",
      "FEW", "FIT", "FLY", "FOR", "FOX", "FUN", "GAP", "GAS", "GET", "GOD"];
    for (const w of basics) wl.addWord(w, 50);
  }
}

function loadFrench(wl: WordList, dataDir: string) {
  try {
    const content = readFileSync(join(dataDir, "french-words-full.txt"), "utf-8");
    let count = 0;

    for (const line of content.split("\n")) {
      const word = normalize(line.trim());
      if (word.length < 3 || word.length > 15) continue;
      if (!/^[A-Z]+$/.test(word)) continue;

      // Score by word length (shorter = more crossword-friendly)
      const score = word.length <= 4 ? 60 : word.length <= 6 ? 50 : word.length <= 8 ? 40 : 35;
      wl.addWord(word, score);
      count++;
    }

    console.log(`Loaded ${count} French words`);
  } catch {
    console.log("French word list not found");
  }
}
