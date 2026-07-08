"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { cn } from "@/lib/utils";

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Renders `text` at the largest font size (between `min` and `max`) that fits
 * its box without overflowing — measure-and-shrink, so a long clue is never
 * truncated, it just uses smaller type. Falls back to `min` (with the box
 * clipping) only when even the smallest size overflows.
 */
function FitText({
  text,
  max,
  min,
  lineRatio,
  italic,
}: {
  text: string;
  max: number;
  min: number;
  lineRatio: number;
  italic?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);

  useIsomorphicLayoutEffect(() => {
    const box = boxRef.current;
    const span = spanRef.current;
    if (!box || !span) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const maxH = box.clientHeight;
      const maxW = box.clientWidth;
      if (maxH <= 0 || maxW <= 0) return;

      const fits = (f: number) => {
        span.style.fontSize = `${f}px`;
        span.style.lineHeight = `${f * lineRatio}px`;
        return span.scrollHeight <= maxH + 0.5 && span.scrollWidth <= maxW + 0.5;
      };

      let best = min;
      if (fits(max)) {
        best = max; // common case: short clue, no shrinking needed
      } else {
        let lo = min;
        let hi = max;
        for (let i = 0; i < 18 && hi - lo > 0.25; i++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) {
            best = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }
      }
      // Apply directly (so it's correct even when `best` equals the current
      // state and setSize would otherwise bail) and sync React state.
      span.style.fontSize = `${best}px`;
      span.style.lineHeight = `${best * lineRatio}px`;
      setSize(best);
    };

    measure();
    // The condensed webfont loads asynchronously; the first measure may use a
    // fallback that wraps differently. Re-measure once fonts are ready.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(() => measure());

    return () => {
      cancelled = true;
    };
  }, [text, max, min, lineRatio]);

  return (
    // Absolute-fill the (relatively-positioned) band with explicit insets so the
    // box has a definite height to measure against — a percentage height would
    // collapse to one line and clip the text.
    <div
      ref={boxRef}
      className="absolute overflow-hidden"
      style={{ top: 2, left: 4, right: 3, bottom: 2 }}
    >
      <span
        ref={spanRef}
        className={cn(
          "block uppercase break-words hyphens-auto",
          italic && "italic opacity-40",
        )}
        style={{
          fontFamily: "var(--font-condensed), var(--font-sans), sans-serif",
          fontSize: `${size}px`,
          lineHeight: `${size * lineRatio}px`,
          wordBreak: "break-word",
        }}
      >
        {text}
      </span>
    </div>
  );
}

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
  /** Base color for clue cells; tinted toward paper. Defaults to turquoise. */
  accentColor?: string;
  /**
   * Black-and-white answer key: drops clue text and arrows, renders clue cells
   * as plain grey blocks and letters in black on white. Used for the printed
   * solution page (no color, no clues needed to check answers).
   */
  plain?: boolean;
}

const CELL_SIZE = 70;

/* Vintage editorial grid palette: paper letter cells, tinted clue cells,
   red-tinted custom clues — matching the cream/black/red/turquoise theme. */
const INK = "#2f2a26";
const PAPER = "#fffcf5";
const EMPTY_BG = "#ece3d3";
const DEFAULT_ACCENT = "#1f9e94";
const CUSTOM_BG = "#f3ddd4";

interface ArrowSpec {
  /** Clue cell row/col */
  r: number;
  c: number;
  /** Offset from the clue cell to the word's first letter (each 0 or 1) */
  dx: number;
  dy: number;
  /** Direction the word reads */
  flow: "right" | "down";
  /** 0..1 position along the anchored edge, so two arrows don't collide */
  band: number;
}

/**
 * A mots fléchés arrow, drawn in whole-grid pixel coordinates so it can sit ON
 * the border between the clue cell and the answer cell and point OUT into the
 * answer cell — the standard magazine look. The head lands just inside the cell
 * where the word's first letter is; the shaft bends (elbow) when the word
 * starts below or diagonally rather than straight ahead.
 *
 * The first letter is one of three neighbours of the clue cell:
 *   - right               (dx=1, dy=0)
 *   - directly below      (dx=0, dy=1)
 *   - diagonal down-right (dx=1, dy=1)
 * and reads "right" or "down" (flow).
 */
