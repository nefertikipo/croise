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

/** The opening-page credit: the line to print plus how many people signed.
 * A maker's typed signature prints VERBATIM — commas, "et", repeats, anything
 * appears exactly as entered. With none typed, fall back to the clue-idea
 * contributors, enumerated in French. */
export interface DedicationCredit {
  /** The signature line to print. */
  line: string;
  /** Number of signatories — drives the default "mon/notre amour" sign-off. */
  count: number;
}

export function dedicationCredit(
  signature: string | null | undefined,
  clueIdeas: ClueIdea[],
): DedicationCredit {
  const typed = signature?.trim();
  if (typed) return { line: typed, count: splitNames(typed).length };
  const names = bookAuthors(clueIdeas);
  return { line: formatAuthorList(names), count: names.length };
}

/** The default opening-page sign-off, keyed on how many people sign it:
 * "Avec tout notre amour," for a group, "Avec tout mon amour," when solo. */
export function defaultDedicationSignoff(count: number): string {
  return count > 1 ? "Avec tout notre amour," : "Avec tout mon amour,";
}

/** The sign-off line to print above the signature: the maker's explicit line
 * wins; otherwise the default keyed on the number of signatories. */
export function dedicationSignoffLine(
  signoff: string | null | undefined,
  count: number,
): string {
  return signoff?.trim() ? signoff.trim() : defaultDedicationSignoff(count);
}

/** French enumeration: "Alice", "Alice et Bob", "Alice, Bob et Carla". */
export function formatAuthorList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
