"use client";

import { FlecheGrid } from "@/components/fleche/fleche-grid";
import type { GridPage } from "@/types/book";

// Must match FlecheGrid's intrinsic cell size — the scale math relies on it.
const CELL_SIZE = 70;

interface SolutionTileProps {
  page: GridPage;
  index: number;
  /** Target rendered size of each cell in px; the whole grid scales to match. */
  cellPx?: number;
}

/**
 * One miniature answer-key grid for the Solutions page — the classic mots
 * fléchés look: plain grey clue blocks, black letters on white, no clue text or
 * arrows. Every tile renders at the same small cell size (so bigger grids make
 * bigger tiles), captioned "N°X" and sized to tile several per row.
 */
export function SolutionTile({ page, index, cellPx = 26 }: SolutionTileProps) {
  const gridW = page.width * CELL_SIZE;
  const gridH = page.height * CELL_SIZE;
  const scale = cellPx / CELL_SIZE;

  return (
    <div className="flex flex-col gap-1" style={{ width: gridW * scale }}>
      <span className="font-heading text-xs uppercase leading-none text-foreground">
        N°<span className="text-primary">{index}</span>
      </span>
      <div style={{ width: gridW * scale, height: gridH * scale }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: gridW,
            height: gridH,
          }}
        >
          <FlecheGrid
            cells={page.cells}
            width={page.width}
            height={page.height}
            showSolution
            plain
          />
        </div>
      </div>
    </div>
  );
}
