import { readFileSync, existsSync } from "fs";
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
    // Use deduped file if available (much faster to load)
    const dedupedPath = join(process.cwd(), "data", "french-clues-deduped.tsv");
    const rawPath = join(process.cwd(), "data", "french-clues-dicomots.tsv");
    const filePath = existsSync(dedupedPath) ? dedupedPath : rawPath;
    const content = readFileSync(filePath, "utf-8");
    const seen = new Set<string>();

    for (const line of content.split("\n").slice(1)) {
      const tab = line.indexOf("\t");
      if (tab === -1) continue;
      const rawAnswer = line.slice(0, tab);
      const clue = line.slice(tab + 1).trim();
      if (!rawAnswer || !clue) continue;

      const answer = normalize(rawAnswer);
      if (answer.length < 2 || answer.length > 15) continue;

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

  // Add common 2-letter crossword words with clues
  const twoLetterWords: [string, string][] = [
    ["OR", "metal precieux"], ["AN", "unite de temps"], ["SI", "note de musique"],
    ["NU", "sans vetement"], ["EU", "possede"], ["ON", "pronom indefini"],
    ["IL", "pronom personnel"], ["EN", "preposition"], ["AU", "contraction"],
    ["LE", "article defini"], ["LA", "article defini feminin"], ["UN", "article indefini"],
    ["DE", "preposition"], ["DU", "contraction"], ["ET", "conjonction"],
    ["OU", "conjonction alternative"], ["NI", "conjonction negative"],
    ["MA", "adjectif possessif"], ["SA", "adjectif possessif"],
    ["TA", "adjectif possessif"], ["CE", "adjectif demonstratif"],
    ["ME", "pronom personnel"], ["SE", "pronom reflechi"], ["NE", "negation"],
    ["PI", "lettre grecque"], ["MU", "lettre grecque"], ["NU", "lettre grecque aussi"],
    ["RE", "note de musique"], ["DO", "note de musique"], ["FA", "note de musique"],
    ["MI", "note de musique"], ["UT", "ancienne note"], ["AS", "champion"],
    ["OS", "partie du squelette"], ["IF", "conifere"], ["US", "coutumes"],
  ];
  for (const [word, clue] of twoLetterWords) {
    if (!wl.has(word)) wl.addWord(word, 80);
    if (!clueDb.has(word)) clueDb.set(word, []);
    if (!clueDb.get(word)!.includes(clue)) clueDb.get(word)!.push(clue);
  }

  // Add classic crossword filler words (compass, abbreviations, common short words)
  const fillerWords: [string, string][] = [
    // Compass directions
    ["SSE", "direction du vent"], ["SSO", "point cardinal"], ["NNE", "direction"],
    ["NNO", "point cardinal"], ["ENE", "direction"], ["ONO", "point cardinal"],
    ["ESE", "direction du vent"], ["OSO", "point cardinal"],
    ["EST", "point cardinal"], ["SUD", "point cardinal"],
    ["NE", "entre nord et est"], ["SE", "direction"], ["NO", "refus"],
    // Common abbreviations
    ["ETC", "et caetera"], ["ADN", "molecule de la vie"], ["ONU", "organisation mondiale"],
    ["USA", "pays d'Amerique"], ["UNI", "rassemble"], ["AGE", "nombre d'annees"],
    // Common short crossword words
    ["ANE", "animal tetu"], ["ETE", "saison chaude"], ["ERE", "epoque"],
    ["ILE", "terre entouree d'eau"], ["OIE", "volatile"], ["RUE", "voie urbaine"],
    ["AME", "essence de l'etre"], ["AIR", "ce qu'on respire"], ["EAU", "liquide vital"],
    ["ANI", "oiseau tropical"], ["ARA", "perroquet colore"], ["EMU", "bouleverse"],
    ["OCA", "plante des Andes"], ["OLE", "cri espagnol"], ["OSE", "audacieux"],
    ["USE", "fatigue"], ["NEE", "de naissance"], ["IRE", "colere poetique"],
  ];
  for (const [word, clue] of fillerWords) {
    if (!wl.has(word)) wl.addWord(word, 70);
    if (!clueDb.has(word)) clueDb.set(word, []);
    if (!clueDb.get(word)!.includes(clue)) clueDb.get(word)!.push(clue);
  }

  // Also load French dictionary words as fallback fill (low score)
  // These help the CSP solver find solutions for difficult patterns
  try {
    const dictPath = join(process.cwd(), "data", "french-words-full.txt");
    const dictContent = readFileSync(dictPath, "utf-8");
    let extra = 0;
    for (const line of dictContent.split("\n")) {
      const word = normalize(line.trim());
      if (word.length < 3 || word.length > 10) continue;
      if (!/^[A-Z]+$/.test(word)) continue;
      if (!wl.has(word)) {
        wl.addWord(word, 5); // Very low score, only used when CSP is desperate
        extra++;
      }
    }
    console.log(`Dictionary filler: ${extra} extra words`);
  } catch {}


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
