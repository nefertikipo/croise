"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WordInfo {
  answer: string;
  clue: string;
  direction: "across" | "down";
  number: number;
  isCustom: boolean;
}

interface ClueListProps {
  words: WordInfo[];
  highlightedWord?: number | null;
  onClueClick?: (number: number) => void;
  onClueEdit?: (number: number, direction: string) => void;
  editable?: boolean;
}

export function ClueList({
  words,
  highlightedWord,
  onClueClick,
  onClueEdit,
  editable = false,
}: ClueListProps) {
  const acrossWords = words
    .filter((w) => w.direction === "across")
    .sort((a, b) => a.number - b.number);
  const downWords = words
    .filter((w) => w.direction === "down")
    .sort((a, b) => a.number - b.number);

  function renderClue(word: WordInfo) {
    return (
      <li
        key={`${word.direction}-${word.number}`}
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 rounded-sm cursor-pointer transition-colors",
          highlightedWord === word.number && "bg-primary/10"
        )}
        onClick={() => onClueClick?.(word.number)}
      >
        <span className="font-bold text-sm min-w-[2rem] text-right">
          {word.number}.
        </span>
        <span className="text-sm flex-1">{word.clue}</span>
        {word.isCustom && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            custom
          </Badge>
        )}
        {editable && !word.isCustom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClueEdit?.(word.number, word.direction);
            }}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            edit
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-bold text-base mb-2">Across</h3>
        <ul className="space-y-0.5">{acrossWords.map(renderClue)}</ul>
      </div>
      <div>
        <h3 className="font-bold text-base mb-2">Down</h3>
        <ul className="space-y-0.5">{downWords.map(renderClue)}</ul>
      </div>
    </div>
  );
}
