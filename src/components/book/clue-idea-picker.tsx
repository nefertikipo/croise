"use client";

import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { ClueIdea } from "@/types/book";

interface ClueIdeaPickerProps {
  ideas: ClueIdea[];
  /** Normalized custom answer → grid numbers, to flag ideas already placed somewhere. */
  usage: Map<string, number[]>;
  /** Normalized answers already in the current grid's custom list, to disable re-adding. */
  addedAnswers: Set<string>;
  onPick: (idea: ClueIdea) => void;
}

/**
 * Chips of the book's saved clue ideas, shown above the custom-words editor so
 * the maker can drop a jotted idea straight into this grid. Only ideas with an
 * answer are pickable (a grid needs a word to place). Ideas already added to this
 * grid are disabled; ideas used in other grids are still pickable but flagged.
 */
export function ClueIdeaPicker({ ideas, usage, addedAnswers, onPick }: ClueIdeaPickerProps) {
  const pickable = ideas.filter((idea) => idea.answer.trim().length >= 2);
  if (pickable.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        Depuis vos idées
      </p>
      <div className="flex flex-wrap gap-2">
        {pickable.map((idea) => {
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
}
