// =============================================================================
// american/generate.ts — orchestrator: template → custom words → fill → clues
// =============================================================================
// Pipeline (see docs/american-crossword-design.md):
//   1. pick a validated symmetric template (by size / custom-word fit)
//   2. best-effort place custom (theme) words into matching slots, symmetric
//      pairs preferred; leftovers become ordinary fill
//   3. autofill the rest with the CSP solver (random-restart on failure)
//   4. attach clues from the French corpus (custom words keep their own clue)
// =============================================================================

import type { WordList } from "../word-list";
import { normalizeAnswer, normalizeClueText } from "../normalize";
import { clueDiffKey } from "../load-french-clues";
import { analyzeGrid, type GridStructure } from "./slots";
import { solveFill } from "./solver";
import {
  getTemplate,
  themeTemplateFor,
  MAX_THEME_LENGTH,
  TEMPLATES_BY_SIZE,
  type GridTemplate,
} from "./grid-templates";
import type { AmCell, AmClue, AmPuzzle, AmSlot } from "./types";

export type AmDifficulty = "facile" | "moyen" | "difficile" | "balanced";

export interface AmGenParams {
  /** Explicit template id, else chosen by size. */
  templateId?: string;
  /** Preferred grid size (max dimension) when no templateId. Default 11. */
  size?: number;
  customClues?: { answer: string; clue: string }[];
  difficulty?: AmDifficulty;
  /** Total wall-clock budget across restarts. Default 8000ms. */
  timeBudgetMs?: number;
}

export interface AmGenResult {
  success: boolean;
  puzzle?: AmPuzzle;
  /** Custom answers we couldn't seat in this template (best-effort placement). */
  unplacedCustom: string[];
  attempts: number;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â",
  ccedil: "ç", ugrave: "ù", ucirc: "û", icirc: "î", iuml: "ï", ocirc: "ô",
  oelig: "œ", laquo: "«", raquo: "»", deg: "°",
};

/** Decode HTML entities left in scraped clue text (&#39; &eacute; &amp; …). */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? m;
  });
}

const DIFF_TARGET: Record<AmDifficulty, number | null> = {
  facile: 1,
  moyen: 2,
  difficile: 3,
  balanced: null,
};

/**
 * Choose a template. If the custom words include a long one (>= 6 letters — too
 * long for the plain short-word grids), pick the theme template whose long-slot
 * pair matches the LONGEST custom word, so that word has somewhere to go.
 * Otherwise pick a plain template by requested size.
 */
function pickTemplate(params: AmGenParams, customAnswers: string[]): GridTemplate {
  // A long custom word (>= 6) can't fit the plain short-word grids, so the theme
  // template need OVERRIDES an explicitly requested size — otherwise the word
  // would go unplaced.
  const longest = customAnswers.reduce((m, a) => Math.max(m, a.length), 0);
  if (longest >= 6) {
    const t = themeTemplateFor(Math.min(longest, MAX_THEME_LENGTH));
    if (t) return t;
  }
  if (params.templateId) {
    const t = getTemplate(params.templateId);
    if (t) return t;
  }
  const size = params.size ?? 11;
  return (
    TEMPLATES_BY_SIZE.find((t) => Math.max(t.width, t.height) >= size) ??
    TEMPLATES_BY_SIZE[TEMPLATES_BY_SIZE.length - 1]
  );
}

/** The 180°-rotation partner slot of `slot`, if one exists (same direction). */
function symmetricPartner(slot: AmSlot, s: GridStructure): number | null {
  const rot = slot.cells
    .map((c) => `${s.width - 1 - c.x},${s.height - 1 - c.y}`)
    .reverse()
    .join("|");
  for (const other of s.slots) {
    if (other.id === slot.id || other.direction !== slot.direction) continue;
    if (other.length !== slot.length) continue;
    const key = other.cells.map((c) => `${c.x},${c.y}`).join("|");
    if (key === rot) return other.id;
  }
  return null;
}

/**
 * Best-effort custom-word placement. Places each custom answer into an unused
 * slot of matching length that does not cross another placed custom word (keeps
 * the preassignment trivially crossing-consistent). Equal-length words are
 * steered into symmetric slot pairs first. Returns the preassignment + leftovers.
 */
function placeCustomWords(
  s: GridStructure,
  answers: string[],
): { preassigned: Map<number, string>; unplaced: string[] } {
  const preassigned = new Map<number, string>();
  const usedSlots = new Set<number>();
  const usedCells = new Set<string>();
  const unplaced: string[] = [];

  const cellsFree = (slot: AmSlot) =>
    slot.cells.every((c) => !usedCells.has(`${c.x},${c.y}`));
  const claim = (slot: AmSlot, word: string) => {
    preassigned.set(slot.id, word);
    usedSlots.add(slot.id);
    for (const c of slot.cells) usedCells.add(`${c.x},${c.y}`);
  };

  // Group answers by length so we can pair equal-length ones symmetrically.
  const byLen = new Map<number, string[]>();
  for (const a of answers) {
    if (!byLen.has(a.length)) byLen.set(a.length, []);
    byLen.get(a.length)!.push(a);
  }

  for (const [len, words] of byLen) {
    const slotsOfLen = s.slots.filter((sl) => sl.length === len);
    let wi = 0;

    // First pass: fill symmetric pairs with pairs of words.
    for (const slot of slotsOfLen) {
      if (wi + 1 >= words.length) break;
      if (usedSlots.has(slot.id) || !cellsFree(slot)) continue;
      const partnerId = symmetricPartner(slot, s);
      if (partnerId === null) continue;
      const partner = s.slots.find((x) => x.id === partnerId)!;
      if (usedSlots.has(partner.id) || !cellsFree(partner)) continue;
      claim(slot, words[wi++]);
      claim(partner, words[wi++]);
    }

    // Second pass: place any remaining words in any free slot of this length.
    for (; wi < words.length; wi++) {
      const slot = slotsOfLen.find(
        (sl) => !usedSlots.has(sl.id) && cellsFree(sl),
      );
      if (slot) claim(slot, words[wi]);
      else unplaced.push(words[wi]);
    }
  }

  return { preassigned, unplaced };
}

