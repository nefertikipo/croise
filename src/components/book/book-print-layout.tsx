import { CoverPage } from "@/components/book/cover-page";
import { DedicationPage } from "@/components/book/dedication-page";
import { ContentPageView } from "@/components/book/content-page";
import { GridPageView } from "@/components/book/grid-page";
import { SolutionTile } from "@/components/book/solution-tile";
import { WordIndexPage } from "@/components/book/word-index-page";
import type { BookData, GridPage, WordIndexEntry } from "@/types/book";

interface BookPrintLayoutProps {
  book: BookData;
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
  wordIndex: WordIndexEntry[];
}

function PrintPage({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return <div className={first ? "" : "print:break-before-page"}>{children}</div>;
}

/**
 * Hidden on screen, rendered when printing. Order:
 * Cover → Dedication → spine (grids + content) → Word index → Solutions.
 */
export function BookPrintLayout({
  book,
  gridPages,
  gridNumberByPage,
  wordIndex,
}: BookPrintLayoutProps) {
  return (
    <div className="hidden print:block book-print-area">
      <PrintPage first>
        <CoverPage title={book.title} cover={book.coverConfig} />
      </PrintPage>

      {book.dedicationText && (
        <PrintPage>
          <DedicationPage text={book.dedicationText} />
        </PrintPage>
      )}

      {book.pages.map((p) => (
        <PrintPage key={p.pageId}>
          {p.kind === "grid" ? (
            <GridPageView page={p} index={gridNumberByPage.get(p.pageId) ?? 0} maxWidth={700} />
          ) : (
            <ContentPageView config={p.config} />
          )}
        </PrintPage>
      ))}

      <PrintPage>
        <WordIndexPage entries={wordIndex} />
      </PrintPage>

      {gridPages.length > 0 && (
        <PrintPage>
          <h2 className="font-heading text-2xl uppercase mb-6">Solutions</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-3">
            {gridPages.map((p) => (
              <SolutionTile
                key={`sol-${p.pageId}`}
                page={p}
                index={gridNumberByPage.get(p.pageId) ?? 0}
                cellPx={10}
              />
            ))}
          </div>
        </PrintPage>
      )}
    </div>
  );
}
