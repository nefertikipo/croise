"use client";

// On-screen (non-interactive) preview of a mots croisés book page: title band,
// numbered grid, and the Across/Down clue lists — mirroring compose-croises-page
// so the editor preview matches the printed page.

import type { CroisesPage } from "@/types/book";

interface CroisesPageViewProps {
  page: CroisesPage;
  index: number;
  showSolution?: boolean;
  /** Max rendered width in px; the grid scales to fit. */
  maxWidth?: number;
}

export function CroisesPageView({
  page,
  index,
  showSolution = false,
  maxWidth = 600,
}: CroisesPageViewProps) {
  const { puzzle } = page;
  const gridW = Math.min(maxWidth, 420);
  const cell = gridW / puzzle.width;
  const title = page.config.title || `Mots croisés N°${index}`;

  return (
    <div className="flex h-full flex-col bg-[#fff6ec] p-6 text-[#2f2a26]">
      <div className="mb-3 flex items-baseline justify-between border-b-2 border-[#2f2a26] pb-1">
        <span className="font-heading text-xl uppercase tracking-wide">{title}</span>
        <span className="font-heading text-[10px] uppercase tracking-wide text-[#2f2a26]/50">
          {puzzle.width}×{puzzle.height}
        </span>
      </div>

      <div className="flex justify-center">
        <div
          className="inline-grid border-2 border-[#2f2a26]"
          style={{ gridTemplateColumns: `repeat(${puzzle.width}, ${cell}px)` }}
        >
          {puzzle.cells.map((row, r) =>
            row.map((c, ci) =>
              c.kind === "block" ? (
                <div
                  key={`${r},${ci}`}
                  className="bg-[#2f2a26]"
                  style={{ width: cell, height: cell }}
                />
              ) : (
                <div
                  key={`${r},${ci}`}
                  className="relative flex items-center justify-center border border-[#2f2a26]/25 bg-white font-semibold uppercase"
                  style={{ width: cell, height: cell, fontSize: cell * 0.5 }}
                >
                  {c.number != null && (
                    <span
                      className="absolute left-px top-0 leading-none text-[#2f2a26]/50"
                      style={{ fontSize: Math.max(5, cell * 0.28) }}
                    >
                      {c.number}
                    </span>
                  )}
                  {showSolution ? c.letter : ""}
                </div>
              ),
            ),
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] leading-tight">
        <ClueList title="Horizontal" clues={puzzle.across} />
        <ClueList title="Vertical" clues={puzzle.down} />
      </div>
    </div>
  );
}

function ClueList({
  title,
  clues,
}: {
  title: string;
  clues: CroisesPage["puzzle"]["across"];
}) {
  return (
    <div>
      <h4 className="mb-1 font-heading text-xs uppercase tracking-wide">{title}</h4>
      <ol className="space-y-0.5">
        {clues.map((c) => (
          <li key={`${c.direction}-${c.number}`} className="flex gap-1">
            <span className="font-semibold text-[#2f2a26]/60">{c.number}.</span>
            <span>{c.clue}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
