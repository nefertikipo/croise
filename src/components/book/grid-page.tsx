"use client";

import { useMemo } from "react";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import type { GridPage } from "@/types/book";

const CELL_SIZE = 70;

interface GridPageViewProps {
  page: GridPage;
  index: number;
  showSolution?: boolean;
  interactive?: boolean;
  /** Max rendered width in px; the grid scales down to fit. */
  maxWidth?: number;
  /** Optional max height for the whole block (title + grid + hidden-word strip). */
  maxHeight?: number;
}

/** Renders one grid page: title, scaled fléchés grid, and hidden-word strip. */
export function GridPageView({
  page,
  index,
  showSolution = false,
  interactive = false,
  maxWidth = 600,
  maxHeight,
}: GridPageViewProps) {
  const hidden = page.config.hiddenWord ?? "";
  const highlightedCells = useMemo(
    () =>
      hidden
        ? findHiddenWordCells({ width: page.width, height: page.height, cells: page.cells }, hidden)
        : undefined,
    [hidden, page.width, page.height, page.cells],
  );

  const gridW = page.width * CELL_SIZE;
  const gridH = page.height * CELL_SIZE;
  const cleanHidden = normalizeHiddenWord(hidden);
  const hasHiddenStrip = !!highlightedCells && highlightedCells.size > 0;
  // Vertical space taken by the title and hidden-word strip around the grid.
  const chromeH = 48 + (hasHiddenStrip ? 76 : 0);
  const scale = Math.min(
    1,
    maxWidth / gridW,
    maxHeight ? Math.max(0.1, (maxHeight - chromeH) / gridH) : 1,
  );

  return (
    <div className="flex flex-col items-center gap-3" style={{ width: gridW * scale }}>
      <h3 className="font-heading text-2xl uppercase text-foreground self-start">
        Grille {index}
      </h3>

      <div style={{ width: gridW * scale, height: gridH * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: gridW, height: gridH }}>
          <FlecheGrid
            cells={page.cells}
            width={page.width}
            height={page.height}
            showSolution={showSolution}
            interactive={interactive && !showSolution}
            highlightedCells={highlightedCells}
            accentColor={page.config.gridColor}
          />
        </div>
      </div>

      {/* Hidden word strip: write-in boxes, part of the printed grid block. */}
      {hasHiddenStrip && (
        <div className="w-full border-2 border-black bg-card px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Mot caché</span>
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from({ length: highlightedCells.size }, (_, i) => (
              <div
                key={i}
                className="relative w-8 h-9 border-2 border-primary bg-background flex items-center justify-center"
              >
                <span className="absolute top-0 left-0.5 text-[8px] font-bold text-primary">
                  {i + 1}
                </span>
                {showSolution && (
                  <span className="text-base font-bold uppercase">{cleanHidden[i]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
