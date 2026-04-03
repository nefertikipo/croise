"use client";

import { cn } from "@/lib/utils";

interface ClueInCell {
  text: string;
  direction: "right" | "down";
  answerLength: number;
  answer: string;
}

interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: ClueInCell[];
}

interface FlecheGridProps {
  cells: FlecheCell[][];
  width: number;
  height: number;
  showSolution?: boolean;
  className?: string;
}

const CELL_SIZE = 70;

export function FlecheGrid({
  cells,
  width,
  height,
  showSolution = false,
  className,
}: FlecheGridProps) {
  return (
    <div
      className={cn("inline-grid gap-0 border-2 border-black", className)}
      style={{
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {cells.flatMap((row, r) =>
        row.map((cell, c) => {
          if (cell.type === "clue") {
            const clueTexts = cell.clues ?? [];
            const hasTwo = clueTexts.length >= 2;
            return (
              <div
                key={`${r}-${c}`}
                className="relative border border-sky-300 flex flex-col overflow-hidden"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: "#dbeafe",
                }}
              >
                {clueTexts.map((cl, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-0.5 w-full px-1",
                      hasTwo ? "flex-1 py-0.5" : "flex-1 py-1",
                      hasTwo && i === 0 && "border-b border-sky-300"
                    )}
                  >
                    <span
                      className="leading-tight flex-1 text-black overflow-hidden"
                      style={{ fontSize: hasTwo ? "8px" : "9px" }}
                    >
                      {cl.text}
                    </span>
                    <span
                      className="font-bold shrink-0 text-black leading-none"
                      style={{ fontSize: hasTwo ? "10px" : "12px" }}
                    >
                      {cl.direction === "right" ? "→" : "↓"}
                    </span>
                  </div>
                ))}
                {clueTexts.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[9px] text-black/30">...</span>
                  </div>
                )}
              </div>
            );
          }

          if (cell.type === "letter") {
            return (
              <div
                key={`${r}-${c}`}
                className="bg-white border border-black/30 flex items-center justify-center"
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              >
                {showSolution && cell.letter && (
                  <span className="text-xl font-bold uppercase text-black">
                    {cell.letter}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={`${r}-${c}`}
              className="border border-black/10"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: "#f1f5f9",
              }}
            />
          );
        })
      )}
    </div>
  );
}
