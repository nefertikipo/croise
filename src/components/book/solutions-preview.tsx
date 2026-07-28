"use client";

import { PreviewPage } from "@/components/book/preview-page";
import { SolutionTile } from "@/components/book/solution-tile";
import {
  paginateSolutionTiles,
  solutionCellPx,
  SOLUTION_TILE_GAP,
} from "@/lib/books/preview-layout";
import type { GridPage } from "@/types/book";

interface SolutionsPreviewProps {
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
  /** Render only this single paginated page (gallery/spread show one card per
   * physical page). Omit to stack every page (the focus "Page" view). */
  pageIndex?: number;
}

/** One page of the answer key: four columns of plain mini-grids. */
function SolutionsPageCard({
  grids,
  gridNumberByPage,
  suite,
}: {
  grids: GridPage[];
  gridNumberByPage: Map<string, number>;
  suite: boolean;
}) {
  return (
    <PreviewPage>
      <div className="flex h-full flex-col px-9 py-8">
        <h2 className="mb-3 font-heading text-2xl uppercase">
          Solutions{suite ? " (suite)" : ""}
        </h2>
        <div
          className="flex flex-wrap content-start items-start"
          style={{ gap: SOLUTION_TILE_GAP }}
        >
          {grids.map((g) => (
            <SolutionTile
              key={g.pageId}
              page={g}
              index={gridNumberByPage.get(g.pageId) ?? 0}
              cellPx={solutionCellPx(g)}
            />
          ))}
        </div>
      </div>
    </PreviewPage>
  );
}

/**
 * Back-of-book Solutions section, paginated into A5 page frames exactly like the
 * printed PDF — so the editor preview never pours a long answer key into one
 * overflowing page. Four answer-key columns per page.
 */
export function SolutionsPreview({
  gridPages,
  gridNumberByPage,
  pageIndex,
}: SolutionsPreviewProps) {
  const pages = paginateSolutionTiles(gridPages);

  if (pages.length === 0) {
    return (
      <PreviewPage>
        <div className="flex h-full flex-col px-9 py-8">
          <h2 className="font-heading text-2xl uppercase">Solutions</h2>
          <p className="mt-4 italic text-muted-foreground">Aucune grille.</p>
        </div>
      </PreviewPage>
    );
  }

  if (pageIndex != null) {
    const grids = pages[pageIndex] ?? [];
    return (
      <SolutionsPageCard
        grids={grids}
        gridNumberByPage={gridNumberByPage}
        suite={pageIndex > 0}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pages.map((grids, pi) => (
        <SolutionsPageCard
          key={pi}
          grids={grids}
          gridNumberByPage={gridNumberByPage}
          suite={pi > 0}
        />
      ))}
    </div>
  );
}
