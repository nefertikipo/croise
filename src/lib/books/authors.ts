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
  return dedupeNames(clueIdeas.flatMap((idea) => splitNames(idea.author ?? "")));
}

/** Split one free-text names field into individual names ("Louise, Diane" →
 * ["Louise", "Diane"]). Handles commas, "&" and the French "et". */
export function splitNames(raw: string): string[] {
  return raw
    .split(/\s*,\s*|\s*&\s*|\s+et\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** De-duplicate names case-insensitively, keeping first-seen order. */
function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Parse a free-text credit field (e.g. the back-cover names) into a distinct
 * name list. Empty/whitespace input yields an empty list. */
export function parseNameList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return dedupeNames(splitNames(raw));
}

/** Names for the opening-page signature: the maker's explicit signature wins;
 * otherwise fall back to the clue-idea notepad contributors. */
export function dedicationSignatureNames(
  signature: string | null | undefined,
  clueIdeas: ClueIdea[],
): string[] {
  const override = parseNameList(signature);
  return override.length > 0 ? override : bookAuthors(clueIdeas);
}

/** French enumeration: "Alice", "Alice et Bob", "Alice, Bob et Carla". */
export function formatAuthorList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
