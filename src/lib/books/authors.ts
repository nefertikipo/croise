/**
 * Contributors of a book: the distinct people credited on the clue-idea notepad
 * (`ClueIdea.author`). A group gift is crowdsourced, so these are the friends
 * behind the jokes — surfaced as a printed credit on the opening page.
 */

import type { ClueIdea } from "@/types/book";

/** Distinct, trimmed contributor names, in first-seen order (case-insensitive).
 * A single author field may name several people ("Louise, Diane", "Théo & Max"),
 * so each is split into individual credits before de-duplicating. */
export function bookAuthors(clueIdeas: ClueIdea[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const idea of clueIdeas) {
    const raw = idea.author?.trim();
    if (!raw) continue;
    for (const part of raw.split(/\s*,\s*|\s*&\s*|\s+et\s+/i)) {
      const name = part.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase("fr");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

/** French enumeration: "Alice", "Alice et Bob", "Alice, Bob et Carla". */
export function formatAuthorList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