function GridArrow({
  r,
  c,
  dx,
  dy,
  flow,
  band,
  size,
  color,
}: ArrowSpec & { size: number; color: string }) {
  const S = size;
  const cx = c * S; // clue cell top-left in grid pixels
  const cy = r * S;
  const HEAD = 10; // arrowhead length
  const HALF = 6.5; // arrowhead half-width
  const rightN = dx === 1 && dy === 0;
  const belowN = dx === 0 && dy === 1;

  let pts: [number, number][];
  let tip: [number, number];
  let head: "right" | "down";

  // Every arrow's TAIL sits exactly on the clue-cell border; the body and head
  // extend OUT into the answer cell — never back into the clue cell.
  if (rightN && flow === "right") {
    // Tail on the right border → reads right in the next cell.
    const y = cy + band * S;
    const bx = cx + S;
    pts = [[bx, y], [bx + 18 - HEAD, y]];
    tip = [bx + 18, y];
    head = "right";
  } else if (belowN && flow === "down") {
    // Tail on the bottom border ↓ reads down in the cell below.
    const x = cx + band * S;
    const by = cy + S;
    pts = [[x, by], [x, by + 18 - HEAD]];
    tip = [x, by + 18];
    head = "down";
  } else if (belowN && flow === "right") {
    // Tail on the bottom border, drop into the cell below, then read right.
    const x = cx + S * 0.3;
    const by = cy + S;
    pts = [[x, by], [x, by + 13], [x + 16 - HEAD, by + 13]];
    tip = [x + 16, by + 13];
    head = "right";
  } else if (rightN && flow === "down") {
    // Tail on the right border, step into the next cell, then read down.
    const y = cy + S * 0.3;
    const bx = cx + S;
    pts = [[bx, y], [bx + 13, y], [bx + 13, y + 16 - HEAD]];
    tip = [bx + 13, y + 16];
    head = "down";
  } else if (flow === "right") {
    // Tail on the corner, diagonal into the down-right cell, then read right.
    pts = [[cx + S, cy + S], [cx + S + 21 - HEAD, cy + S + 9]];
    tip = [cx + S + 21, cy + S + 9];
    head = "right";
  } else {
    // Tail on the corner, diagonal into the down-right cell, then read down.
    pts = [[cx + S, cy + S], [cx + S + 9, cy + S + 21 - HEAD]];
    tip = [cx + S + 9, cy + S + 21];
    head = "down";
  }

  const [tx, ty] = tip;
  const headPts =
    head === "right"
      ? `${tx},${ty} ${tx - HEAD},${ty - HALF} ${tx - HEAD},${ty + HALF}`
      : `${tx},${ty} ${tx - HALF},${ty - HEAD} ${tx + HALF},${ty - HEAD}`;

  return (
    <>
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <polygon points={headPts} fill={color} />
    </>
  );
}

