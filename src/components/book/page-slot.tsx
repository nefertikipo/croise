"use client";

import { BookPageFrame } from "@/components/book/book-page-frame";
import { useElementSize } from "@/components/book/use-element-size";
import { CoverPage } from "@/components/book/cover-page";
import { DedicationPage } from "@/components/book/dedication-page";
import { ContentPageView } from "@/components/book/content-page";
import { GridPageView } from "@/components/book/grid-page";
import { SolutionTile } from "@/components/book/solution-tile";
import { WordIndexPage } from "@/components/book/word-index-page";
import { cn } from "@/lib/utils";
import type { BookData, GridPage, WordIndexEntry } from "@/types/book";

/** A renderable slot in the book: derived sections + spine pages share one list. */
export type SlotId = "cover" | "dedication" | "index" | "solutions" | string;

/** Everything a slot needs to render itself, bundled so views pass it through once. */
export interface SlotData {
  book: BookData;
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
  wordIndex: WordIndexEntry[];
}

/** Ordered list of every visible page slot in the book. */
export function buildSlots(book: BookData): SlotId[] {
  return ["cover", "dedication", ...book.pages.map((p) => p.pageId), "index", "solutions"];
}

/** Human label for a slot, matching the rail. */
export function slotLabel(id: SlotId, data: SlotData): string {
  if (id === "cover") return "Couverture";
  if (id === "dedication") return "Dédicace";
  if (id === "index") return "Index des mots";
  if (id === "solutions") return "Solutions";
  const page = data.book.pages.find((p) => p.pageId === id);
  if (!page) return "";
  if (page.kind === "grid")
    return page.config.title || `Grille ${data.gridNumberByPage.get(id) ?? ""}`.trim();
  return page.config.title || (page.config.layout === "quote" ? "Citation" : "Note");
}

/**
 * The magazine block (title band + grid + hidden-word strip) is laid out at a
 * fixed design width, measured, then uniformly transform-scaled to fit the
 * frame — a true page thumbnail, immune to content wrapping.
 */
const GRID_DESIGN_WIDTH = 420;

function GridSlot({
  page,
  index,
  interactive,
}: {
  page: GridPage;
  index: number;
  interactive: boolean;
}) {
  const { ref: frameRef, size: avail } = useElementSize<HTMLDivElement>();
  const { ref: blockRef, size: natural } = useElementSize<HTMLDivElement>();

  const scale =
    avail.width > 0 && natural.height > 0
      ? Math.min(avail.width / GRID_DESIGN_WIDTH, avail.height / natural.height, 1)
      : 0;

  return (
    <BookPageFrame>
      <div
        ref={frameRef}
        className="flex-1 flex items-center justify-center p-3 overflow-hidden"
      >
        <div
          style={{
            width: GRID_DESIGN_WIDTH * scale,
            height: natural.height * scale,
            visibility: scale > 0 ? "visible" : "hidden",
          }}
        >
          <div
            ref={blockRef}
            style={{
              width: GRID_DESIGN_WIDTH,
              transform: `scale(${scale || 1})`,
              transformOrigin: "top left",
            }}
          >
            <GridPageView
              page={page}
              index={index}
              interactive={interactive}
              maxWidth={GRID_DESIGN_WIDTH}
            />
          </div>
        </div>
      </div>
    </BookPageFrame>
  );
}

/** Back-of-book solutions section: tiled plain answer-key mini grids. */
function SolutionsPage({
  gridPages,
  gridNumberByPage,
}: {
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
}) {
  return (
    <BookPageFrame>
      <div className="flex-1 flex flex-col px-10 py-10 overflow-auto">
        <h2 className="font-heading text-3xl uppercase mb-4">Solutions</h2>
        {gridPages.length === 0 && (
          <p className="text-muted-foreground italic">Aucune grille.</p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-3">
          {gridPages.map((p) => (
            <SolutionTile
              key={p.pageId}
              page={p}
              index={gridNumberByPage.get(p.pageId) ?? 0}
              cellPx={10}
            />
          ))}
        </div>
      </div>
    </BookPageFrame>
  );
}

/** The rendered content of a single slot — no selection chrome. */
export function SlotInner({
  id,
  data,
  interactive,
}: {
  id: SlotId;
  data: SlotData;
  interactive: boolean;
}) {
  const { book, gridPages, gridNumberByPage, wordIndex } = data;
  if (id === "cover") return <CoverPage title={book.title} cover={book.coverConfig} />;
  if (id === "dedication") return <DedicationPage text={book.dedicationText} />;
  if (id === "index") return <WordIndexPage entries={wordIndex} />;
  if (id === "solutions")
    return <SolutionsPage gridPages={gridPages} gridNumberByPage={gridNumberByPage} />;
  const page = book.pages.find((p) => p.pageId === id);
  if (!page) return null;
  if (page.kind === "content") return <ContentPageView config={page.config} />;
  return (
    <GridSlot
      page={page}
      index={gridNumberByPage.get(page.pageId) ?? 0}
      interactive={interactive}
    />
  );
}

/**
 * Renders a slot's page markup at a fixed design width, then uniformly
 * transform-scales the whole thing down to the container — so every page,
 * grid or text, reads as a true miniature. Used by the zoom-out gallery.
 */
const PAGE_DESIGN_WIDTH = 560;

function ScaledSlot({ children }: { children: React.ReactNode }) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const scale = size.width > 0 ? size.width / PAGE_DESIGN_WIDTH : 0;
  return (
    <div ref={ref} className="w-full overflow-hidden" style={{ aspectRatio: "1 / 1.414" }}>
      <div
        style={{
          width: PAGE_DESIGN_WIDTH,
          transform: `scale(${scale || 1})`,
          transformOrigin: "top left",
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A clickable slot with selection chrome, shared by the spread and gallery views. */
export function SlotCard({
  id,
  data,
  selected,
  interactive,
  scaled = false,
  onSelect,
  onFocus,
  className,
}: {
  id: SlotId;
  data: SlotData;
  selected: boolean;
  interactive: boolean;
  /** Uniformly scale the page down to the container (gallery thumbnails). */
  scaled?: boolean;
  onSelect: (id: SlotId) => void;
  onFocus?: (id: SlotId) => void;
  className?: string;
}) {
  const inner = <SlotInner id={id} data={data} interactive={interactive} />;
  return (
    <div
      onClick={() => onSelect(id)}
      onDoubleClick={() => onFocus?.(id)}
      title="Double-clic pour agrandir"
      className={cn(
        "block w-full text-left transition-shadow cursor-pointer",
        selected && "ring-4 ring-primary ring-offset-2",
        className,
      )}
    >
      {scaled ? <ScaledSlot>{inner}</ScaledSlot> : inner}
    </div>
  );
}
