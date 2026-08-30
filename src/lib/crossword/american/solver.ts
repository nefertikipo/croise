// =============================================================================
// american/solver.ts — CSP autofill for American crossword grids
// =============================================================================
// Backtracking with MRV slot ordering, forward checking, and score-weighted
// candidate selection (the community-standard fill approach — see
// docs/american-crossword-design.md). Consumes the generic `WordList`; it does
// NOT touch the mots fléchés engine.
//
// Custom / theme words are handled by pre-assigning them to slots before the
// search starts (see `preassigned`); the solver treats those as fixed and fills
// everything around them — the same mechanism American constructors use to seat
// theme entries before autofill.
// =============================================================================

import type { WordList } from "../word-list";
import type { AmSlot, AmCrossing } from "./types";

export interface SolveInput {
  slots: AmSlot[];
  crossings: AmCrossing[];
  wordList: WordList;
  /** slotId → word, fixed before search (custom/theme entries). */
  preassigned?: Map<number, string>;
  /** Wall-clock budget for one solve attempt. Default 4000ms. */
  timeBudgetMs?: number;
  /**
   * Efraimidis–Spirakis weight exponent on the word's known-score (1–5). Higher
   * = stronger bias toward recognizable words. 2.0 is empirically best in the
   * fléchés engine (cuts obscure fill without hurting solvability). 0 = uniform.
   */
  bias?: number;
  /**
   * Length-aware recognizability floor: in slots at least this long, keep only
   * words with known-score >= `floorMinKnown`. 3-letter slots are left unfloored
   * (short crosswordese is largely unavoidable). Default len 4.
   */
  floorMinLen?: number;
  /** Minimum known-score kept in slots >= floorMinLen. Default 2 (drops score-1). */
  floorMinKnown?: number;
  /** Max candidate branches to try per slot (bounds worst-case). Default 250. */
  maxBranch?: number;
}

interface Neighbor {
  pos: number; // position within this slot
  other: number; // crossing slot id
  otherPos: number; // position within the other slot
}

/**
 * Try to fill the grid once. Returns null if it can't within the time budget.
 * Uses Math.random for candidate ordering, so repeated calls explore differently
 * (the caller does random-restart on failure).
 */