export function FlecheGrid({
  cells,
  width,
  height,
  showSolution = false,
  interactive = false,
  className,
  highlightedCells,
  accentColor,
  plain = false,
}: FlecheGridProps) {
  const accent = accentColor || DEFAULT_ACCENT;
  const clueBg = plain ? "#e9e6e0" : `color-mix(in oklab, ${accent} 18%, ${PAPER})`;
  const clueRule = `color-mix(in oklab, ${accent} 45%, ${PAPER})`;
  const wordHighlightBg = `color-mix(in oklab, ${accent} 14%, ${PAPER})`;
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

  // Collect every clue's arrow so they can be drawn in a single overlay that
  // sits ON TOP of the grid — letting each arrow start on its clue-cell border
  // and point OUT into the answer cell (the magazine convention).
  const arrows: ArrowSpec[] = [];
  for (let ar = 0; ar < cells.length; ar++) {
    for (let ac = 0; ac < cells[ar].length; ac++) {
      const acell = cells[ar][ac];
      if (acell.type !== "clue" || !acell.clues?.length) continue;
      const sorted = [...acell.clues].sort(
        (a, b) => (a.answerRow > ar ? 1 : 0) - (b.answerRow > ar ? 1 : 0),
      );
      sorted.forEach((cl, i) => {
        arrows.push({
          r: ar,
          c: ac,
          dx: cl.answerCol - ac,
          dy: cl.answerRow - ar,
          flow: cl.direction,
          band: sorted.length === 1 ? 0.5 : i === 0 ? 0.28 : 0.72,
        });
      });
    }
  }

  return (
    <div
      className={cn("relative inline-grid gap-0 border-2", className)}
      style={{
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
        borderColor: INK,
        color: INK,
      }}
    >
      {cells.flatMap((row, r) =>
        row.map((cell, c) => {
          if (cell.type === "clue") {
            // Answer key: clue cells carry no information, so render a plain
            // grey block (no clue text, no arrows) in black-and-white mode.
            if (plain) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="border"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: clueBg,
                    borderColor: "rgba(47,42,38,0.3)",
                  }}
                />
              );
            }
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
                className="relative border flex flex-col overflow-hidden"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: clueBg,
                  borderColor: clueRule,
                }}
              >
                {hasTwo && (
                  <div
                    className="absolute left-0 right-0 border-t"
                    style={{ top: "50%", borderColor: clueRule }}
                  />
                )}

                {clueTexts.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[8px] text-black/20">...</span>
                  </div>
                )}

                {clueTexts.map((cl, i) => (
                  <div
                    key={i}
                    className="relative flex-1 overflow-hidden"
                    style={{
                      backgroundColor: cl.isCustom ? CUSTOM_BG : undefined,
                    }}
                    title={cl.text}
                  >
                    <FitText
                      text={cl.text}
                      max={hasTwo ? 10 : 13}
                      min={5}
                      lineRatio={1.05}
                      italic={cl.text === cl.answer}
                    />
                  </div>
                ))}
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
              const bg =
                correct === true
                  ? "#e4efdb"
                  : correct === false && inputVal
                    ? "#f7ded5"
                    : isHiddenCell && !isSelected
                      ? "#f3ddd4"
                      : isHighlighted && !isSelected
                        ? wordHighlightBg
                        : PAPER;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative border flex items-center justify-center cursor-pointer",
                    isHiddenCell && "border-primary border-2",
                    isSelected && "ring-2 ring-primary z-10",
                  )}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: bg,
                    ...(isHiddenCell ? {} : { borderColor: "rgba(47,42,38,0.3)" }),
                  }}
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
                  isHiddenCell && (plain ? "border-2" : "border-primary border-2"),
                )}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: plain
                    ? "#ffffff"
                    : isHiddenCell
                      ? "#f3ddd4"
                      : PAPER,
                  borderColor: isHiddenCell
                    ? plain
                      ? "#2f2a26"
                      : undefined
                    : "rgba(47,42,38,0.3)",
                }}
              >
                {isHiddenCell && (
                  <span
                    className={cn(
                      "absolute top-0.5 left-1 text-[9px] font-bold",
                      plain ? "text-black" : "text-primary",
                    )}
                  >
                    {hiddenNum}
                  </span>
                )}
                {showSolution && cell.letter && (
                  <span className="text-xl font-bold uppercase">
                    {cell.letter}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={`${r}-${c}`}
              className="border"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: EMPTY_BG,
                borderColor: "rgba(47,42,38,0.1)",
              }}
            />
          );
        })
      )}

      {/* Arrow overlay: an absolutely-positioned child of the grid, so its
          coordinate origin is the grid's content box (cell 0,0 top-left) with
          no baseline/border offset. Drawn last → paints on top of the cells.
          Each arrow starts on its clue-cell border and points out. */}
      {!plain && (
        <svg
          className="absolute pointer-events-none"
          style={{ top: 0, left: 0, overflow: "visible" }}
          width={width * CELL_SIZE}
          height={height * CELL_SIZE}
          aria-hidden
        >
          {arrows.map((a, i) => (
            <GridArrow key={i} {...a} size={CELL_SIZE} color={INK} />
          ))}
        </svg>
      )}
    </div>
  );
}
