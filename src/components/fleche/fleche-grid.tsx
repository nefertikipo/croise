"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ClueInCell {
  text: string;
  direction: "right" | "down";
  answerRow: number;
  answerCol: number;
  answerLength: number;
  answer: string;
  isCustom?: boolean;
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
  interactive?: boolean;
  className?: string;
  /** Map of "row,col" -> position number for hidden word highlighting */
  highlightedCells?: Map<string, number>;
}

const CELL_SIZE = 70;

export function FlecheGrid({
  cells,
  width,
  height,
  showSolution = false,
  interactive = false,
  className,
  highlightedCells,
}: FlecheGridProps) {
  const [userInput, setUserInput] = useState<Map<string, string>>(new Map());
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<"right" | "down">("right");
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const setRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }, []);

  function handleCellClick(r: number, c: number) {
    if (!interactive) return;
    if (cells[r][c].type !== "letter") return;

    if (selectedCell?.r === r && selectedCell?.c === c) {
      // Toggle direction on second click
      setDirection((d) => (d === "right" ? "down" : "right"));
    } else {
      setSelectedCell({ r, c });
    }

    const key = `${r},${c}`;
    inputRefs.current.get(key)?.focus();
  }

  function handleKeyDown(r: number, c: number, e: React.KeyboardEvent) {
    if (!interactive) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const key = `${r},${c}`;
      const current = userInput.get(key);
      if (current) {
        // Clear current cell
        setUserInput((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        // Move back and clear
        const prevR = direction === "right" ? r : r - 1;
        const prevC = direction === "right" ? c - 1 : c;
        if (prevR >= 0 && prevC >= 0 && cells[prevR]?.[prevC]?.type === "letter") {
          const prevKey = `${prevR},${prevC}`;
          setUserInput((prev) => {
            const next = new Map(prev);
            next.delete(prevKey);
            return next;
          });
          setSelectedCell({ r: prevR, c: prevC });
          inputRefs.current.get(prevKey)?.focus();
        }
      }
      return;
    }

    if (e.key === "ArrowRight") { e.preventDefault(); moveTo(r, c + 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); moveTo(r, c - 1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveTo(r + 1, c); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); moveTo(r - 1, c); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      setDirection((d) => (d === "right" ? "down" : "right"));
      return;
    }

    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      const key = `${r},${c}`;
      setUserInput((prev) => {
        const next = new Map(prev);
        next.set(key, letter);
        return next;
      });
      // Move to next cell
      const nextR = direction === "right" ? r : r + 1;
      const nextC = direction === "right" ? c + 1 : c;
      moveTo(nextR, nextC);
    }
  }

  function moveTo(r: number, c: number) {
    // Find next letter cell in direction
    while (r >= 0 && r < height && c >= 0 && c < width) {
      if (cells[r][c].type === "letter") {
        setSelectedCell({ r, c });
        inputRefs.current.get(`${r},${c}`)?.focus();
        return;
      }
      return; // Hit a clue cell, stop
    }
  }

  // Check if a letter cell is correct
  function isCorrect(r: number, c: number): boolean | null {
    const key = `${r},${c}`;
    const input = userInput.get(key);
    if (!input) return null;
    return input === cells[r][c].letter;
  }

  // Get highlighted cells (same word as selected)
  const highlighted = new Set<string>();
  if (selectedCell && interactive) {
    const { r, c } = selectedCell;
    // Highlight in current direction
    // Go backward to find start
    let sr = r, sc = c;
    if (direction === "right") {
      while (sc > 0 && cells[sr][sc - 1].type === "letter") sc--;
    } else {
      while (sr > 0 && cells[sr - 1][sc].type === "letter") sr--;
    }
    // Go forward to highlight
    let cr = sr, cc = sc;
    while (cr < height && cc < width && cells[cr][cc].type === "letter") {
      highlighted.add(`${cr},${cc}`);
      if (direction === "right") cc++;
      else cr++;
    }
  }

  return (
    <div
      className={cn("inline-grid gap-0 border-2 border-black", className)}
      style={{
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {cells.flatMap((row, r) =>
        row.map((cell, c) => {
          if (cell.type === "clue") {
            // Sort clues: ► (right/same row) on top, ▼ (below) on bottom
            const clueTexts = [...(cell.clues ?? [])].sort((a, b) => {
              const aBelow = a.answerRow > r ? 1 : 0;
              const bBelow = b.answerRow > r ? 1 : 0;
              return aBelow - bBelow;
            });
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
                {hasTwo && (
                  <div
                    className="absolute left-0 right-0 border-t border-sky-400"
                    style={{ top: "50%" }}
                  />
                )}

                {clueTexts.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[8px] text-black/20">...</span>
                  </div>
                )}

                {clueTexts.map((cl, i) => {
                  const isPlaceholder = cl.text === cl.answer;
                  const isCustomClue = cl.isCustom;
                  // Arrow shows direction FROM clue cell TO answer start
                  const answerIsBelow = cl.answerRow > r;
                  const answerIsRight = cl.answerCol > c;
                  const arrow = answerIsBelow ? "▼" : answerIsRight ? "►" : "►";

                  const fontSize = hasTwo ? 7 : 9;
                  // Max lines that fit in the available height
                  const cellHalf = hasTwo ? CELL_SIZE / 2 : CELL_SIZE;
                  const lineHeight = fontSize * 1.2;
                  const maxLines = Math.floor((cellHalf - 4) / lineHeight);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative flex items-start gap-0.5 px-1 w-full",
                        hasTwo ? "flex-1" : "flex-1",
                      )}
                      style={{
                        paddingTop: 2,
                        paddingBottom: 1,
                        backgroundColor: isCustomClue ? "#fef3c7" : undefined,
                      }}
                    >
                      <span
                        className={cn(
                          "flex-1 uppercase break-words hyphens-auto",
                          isPlaceholder ? "text-red-400 italic" : "text-black"
                        )}
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: `${lineHeight}px`,
                          display: "-webkit-box",
                          WebkitLineClamp: maxLines,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {cl.text}
                      </span>
                      <span
                        className="font-bold shrink-0 text-black leading-none absolute bottom-0.5 right-0.5"
                        style={{ fontSize: hasTwo ? "9px" : "11px" }}
                      >
                        {arrow}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }

          if (cell.type === "letter") {
            const key = `${r},${c}`;
            const isSelected = selectedCell?.r === r && selectedCell?.c === c;
            const isHighlighted = highlighted.has(key);
            const inputVal = userInput.get(key) ?? "";
            const correct = isCorrect(r, c);
            const hiddenNum = highlightedCells?.get(key);
            const isHiddenCell = hiddenNum !== undefined;

            if (interactive) {
              return (
                <div
                  key={key}
                  className={cn(
                    "relative border flex items-center justify-center cursor-pointer",
                    isHiddenCell ? "border-primary border-2" : "border-black/30",
                    isSelected && "ring-2 ring-blue-500 z-10",
                    isHiddenCell && !isSelected && "bg-primary/10",
                    isHighlighted && !isSelected && !isHiddenCell && "bg-blue-50",
                    !isHighlighted && !isHiddenCell && "bg-white",
                    correct === true && "bg-green-50",
                    correct === false && inputVal && "bg-red-50"
                  )}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  onClick={() => handleCellClick(r, c)}
                >
                  {isHiddenCell && (
                    <span className="absolute top-0.5 left-1 text-[9px] font-bold text-primary">
                      {hiddenNum}
                    </span>
                  )}
                  <input
                    ref={(el) => setRef(key, el)}
                    className="absolute inset-0 w-full h-full text-center text-xl font-bold uppercase bg-transparent outline-none caret-transparent cursor-pointer"
                    value={inputVal}
                    onKeyDown={(e) => handleKeyDown(r, c, e)}
                    onChange={() => {}}
                    maxLength={1}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              );
            }

            return (
              <div
                key={key}
                className={cn(
                  "relative border flex items-center justify-center",
                  isHiddenCell ? "border-primary border-2 bg-primary/10" : "bg-white border-black/30",
                )}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              >
                {isHiddenCell && (
                  <span className="absolute top-0.5 left-1 text-[9px] font-bold text-primary">
                    {hiddenNum}
                  </span>
                )}
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
