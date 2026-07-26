import { BOOK_MIN_GRIDS } from "@/lib/books/constants";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { CreateGridOptions } from "@/components/book/grid-creator";
import type { ClueIdea, GridDifficulty } from "@/types/book";

/**
 * Pure planning helpers for the guided book-creation wizard (/livre/nouveau).
 * The wizard collects a recipient, personal words, a hidden message and a
 * difficulty, then turns them into a list of per-grid generation options that
 * the book editor replays one request at a time (see the wizard pickup in
 * src/components/book/book-editor.tsx). Keep this file client-safe and free of
 * side effects.
 */

/** Default grid format for wizard-generated books (matches the A5 product default). */
const WIZARD_GRID_WIDTH = 11;
const WIZARD_GRID_HEIGHT = 17;

/**
 * Split a free-text hidden message into per-grid hidden words.
 *
 * Splits on whitespace, folds each word to the bare A-Z alphabet used by
 * hidden words everywhere else (accents folded, punctuation stripped,
 * uppercased — see `normalizeAnswer`), drops anything left empty, and caps the
 * result at `maxWords` (one hidden word per grid).
 */
export function splitHiddenMessage(message: string, maxWords: number): string[] {
  return message
    .split(/\s+/)
    .map((word) => normalizeAnswer(word))
    .filter((word) => word.length > 0)
    .slice(0, Math.max(0, maxWords));
}

/**
 * Round-robin the user's clue ideas across `gridCount` grids, in input order,
 * with at most `maxPerGrid` ideas per grid: idea 0 goes to grid 0, idea 1 to
 * grid 1, and so on, wrapping around until every grid holds `maxPerGrid`.
 *
 * `leftover` counts the ideas that did not fit; they are not lost — every idea
 * is also saved to the book's clue-idea notepad, from which the maker can drop
 * them into any grid later.
 */
export function distributeIdeas(
  ideas: ClueIdea[],
  gridCount: number,
  maxPerGrid = 3,
): { perGrid: { answer: string; clue: string }[][]; leftover: number } {
  const perGrid: { answer: string; clue: string }[][] = Array.from(
    { length: Math.max(0, gridCount) },
    () => [],
  );
  if (perGrid.length === 0) return { perGrid, leftover: ideas.length };

  const capacity = perGrid.length * Math.max(0, maxPerGrid);
  const placed = ideas.slice(0, capacity);
  placed.forEach((idea, i) => {
    perGrid[i % perGrid.length].push({
      answer: idea.answer.trim(),
      clue: idea.clue.trim(),
    });
  });
  return { perGrid, leftover: ideas.length - placed.length };
}

/**
 * Build the full generation plan for a wizard-created book: BOOK_MIN_GRIDS
 * single-grid requests at the default book format, each carrying its share of
 * the user's ideas (via `distributeIdeas`) and one word of the hidden message
 * (grids beyond the message's length simply have no hidden word).
 */
export function buildWizardPlan({
  ideas,
  messageWords,
  difficulty,
}: {
  ideas: ClueIdea[];
  messageWords: string[];
  difficulty: GridDifficulty;
}): CreateGridOptions[] {
  const { perGrid } = distributeIdeas(ideas, BOOK_MIN_GRIDS);
  return Array.from({ length: BOOK_MIN_GRIDS }, (_, i) => ({
    width: WIZARD_GRID_WIDTH,
    height: WIZARD_GRID_HEIGHT,
    count: 1,
    difficulty,
    customClues: perGrid[i] ?? [],
    hiddenWord: messageWords[i],
  }));
}
