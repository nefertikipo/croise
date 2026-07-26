import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { ClueIdea } from "@/types/book";

/** A custom answer + clue pair as edited in the grid creators. */
export interface CustomClue {
  answer: string;
  clue: string;
}

/**
 * Append picked notepad ideas to a custom-clue list, skipping any whose
 * normalized answer is already present. Shared by the grid creator and the
 * grid-page properties panel so both dedupe identically.
 */
export function addPickedIdeas(prev: CustomClue[], picked: ClueIdea[]): CustomClue[] {
  const have = new Set(prev.map((c) => normalizeAnswer(c.answer)));
  const additions: CustomClue[] = [];
  for (const idea of picked) {
    const key = normalizeAnswer(idea.answer);
    if (have.has(key)) continue;
    have.add(key);
    additions.push({ answer: idea.answer, clue: idea.clue });
  }
  return additions.length > 0 ? [...prev, ...additions] : prev;
}
