import { readFileSync } from "fs";
import { join } from "path";
import { WordList } from "@/lib/crossword/word-list";

let cachedWordList: WordList | null = null;

/**
 * Load the crossword word list.
 * Tries scored-words.txt first (WORD;SCORE format from crossword construction community),
 * then falls back to english-words.txt (plain word list), then built-in defaults.
 * Cached in memory after first load.
 */
export function getWordList(): WordList {
  if (cachedWordList) return cachedWordList;

  const wl = new WordList();
  const dataDir = join(process.cwd(), "data");

  // Try scored crossword word list first
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
      if (isNaN(score)) continue;

      // Only include words scored 20+ (skip garbage/obscure entries)
      if (score >= 20) {
        wl.addWord(word, score);
        count++;
      }
    }

    console.log(`Loaded ${count} scored crossword words`);
    cachedWordList = wl;
    return wl;
  } catch {
    // scored list not available
  }

  // Fallback: plain english word list
  try {
    const content = readFileSync(join(dataDir, "english-words.txt"), "utf-8");
    let count = 0;

    for (const line of content.split("\n")) {
      const word = line.trim();
      if (word.length >= 3 && word.length <= 15 && /^[A-Z]+$/i.test(word)) {
        const score = word.length <= 5 ? 70 : word.length <= 7 ? 50 : 30;
        wl.addWord(word, score);
        count++;
      }
    }

    console.log(`Loaded ${count} words from plain word list`);
  } catch {
    // No word files available, use minimal built-in
    const BASIC = [
      "ACE", "ACT", "ADD", "AGE", "AID", "AIM", "AIR", "ALE", "ALL", "AND",
      "APE", "ARC", "ARE", "ARK", "ARM", "ART", "ATE", "AWE", "BAD", "BAG",
      "BAN", "BAR", "BAT", "BAY", "BED", "BIG", "BIT", "BOW", "BOX", "BOY",
      "BUG", "BUS", "BUT", "BUY", "CAB", "CAN", "CAP", "CAR", "CAT", "COP",
      "CRY", "CUP", "CUT", "DAD", "DAY", "DIG", "DOG", "DOT", "DRY", "DUE",
      "EAR", "EAT", "EGG", "END", "ERA", "EVE", "EYE", "FAN", "FAR", "FAT",
      "FEW", "FIG", "FIT", "FLY", "FOR", "FOX", "FUN", "FUR", "GAP", "GAS",
      "GET", "GOD", "GOT", "GUM", "GUN", "GUT", "GUY", "GYM", "HAD", "HAM",
      "HAS", "HAT", "HEN", "HER", "HID", "HIM", "HIP", "HIS", "HIT", "HOG",
      "HOT", "HOW", "HUB", "HUG", "ICE", "ILL", "INK", "INN", "ION", "IRE",
    ];
    for (const w of BASIC) wl.addWord(w, 50);
    console.log(`Using built-in word list (${wl.size} words)`);
  }

  cachedWordList = wl;
  return wl;
}