/** Choose a clue for a filled (non-custom) word, honoring the difficulty target. */
function chooseClue(
  word: string,
  clueDb: Map<string, string[]>,
  clueDiff: Map<string, number>,
  target: number | null,
): { text: string; difficulty: number | null } {
  const options = clueDb.get(word) ?? [];
  const usable = options.filter(
    (c) => c && !c.toUpperCase().includes(word), // avoid self-referential
  );
  if (usable.length === 0) {
    return { text: "(définition à compléter)", difficulty: null };
  }
  const scored = usable.map((c) => ({
    c,
    d: clueDiff.get(clueDiffKey(word, c)) ?? 2,
  }));
  let pool = scored;
  if (target !== null) {
    const matches = scored.filter((x) => x.d === target);
    if (matches.length > 0) pool = matches;
  }
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return { text: normalizeClueText(decodeEntities(chosen.c)), difficulty: chosen.d };
}

export function generateAmerican(
  params: AmGenParams,
  wordList: WordList,
  clueDb: Map<string, string[]>,
  clueDiff: Map<string, number>,
): AmGenResult {
  const customPairs = (params.customClues ?? [])
    .map((c) => ({ answer: normalizeAnswer(c.answer), clue: c.clue }))
    .filter((c) => c.answer.length >= 3);
  const customClueByAnswer = new Map(customPairs.map((c) => [c.answer, c.clue]));

  const template = pickTemplate(
    params,
    customPairs.map((c) => c.answer),
  );
  const structure = analyzeGrid(template.blocks);

  const { preassigned, unplaced } = placeCustomWords(
    structure,
    customPairs.map((c) => c.answer),
  );

  // Inject custom answers into the word list so the solver can cross into them
  // (and they can be reused as fill if they also appear naturally). Removed after.
  const injected: string[] = [];
  for (const a of customClueByAnswer.keys()) {
    if (!wordList.has(a)) {
      wordList.addWord(a, 5); // max known-score (1–5); custom words are "assets"
      injected.push(a);
    }
  }

  const deadline = Date.now() + (params.timeBudgetMs ?? 8000);
  let solution: Map<number, string> | null = null;
  let attempts = 0;
  try {
    while (Date.now() < deadline && !solution) {
      attempts++;
      solution = solveFill({
        slots: structure.slots,
        crossings: structure.crossings,
        wordList,
        preassigned,
        timeBudgetMs: Math.min(4000, deadline - Date.now()),
      });
    }
  } finally {
    for (const a of injected) wordList.removeWord(a);
  }

  if (!solution) {
    return { success: false, unplacedCustom: unplaced, attempts };
  }

  // --- Build the cell grid with letters + numbers.
  const cells: AmCell[][] = [];
  for (let y = 0; y < structure.height; y++) {
    const row: AmCell[] = [];
    for (let x = 0; x < structure.width; x++) {
      if (template.blocks[y][x]) row.push({ kind: "block" });
      else row.push({ kind: "letter", letter: "", number: structure.numbers[y][x] });
    }
    cells.push(row);
  }
  for (const slot of structure.slots) {
    const word = solution.get(slot.id)!;
    slot.cells.forEach((c, i) => {
      const cell = cells[c.y][c.x];
      if (cell.kind === "letter") cell.letter = word[i];
    });
  }

  // --- Build the two clue lists.
  const target = DIFF_TARGET[params.difficulty ?? "balanced"];
  const across: AmClue[] = [];
  const down: AmClue[] = [];
  for (const slot of structure.slots) {
    const word = solution.get(slot.id)!;
    const isCustom = customClueByAnswer.has(word);
    const { text, difficulty } = isCustom
      ? { text: normalizeClueText(decodeEntities(customClueByAnswer.get(word)!)), difficulty: null }
      : chooseClue(word, clueDb, clueDiff, target);
    const clue: AmClue = {
      number: slot.number,
      direction: slot.direction,
      clue: text,
      answer: word,
      isCustom,
      row: slot.cells[0].y,
      col: slot.cells[0].x,
      length: slot.length,
      difficulty,
    };
    (slot.direction === "across" ? across : down).push(clue);
  }
  across.sort((a, b) => a.number - b.number);
  down.sort((a, b) => a.number - b.number);

  return {
    success: true,
    puzzle: { width: structure.width, height: structure.height, cells, across, down },
    unplacedCustom: unplaced,
    attempts,
  };
}
