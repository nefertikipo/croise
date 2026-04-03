"use client";

import { cn } from "@/lib/utils";

interface WordInfo {
  answer: string;
  clue: string;
  direction: "across" | "down";
  number: number;
  startRow: number;
  startCol: number;
  length: number;
  isCustom: boolean;
}

interface GridDisplayProps {
  grid: string[];
  words: WordInfo[];
  showSolution?: boolean;
  highlightedWord?: number | null;
  onCellClick?: (row: number, col: number) => void;
  className?: string;
}

export function GridDisplay({
  grid,
  words,
  showSolution = false,
  highlightedWord,
  onCellClick,
  className,
}: GridDisplayProps) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  // Build a map of cell -> clue number
  const cellNumbers = new Map<string, number>();
  for (const word of words) {
    const key = `${word.startRow},${word.startCol}`;
    if (!cellNumbers.has(key) || word.number < cellNumbers.get(key)!) {
      cellNumbers.set(key, word.number);
    }
  }

  // Build a set of highlighted cells
  const highlightedCells = new Set<string>();
  if (highlightedWord !== null && highlightedWord !== undefined) {
    const word = words.find((w) => w.number === highlightedWord);
    if (word) {
      for (let i = 0; i < word.length; i++) {
        const r = word.direction === "across" ? word.startRow : word.startRow + i;
        const c = word.direction === "across" ? word.startCol + i : word.startCol;
        highlightedCells.add(`${r},${c}`);
      }
    }
  }

  return (
    <div
      className={cn("inline-grid gap-0 border-2 border-foreground", className)}
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, col) => {
          const char = grid[row]?.[col];
          const isBlack = char === "#";
          const cellKey = `${row},${col}`;
          const number = cellNumbers.get(cellKey);
          const isHighlighted = highlightedCells.has(cellKey);

          return (
            <div
              key={cellKey}
              className={cn(
                "relative border border-foreground/30 aspect-square flex items-center justify-center",
                "w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11",
                isBlack && "bg-foreground",
                !isBlack && "bg-background cursor-pointer",
                isHighlighted && "bg-primary/10"
              )}
              onClick={() => !isBlack && onCellClick?.(row, col)}
            >
              {!isBlack && number && (
                <span className="absolute top-0.5 left-0.5 text-[8px] sm:text-[9px] leading-none font-medium text-muted-foreground">
                  {number}
                </span>
              )}
              {!isBlack && showSolution && char && char !== "." && (
                <span className="text-sm sm:text-base font-bold uppercase">
                  {char}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
