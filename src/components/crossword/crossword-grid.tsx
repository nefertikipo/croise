"use client";

// =============================================================================
// crossword-grid.tsx — American-style crossword solving UI
// =============================================================================
// Numbered white cells + black blocks + two linked Across/Down clue lists.
// Standard crossword interaction: click/type to fill, direction toggle, current-
// word highlight, arrow navigation, optional autocheck, reveal word / puzzle.
// Self-contained; does not depend on the mots fléchés renderer.
// =============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import type { AmPuzzle, AmClue, Direction } from "@/lib/crossword/american/types";

interface CellPos {
  r: number;
  c: number;
}

interface CellMeta {
  block: boolean;
  number: number | null;
  solution: string;
  acrossNumber: number | null;
  downNumber: number | null;
}

const key = (r: number, c: number) => `${r},${c}`;

export function CrosswordGrid({ puzzle }: { puzzle: AmPuzzle }) {
  const { width, height } = puzzle;

  // --- Static grid model derived from the puzzle.
  const { meta, clueCells, cluesByNumber } = useMemo(() => {
    const meta: CellMeta[][] = puzzle.cells.map((row) =>
      row.map((cell) =>
        cell.kind === "block"
          ? { block: true, number: null, solution: "", acrossNumber: null, downNumber: null }
          : {
              block: false,
              number: cell.number,
              solution: cell.letter.toUpperCase(),
              acrossNumber: null,
              downNumber: null,
            },
      ),
    );

    const clueCells = new Map<string, CellPos[]>(); // `${dir}:${number}` → cells
    const cluesByNumber = new Map<string, AmClue>();
    const register = (clue: AmClue) => {
      cluesByNumber.set(`${clue.direction}:${clue.number}`, clue);
      const cells: CellPos[] = [];
      for (let i = 0; i < clue.length; i++) {
        const r = clue.direction === "down" ? clue.row + i : clue.row;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        cells.push({ r, c });
        if (clue.direction === "across") meta[r][c].acrossNumber = clue.number;
        else meta[r][c].downNumber = clue.number;
      }
      clueCells.set(`${clue.direction}:${clue.number}`, cells);
    };
    puzzle.across.forEach(register);
    puzzle.down.forEach(register);
    return { meta, clueCells, cluesByNumber };
  }, [puzzle]);

  // --- Solve state.
  const [input, setInput] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<CellPos>(() => {
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++) if (!meta[r][c].block) return { r, c };
    return { r: 0, c: 0 };
  });
  const [direction, setDirection] = useState<Direction>("across");
  const [autocheck, setAutocheck] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentClueNumber =
    direction === "across"
      ? meta[selected.r][selected.c].acrossNumber
      : meta[selected.r][selected.c].downNumber;
  const currentClue = currentClueNumber
    ? cluesByNumber.get(`${direction}:${currentClueNumber}`)
    : undefined;
  const currentCells = currentClueNumber
    ? clueCells.get(`${direction}:${currentClueNumber}`) ?? []
    : [];
  const currentSet = new Set(currentCells.map((p) => key(p.r, p.c)));

  const setLetter = useCallback((r: number, c: number, letter: string) => {
    setInput((prev) => {
      const next = new Map(prev);
      if (letter) next.set(key(r, c), letter);
      else next.delete(key(r, c));
      return next;
    });
  }, []);

  const focusGrid = () => containerRef.current?.focus();

  const selectCell = (r: number, c: number) => {
    if (meta[r][c].block) return;
    if (selected.r === r && selected.c === c) {
      // toggle direction if the cell supports both
      const other = direction === "across" ? "down" : "across";
      const hasOther = other === "across" ? meta[r][c].acrossNumber : meta[r][c].downNumber;
      if (hasOther) setDirection(other);
    } else {
      setSelected({ r, c });
      const hasDir = direction === "across" ? meta[r][c].acrossNumber : meta[r][c].downNumber;
      if (!hasDir) setDirection(direction === "across" ? "down" : "across");
    }
    focusGrid();
  };

  const step = (dir: Direction, back: boolean): CellPos => {
    const dr = dir === "down" ? (back ? -1 : 1) : 0;
    const dc = dir === "across" ? (back ? -1 : 1) : 0;
    let { r, c } = selected;
    for (let i = 0; i < Math.max(width, height); i++) {
      r += dr;
      c += dc;
      if (r < 0 || c < 0 || r >= height || c >= width) break;
      if (!meta[r][c].block) return { r, c };
    }
    return selected;
  };

  const moveWithinWord = (back: boolean): CellPos => {
    const idx = currentCells.findIndex((p) => p.r === selected.r && p.c === selected.c);
    if (idx === -1) return selected;
    const nextIdx = back ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= currentCells.length) return selected;
    return currentCells[nextIdx];
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { r, c } = selected;
    if (meta[r][c].block) return;

    if (/^[a-zA-ZàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase();
      setLetter(r, c, letter);
      setSelected(moveWithinWord(false));
      return;
    }
    switch (e.key) {
      case "Backspace": {
        e.preventDefault();
        if (input.get(key(r, c))) setLetter(r, c, "");
        else {
          const prev = moveWithinWord(true);
          setSelected(prev);
          setLetter(prev.r, prev.c, "");
        }
        break;
      }
      case "Delete":
        e.preventDefault();
        setLetter(r, c, "");
        break;
      case "ArrowRight":
        e.preventDefault();
        if (direction !== "across") setDirection("across");
        else setSelected(step("across", false));
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (direction !== "across") setDirection("across");
        else setSelected(step("across", true));
        break;
      case "ArrowDown":
        e.preventDefault();
        if (direction !== "down") setDirection("down");
        else setSelected(step("down", false));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (direction !== "down") setDirection("down");
        else setSelected(step("down", true));
        break;
      case " ":
      case "Tab":
        e.preventDefault();
        setDirection((d) => (d === "across" ? "down" : "across"));
        break;
    }
  };

  const revealWord = () => {
    for (const p of currentCells) setLetter(p.r, p.c, meta[p.r][p.c].solution);
  };
  const revealPuzzle = () => {
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++)
        if (!meta[r][c].block) setLetter(r, c, meta[r][c].solution);
  };
  const clearAll = () => setInput(new Map());

  // --- Completion.
  const { filled, correct, total } = useMemo(() => {
    let filled = 0;
    let correct = 0;
    let total = 0;
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++) {
        if (meta[r][c].block) continue;
        total++;
        const v = input.get(key(r, c));
        if (v) {
          filled++;
          if (v === meta[r][c].solution) correct++;
        }
      }
    return { filled, correct, total };
  }, [input, meta, height, width]);
  const solved = filled === total && correct === total;

  const cellPx = width <= 9 ? 42 : width <= 13 ? 36 : 32;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Grid */}
      <div className="flex flex-col gap-3">
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="inline-grid select-none border-2 border-ink outline-none"
          style={{ gridTemplateColumns: `repeat(${width}, ${cellPx}px)` }}
        >
          {puzzle.cells.map((row, r) =>
            row.map((cell, c) => {
              if (cell.kind === "block") {
                return (
                  <div
                    key={key(r, c)}
                    className="bg-ink"
                    style={{ width: cellPx, height: cellPx }}
                  />
                );
              }
              const v = input.get(key(r, c)) ?? "";
              const isSelected = selected.r === r && selected.c === c;
              const inWord = currentSet.has(key(r, c));
              const wrong = autocheck && v && v !== meta[r][c].solution;
              const right = autocheck && v && v === meta[r][c].solution;
              return (
                <div
                  key={key(r, c)}
                  onClick={() => selectCell(r, c)}
                  className={[
                    "relative flex items-center justify-center border border-ink/20 text-lg font-semibold uppercase",
                    isSelected
                      ? "z-10 bg-[#d7e3f5] ring-2 ring-brand"
                      : inWord
                        ? "bg-brand/10"
                        : "bg-[#fffcf5]",
                    wrong ? "text-[#b3261e]" : right ? "text-[#2f6b4a]" : "text-ink",
                  ].join(" ")}
                  style={{ width: cellPx, height: cellPx }}
                >
                  {cell.number != null && (
                    <span className="absolute left-0.5 top-0 text-[9px] font-normal leading-none text-ink/50">
                      {cell.number}
                    </span>
                  )}
                  {wrong && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-full w-px rotate-45 bg-[#b3261e]/50" />
                    </span>
                  )}
                  {v}
                </div>
              );
            }),
          )}
        </div>

        {/* Current-clue bar */}
        {currentClue && (
          <div className="rounded-none border-2 border-ink/15 bg-accent/40 px-3 py-2 text-sm text-ink">
            <span className="font-display uppercase tracking-wide text-brand">
              {currentClue.number} {direction === "across" ? "Horizontal" : "Vertical"}.
            </span>{" "}
            {currentClue.clue}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={autocheck}
              onChange={(e) => setAutocheck(e.target.checked)}
              className="accent-brand"
            />
            Vérification auto
          </label>
          <button
            onClick={revealWord}
            className="rounded-none border-2 border-ink/20 bg-paper px-2 py-1 text-ink hover:bg-accent/40"
          >
            Révéler le mot
          </button>
          <button
            onClick={revealPuzzle}
            className="rounded-none border-2 border-ink/20 bg-paper px-2 py-1 text-ink hover:bg-accent/40"
          >
            Tout révéler
          </button>
          <button
            onClick={clearAll}
            className="rounded-none border-2 border-ink/20 bg-paper px-2 py-1 text-ink hover:bg-accent/40"
          >
            Effacer
          </button>
          <span
            className={
              solved
                ? "font-display uppercase tracking-wide text-brand"
                : "font-display text-xs uppercase tracking-wide text-ink/50"
            }
          >
            {solved ? "✓ Grille complète !" : `${filled}/${total}`}
          </span>
        </div>
      </div>

      {/* Clue lists */}
      <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:max-w-xl">
        <ClueColumn
          title="Horizontal"
          clues={puzzle.across}
          direction="across"
          activeNumber={direction === "across" ? currentClueNumber : null}
          onSelect={(clue) => {
            setSelected({ r: clue.row, c: clue.col });
            setDirection("across");
            focusGrid();
          }}
        />
        <ClueColumn
          title="Vertical"
          clues={puzzle.down}
          direction="down"
          activeNumber={direction === "down" ? currentClueNumber : null}
          onSelect={(clue) => {
            setSelected({ r: clue.row, c: clue.col });
            setDirection("down");
            focusGrid();
          }}
        />
      </div>
    </div>
  );
}

function ClueColumn({
  title,
  clues,
  activeNumber,
  onSelect,
}: {
  title: string;
  clues: AmClue[];
  direction: Direction;
  activeNumber: number | null;
  onSelect: (clue: AmClue) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 border-b-2 border-ink/20 pb-1 font-display text-sm uppercase tracking-wide text-ink">
        {title}
      </h3>
      <ol className="space-y-0.5 text-sm text-ink">
        {clues.map((clue) => (
          <li key={clue.number}>
            <button
              onClick={() => onSelect(clue)}
              className={[
                "flex w-full gap-2 rounded-none px-1.5 py-1 text-left hover:bg-accent/30",
                clue.number === activeNumber ? "bg-brand/10" : "",
              ].join(" ")}
            >
              <span className="min-w-[1.5rem] font-semibold text-brand">{clue.number}.</span>
              <span>{clue.clue}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
