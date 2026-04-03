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

function ArrowTriangle({ direction, className }: { direction: "right" | "down"; className?: string }) {
  if (direction === "right") {
    return (
      <svg viewBox="0 0 10 10" className={cn("w-3 h-3 shrink-0", className)}>
        <polygon points="0,0 10,5 0,10" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" className={cn("w-3 h-3 shrink-0", className)}>
      <polygon points="0,0 10,0 5,10" fill="currentColor" />
    </svg>
  );
}

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

            if (hasTwo) {
              // Dual clue cell: diagonal split
              const rightClue = clueTexts.find((cl) => cl.direction === "right");
              const downClue = clueTexts.find((cl) => cl.direction === "down");

              return (
                <div
                  key={`${r}-${c}`}
                  className="relative border border-sky-300 overflow-hidden"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: "#dbeafe",
                  }}
                >
                  {/* Diagonal line */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${CELL_SIZE} ${CELL_SIZE}`}
                  >
                    <line
                      x1="0" y1="0"
                      x2={CELL_SIZE} y2={CELL_SIZE}
                      stroke="#93c5fd"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Top-right: down clue */}
                  {downClue && (
                    <div className="absolute top-0 right-0 w-[60%] h-[50%] flex flex-col items-end justify-start p-0.5">
                      <span
                        className={cn(
                          "leading-tight text-right",
                          downClue.text === downClue.answer ? "text-red-400 italic" : "text-black"
                        )}
                        style={{ fontSize: "7px" }}
                      >
                        {downClue.text}
                      </span>
                      <ArrowTriangle direction="down" className="text-black/70 mt-0.5" />
                    </div>
                  )}

                  {/* Bottom-left: right clue */}
                  {rightClue && (
                    <div className="absolute bottom-0 left-0 w-[60%] h-[50%] flex flex-col items-start justify-end p-0.5">
                      <span
                        className={cn(
                          "leading-tight",
                          rightClue.text === rightClue.answer ? "text-red-400 italic" : "text-black"
                        )}
                        style={{ fontSize: "7px" }}
                      >
                        {rightClue.text}
                      </span>
                      <ArrowTriangle direction="right" className="text-black/70 mt-0.5" />
                    </div>
                  )}
                </div>
              );
            }

            // Single clue cell
            const cl = clueTexts[0];
            return (
              <div
                key={`${r}-${c}`}
                className="relative border border-sky-300 flex flex-col items-start justify-center p-1 overflow-hidden"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: "#dbeafe",
                }}
              >
                {cl ? (
                  <div className="flex items-end gap-0.5 w-full">
                    <span
                      className={cn(
                        "leading-tight flex-1 overflow-hidden",
                        cl.text === cl.answer ? "text-red-400 italic" : "text-black"
                      )}
                      style={{ fontSize: "9px" }}
                    >
                      {cl.text}
                    </span>
                    <ArrowTriangle direction={cl.direction} className="text-black/70" />
                  </div>
                ) : (
                  <span className="text-[9px] text-black/20">...</span>
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
