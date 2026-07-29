import { normalizeAnswer } from "@/lib/crossword/normalize";

interface CustomClueInput {
  answer: string;
  clue: string;
}

/**
 * When generation fails with custom words, name the provably-hard ones (no
 * vowels, or very long) in a French hint the user can act on. Returns null when
 * no custom word stands out — callers fall back to their own generic message.
 * Shared by the /fleche generate route and the book grid routes so both surface
 * identical per-word hints.
 */
export function hardCustomWordsHint(customClues: CustomClueInput[]): string | null {
  const customWords = customClues
    .map((c) => normalizeAnswer(c.answer))
    .filter((a) => a.length >= 2);

  const hard = customWords.filter((w) => {
    const vowels = [...w].filter((c) => "AEIOUY".includes(c)).length;
    return vowels === 0 || w.length >= 10;
  });
  if (hard.length === 0) return null;
  return `Les mots ${hard.join(", ")} sont tres difficiles a placer (peu de voyelles ou tres long). Essayez de les retirer ou modifier.`;
}
