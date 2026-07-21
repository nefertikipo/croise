"use client";

import { useElementSize } from "@/components/book/use-element-size";
import { CoverPage } from "@/components/book/cover-page";
import { DedicationPage } from "@/components/book/dedication-page";
import { ContentPageView } from "@/components/book/content-page";
import { GridPageView } from "@/components/book/grid-page";
import { WordIndexPage } from "@/components/book/word-index-page";
import type { BookData, GridPage, WordIndexEntry } from "@/types/book";
import type { SlotId } from "@/components/book/page-slot";

interface PageCanvasProps {
  book: BookData;
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
  wordIndex: WordIndexEntry[];
  selectedId: SlotId;
}

/**
 * Focus view: one page, big. Grid pages drop the page-frame metaphor and
 * render at working scale (like /fleche) — readable clues, scroll if tall.
 * Everything else renders as a large single page.
 */
export function PageCanvas({
  book,
  gridPages,
  gridNumberByPage,
  wordIndex,
  selectedId,
}: PageCanvasProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const page = book.pages.find((p) => p.pageId === selectedId);

  if (page?.kind === "grid") {
    return (
      <div ref={ref} className="w-full">
        {size.width > 0 && (
          <GridPageView
            page={page}
            index={gridNumberByPage.get(page.pageId) ?? 0}
            interactive
            maxWidth={size.width}
          />
        )}
      </div>
    );
  }

  if (selectedId === "solutions") {
    return (
      <div ref={ref} className="w-full space-y-10">
        {gridPages.length === 0 && (
          <p className="text-muted-foreground italic">Aucune grille.</p>
        )}
        {size.width > 0 &&
          gridPages.map((p) => (
            <GridPageView
              key={p.pageId}
              page={p}
              index={gridNumberByPage.get(p.pageId) ?? 0}
              showSolution
              maxWidth={Math.min(size.width, 620)}
            />
          ))}
      </div>
    );
  }

  const inner = (() => {
    if (selectedId === "cover") return <CoverPage title={book.title} cover={book.coverConfig} />;
    if (selectedId === "dedication") return <DedicationPage text={book.dedicationText} />;
    if (selectedId === "index") return <WordIndexPage entries={wordIndex} />;
    if (page?.kind === "content") return <ContentPageView config={page.config} />;
    return null;
  })();

  return <div className="mx-auto max-w-[560px]">{inner}</div>;
}