export function solveFill(input: SolveInput): Map<number, string> | null {
  const {
    slots,
    crossings,
    wordList,
    preassigned,
    timeBudgetMs = 4000,
    bias = 2.0,
    floorMinLen = 4,
    floorMinKnown = 2,
    maxBranch = 250,
  } = input;

  /** Length-aware recognizability floor (matches the fléchés engine). */
  const passesFloor = (length: number, word: string) =>
    length < floorMinLen || wordList.getScore(word) >= floorMinKnown;

  const maxId = slots.reduce((m, s) => Math.max(m, s.id), -1);
  const byId: (AmSlot | undefined)[] = new Array(maxId + 1);
  for (const s of slots) byId[s.id] = s;

  // Adjacency: for each slot, the crossing positions into its neighbours.
  const neighbors: Neighbor[][] = Array.from({ length: maxId + 1 }, () => []);
  for (const c of crossings) {
    neighbors[c.a].push({ pos: c.ai, other: c.b, otherPos: c.bi });
    neighbors[c.b].push({ pos: c.bi, other: c.a, otherPos: c.ai });
  }

  const assignment: (string | null)[] = new Array(maxId + 1).fill(null);
  const used = new Set<string>();

  // Seat preassigned (custom/theme) words as fixed.
  if (preassigned) {
    for (const [id, word] of preassigned) {
      assignment[id] = word;
      used.add(word);
    }
  }

  /** The letters forced on `slotId` by already-assigned crossing slots. */
  function constraintLetters(slotId: number): (string | null)[] {
    const slot = byId[slotId]!;
    const letters: (string | null)[] = new Array(slot.length).fill(null);
    for (const nb of neighbors[slotId]) {
      const w = assignment[nb.other];
      if (w) letters[nb.pos] = w[nb.otherPos];
    }
    return letters;
  }

  /** Candidate words for a slot given current crossing constraints. */
  function candidates(slotId: number): string[] {
    const slot = byId[slotId]!;
    const cons = constraintLetters(slotId);
    const fixed: { l: string; i: number }[] = [];
    for (let i = 0; i < cons.length; i++) if (cons[i]) fixed.push({ l: cons[i]!, i });

    let pool: string[];
    if (fixed.length === 0) {
      pool = wordList.getByLength(slot.length).map((e) => e.word);
    } else {
      // Start from the smallest indexed bucket, then filter by the rest.
      let best: string[] | null = null;
      for (const { l, i } of fixed) {
        const b = wordList.getByConstraint(slot.length, i, l);
        if (best === null || b.length < best.length) best = b;
      }
      pool = best!.filter((w) => fixed.every(({ l, i }) => w[i] === l));
    }
    return pool.filter((w) => !used.has(w) && passesFloor(slot.length, w));
  }

  /** Cheap domain-size estimate for MRV (avoids materializing huge buckets). */
  function domainSize(slotId: number): number {
    const slot = byId[slotId]!;
    const cons = constraintLetters(slotId);
    const fixed: { l: string; i: number }[] = [];
    for (let i = 0; i < cons.length; i++) if (cons[i]) fixed.push({ l: cons[i]!, i });
    if (fixed.length === 0) {
      if (slot.length < floorMinLen) return wordList.getByLength(slot.length).length;
      let count = 0;
      for (const e of wordList.getByLength(slot.length))
        if (passesFloor(slot.length, e.word)) count++;
      return count;
    }
    let best: string[] | null = null;
    for (const { l, i } of fixed) {
      const b = wordList.getByConstraint(slot.length, i, l);
      if (best === null || b.length < best.length) best = b;
    }
    let count = 0;
    for (const w of best!) {
      if (used.has(w)) continue;
      if (!passesFloor(slot.length, w)) continue;
      if (fixed.every(({ l, i }) => w[i] === l)) count++;
    }
    return count;
  }

  /**
   * Weighted-random ordering (Efraimidis–Spirakis): higher known-score → earlier,
   * more often, but every word stays reachable on backtrack so grids still solve.
   * Same key form as the fléchés engine: rand ^ (1 / (score·bias + 1)).
   */
  function order(words: string[]): string[] {
    if (words.length <= 1) return words;
    const keyed =
      bias > 0
        ? words.map((w) => ({
            w,
            key: Math.pow(Math.random(), 1 / (wordList.getScore(w) * bias + 1)),
          }))
        : words.map((w) => ({ w, key: Math.random() }));
    keyed.sort((a, b) => b.key - a.key);
    const out = keyed.map((k) => k.w);
    return out.length > maxBranch ? out.slice(0, maxBranch) : out;
  }

  const deadline = Date.now() + timeBudgetMs;
  const total = slots.length;

  function search(assignedCount: number): boolean {
    if (assignedCount === total) return true;
    if (Date.now() > deadline) return false;

    // MRV: unassigned slot with the smallest domain.
    let pick = -1;
    let pickSize = Infinity;
    for (const s of slots) {
      if (assignment[s.id] !== null) continue;
      const size = domainSize(s.id);
      if (size === 0) return false; // dead end, prune whole branch
      if (size < pickSize) {
        pickSize = size;
        pick = s.id;
        if (size === 1) break;
      }
    }
    if (pick === -1) return true;

    for (const w of order(candidates(pick))) {
      if (Date.now() > deadline) return false;
      assignment[pick] = w;
      used.add(w);

      // Forward check: every unassigned neighbour must still be fillable.
      let ok = true;
      for (const nb of neighbors[pick]) {
        if (assignment[nb.other] === null && domainSize(nb.other) === 0) {
          ok = false;
          break;
        }
      }
      if (ok && search(assignedCount + 1)) return true;

      assignment[pick] = null;
      used.delete(w);
    }
    return false;
  }

  const preCount = preassigned ? preassigned.size : 0;
  if (!search(preCount)) return null;

  const assignment2 = new Map<number, string>();
  for (const s of slots) assignment2.set(s.id, assignment[s.id]!);
  return assignment2;
}
