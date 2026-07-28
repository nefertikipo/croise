"use client";

import { PreviewPage } from "@/components/book/preview-page";
import { INDEX_COLS, paginateIndex, type IndexPage } from "@/lib/books/preview-layout";
import type { WordIndexEntry } from "@/types/book";

interface IndexPreviewProps {
  entries: WordIndexEntry[];
  /** Render only this single paginated page (gallery/spread show one card per
   * physical page). Omit to stack every page (the focus "Page" view). */
  pageIndex?: number;
}

/** One page of the word index: four columns of length-grouped words. */
function IndexPageCard({ page, total, showHeader }: { page: IndexPage; total: number; showHeader: boolean }) {
  return (
    <PreviewPage>
      <div className="flex h-full flex-col px-9 py-8">
        {showHeader && (
          <>
            <h2 className="font-heading text-2xl uppercase text-foreground">Index des mots</h2>
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {total} mots
            </p>
          </>
        )}
        <div
          className="grid flex-1 gap-3"
          style={{ gridTemplateColumns: `repeat(${INDEX_COLS}, minmax(0, 1fr))` }}
        >
          {page.map((colLines, ci) => (
            <ul key={ci} className="flex min-w-0 flex-col font-mono text-xs leading-snug text-foreground">
              {colLines.map((line, li) =>
                line.kind === "header" ? (
                  <li
                    key={li}
                    className="mb-0.5 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary first:mt-0"
                  >
                    {line.text}
                  </li>
                ) : (
                  <li key={li} className="truncate">
                    {line.text}
                  </li>
                ),
              )}
            </ul>
          ))}
        </div>
      </div>
    </PreviewPage>
  );
}

/**
 * Back-of-book word index, paginated into A5 page frames like the printed PDF —
 * four columns per page, grouped by word length. Prevents a long index from
 * overflowing a single preview page.
 */
export function IndexPreview({ entries, pageIndex }: IndexPreviewProps) {
  const total = entries.reduce((n, e) => n + e.words.length, 0);
  const pages = paginateIndex(entries);

  if (pages.length === 0) {
    return (
      <PreviewPage>
        <div className="flex h-full flex-col px-9 py-8">
          <h2 className="font-heading text-2xl uppercase text-foreground">Index des mots</h2>
          <p className="mt-4 italic text-muted-foreground">
            Aucune grille pour le moment.
          </p>
        </div>
      </PreviewPage>
    );
  }

  if (pageIndex != null) {
    const page = pages[pageIndex] ?? [];
    return <IndexPageCard page={page} total={total} showHeader={pageIndex === 0} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {pages.map((page, pi) => (
        <IndexPageCard key={pi} page={page} total={total} showHeader={pi === 0} />
      ))}
    </div>
  );
}
