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

/**
 * Load from Neon database (production / when TSV files aren't available).
 */
async function loadFromDatabase(): Promise<{
  wl: WordList;
  clueDb: Map<string, string[]>;
}> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  const wl = new WordList();
  const clueDb = new Map<string, string[]>();

  // Load all words + clues in one query
  const rows = await sql`
    SELECT w.word, c.clue
    FROM words w
    JOIN clues c ON c.word_id = w.id
    WHERE w.language = 'fr'
    AND w.active = true
    AND LENGTH(w.word) BETWEEN 2 AND 15
  `;

  for (const row of rows) {
    const word = row.word as string;
    const clue = row.clue as string;
    wl.addWord(word, 85);
    if (!clueDb.has(word)) clueDb.set(word, []);
    clueDb.get(word)!.push(clue);
  }

  console.log(`Database: ${clueDb.size} words, ${rows.length} clue pairs`);
  return { wl, clueDb };
}

/**
 * Load from local TSV files (development).
 */
function loadFromFiles(): { wl: WordList; clueDb: Map<string, string[]> } {
  const wl = new WordList();
  const clueDb = new Map<string, string[]>();
  const seen = new Set<string>();

  function loadTsvFile(filePath: string, score: number, label: string) {
    if (!existsSync(filePath)) return;
    try {
      const content = readFileSync(filePath, "utf-8");
      let count = 0;

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

        wl.addWord(answer, score);
        if (!clueDb.has(answer)) clueDb.set(answer, []);
        clueDb.get(answer)!.push(clue);
        count++;
      }

      console.log(`${label}: ${count} clue pairs loaded`);
    } catch {
      console.log(`${label}: file not found or unreadable`);
    }
  }

  const dedupedPath = join(process.cwd(), "data", "french-clues-deduped.tsv");
  const rawPath = join(process.cwd(), "data", "french-clues-dicomots.tsv");
  loadTsvFile(existsSync(dedupedPath) ? dedupedPath : rawPath, 90, "dico-mots.fr");
  loadTsvFile(join(process.cwd(), "data", "french-clues-dicomots-extra.tsv"), 88, "dico-mots.fr (extra)");
  loadTsvFile(join(process.cwd(), "data", "french-clues-fsolver.tsv"), 85, "fsolver.fr");

  console.log(`TSV files: ${clueDb.size} words with clues`);
  return { wl, clueDb };
}

function addBuiltinWords(wl: WordList, clueDb: Map<string, string[]>) {
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

  const fillerWords: [string, string][] = [
    ["SSE", "direction du vent"], ["SSO", "point cardinal"], ["NNE", "direction"],
    ["NNO", "point cardinal"], ["ENE", "direction"], ["ONO", "point cardinal"],
    ["ESE", "direction du vent"], ["OSO", "point cardinal"],
    ["EST", "point cardinal"], ["SUD", "point cardinal"],
    ["NE", "entre nord et est"], ["SE", "direction"], ["NO", "refus"],
    ["ETC", "et caetera"], ["ADN", "molecule de la vie"], ["ONU", "organisation mondiale"],
    ["USA", "pays d'Amerique"], ["UNI", "rassemble"], ["AGE", "nombre d'annees"],
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
}

async function load() {
  if (cachedWl && cachedClueDb) return;

  // Check if local TSV files exist (development)
  const hasLocalFiles = existsSync(join(process.cwd(), "data", "french-clues-deduped.tsv"))
    || existsSync(join(process.cwd(), "data", "french-clues-dicomots.tsv"));

  let wl: WordList;
  let clueDb: Map<string, string[]>;

  if (hasLocalFiles) {
    ({ wl, clueDb } = loadFromFiles());
  } else if (process.env.DATABASE_URL) {
    ({ wl, clueDb } = await loadFromDatabase());
  } else {
    console.warn("No clue data source available (no TSV files, no DATABASE_URL)");
    wl = new WordList();
    clueDb = new Map();
  }

  addBuiltinWords(wl, clueDb);
  console.log(`Total words with clues: ${clueDb.size}`);

  cachedWl = wl;
  cachedClueDb = clueDb;
}

export function getFrenchWordList(): WordList {
  // Force sync load if not cached — the async load is called on first API hit
  if (!cachedWl) {
    // In dev, files are available synchronously
    const hasLocalFiles = existsSync(join(process.cwd(), "data", "french-clues-deduped.tsv"))
      || existsSync(join(process.cwd(), "data", "french-clues-dicomots.tsv"));
    if (hasLocalFiles) {
      const { wl, clueDb } = loadFromFiles();
      addBuiltinWords(wl, clueDb);
      cachedWl = wl;
      cachedClueDb = clueDb;
    }
  }
  return cachedWl!;
}

export function getFrenchClueDb(): Map<string, string[]> {
  if (!cachedClueDb) {
    getFrenchWordList(); // triggers sync load
  }
  return cachedClueDb!;
}

/**
 * Async initialization for production (database).
 * Call this once at startup in API routes.
 */
export async function ensureLoaded(): Promise<void> {
  if (cachedWl && cachedClueDb) return;
  await load();
}
