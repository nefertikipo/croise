"use client";

import { recommendedCustomWords } from "@/lib/crossword/check-capacity";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { ClueIdea } from "@/types/book";

interface ClueIdeaPickerProps {
  ideas: ClueIdea[];
  /** Normalized custom answer → grid numbers, to flag ideas already placed somewhere. */
  usage: Map<string, number[]>;
  /** Normalized answers already in the current grid's custom list, to disable re-adding. */
  addedAnswers: Set<string>;
  /** Grid size — used to suggest a subset of a category that actually fits. */
  width: number;
  height: number;
  onPick: (idea: ClueIdea) => void;
  /** Add a suggested, grid-sized subset of a category (the themed-grid shortcut). */
  onPickMany: (ideas: ClueIdea[]) => void;
}

/** Chips with no category fall under this heading, kept last. */
const UNCATEGORIZED = "Autres";
/** The catch-all pool of inside jokes not tied to one group — used to top up a
 * thin themed suggestion so the grid stays full of *personal* words, not filler. */
const GENERAL = "Général";

/**
 * Chips of the book's saved clue ideas, shown above the custom-words editor so
 * the maker can drop a jotted idea straight into this grid. Only ideas with an
 * answer are pickable (a grid needs a word to place). Ideas already added to this
 * grid are disabled; ideas used in other grids are still pickable but flagged.
 *
 * Chips are grouped by category. A category usually holds more words than a grid
 * can fit, so each category offers a "Suggérer" button that adds only as many of
 * its unused words as this grid reliably holds (skipping any too long for it) —
 * a suggested themed fill, not a dump.
 */
export function ClueIdeaPicker({
  ideas,
  usage,
  addedAnswers,
  width,
  height,
  onPick,
  onPickMany,
}: ClueIdeaPickerProps) {
  const pickable = ideas.filter((idea) => idea.answer.trim().length >= 2);
  if (pickable.length === 0) return null;

  // How many more custom words this grid can reasonably take, and the longest
  // word it can hold at all.
  const remainingCapacity = Math.max(0, recommendedCustomWords(width, height) - addedAnswers.size);
  const maxDim = Math.max(width, height);

  // Group by category, blank → "Autres" (kept last).
  const groupOrder: string[] = [];
  const groups = new Map<string, ClueIdea[]>();
  for (const idea of pickable) {
    const key = idea.category?.trim() || UNCATEGORIZED;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(idea);
  }
  groupOrder.sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, "fr");
  });

  // Unused words that fit this grid, freshest first (words not yet placed in any
  // other grid come before ones reused elsewhere).
  function fittingUnused(list: ClueIdea[]): ClueIdea[] {
    return list
      .filter((idea) => {
        const key = normalizeAnswer(idea.answer);
        return !addedAnswers.has(key) && key.length <= maxDim;
      })
      .sort((a, b) => {
        const ua = usage.get(normalizeAnswer(a.answer))?.length ? 1 : 0;
        const ub = usage.get(normalizeAnswer(b.answer))?.length ? 1 : 0;
        return ua - ub;
      });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        Depuis vos idées
      </p>
      {groupOrder.map((groupKey) => {
        const groupIdeas = groups.get(groupKey)!;
        // Suggest this category's fitting words, then — for a thin themed category —
        // top up from the "Général" pool so the grid fills with personal words.
        const primary = fittingUnused(groupIdeas);
        const isThemed = groupKey !== GENERAL && groupKey !== UNCATEGORIZED;
        const chosen = new Set(primary.map((i) => i.id));
        const topUp =
          isThemed && primary.length < remainingCapacity
            ? fittingUnused(groups.get(GENERAL) ?? []).filter((i) => !chosen.has(i.id))
            : [];
        const suggestion = [...primary, ...topUp].slice(0, remainingCapacity);
        const themedInSuggestion = suggestion.filter((i) => chosen.has(i.id)).length;
        const fillerCount = suggestion.length - themedInSuggestion;
        return (
          <div key={groupKey} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                {groupKey}
              </span>
              {suggestion.length > 1 && (
                <button
                  type="button"
                  onClick={() => onPickMany(suggestion)}
                  title={
                    fillerCount > 0
                      ? `Ajoute ${themedInSuggestion} mot(s) « ${groupKey} » + ${fillerCount} de « ${GENERAL} » pour remplir la grille`
                      : `Ajoute ${suggestion.length} mot(s) de « ${groupKey} » qui tiennent dans cette grille`
                  }
                  className="rounded-none border-2 border-ink bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide hover:bg-accent"
                >
                  Suggérer ({suggestion.length}
                  {fillerCount > 0 ? ` · +${fillerCount} gén.` : ""})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {groupIdeas.map((idea) => {
                const key = normalizeAnswer(idea.answer);
                const added = addedAnswers.has(key);
                const usedElsewhere = !!usage.get(key)?.length;
                return (
                  <button
                    key={idea.id}
                    type="button"
                    disabled={added}
                    onClick={() => onPick(idea)}
                    title={idea.clue || undefined}
                    className={`rounded-none border-2 px-2 py-1 text-xs font-mono uppercase transition-colors ${
                      added
                        ? "cursor-not-allowed border-ink/15 bg-muted text-muted-foreground"
                        : "border-ink bg-white hover:bg-accent"
                    }`}
                  >
                    {added ? "✓ " : usedElsewhere ? "↺ " : "+ "}
                    {idea.answer.trim()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
