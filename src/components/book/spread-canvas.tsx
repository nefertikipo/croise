"use client";

import { BookPageFrame } from "@/components/book/book-page-frame";
import { CoverPage } from "@/components/book/cover-page";
import { DedicationPage } from "@/components/book/dedication-page";
import { ContentPageView } from "@/components/book/content-page";
import { GridPageView } from "@/components/book/grid-page";
import { WordIndexPage } from "@/components/book/word-index-page";
import { cn } from "@/lib/utils";
import type { BookData, GridPage, WordIndexEntry } from "@/types/book";

/** A renderable slot in the book: derived sections + spine pages share one list. */
export type SlotId = "cover" | "dedication" | "index" | "solutions" | string;

interface SpreadCanvasProps {
  book: BookData;
  gridPages: GridPage[];
  gridNumberByPage: Map<string, number>;
  wordIndex: WordIndexEntry[];
  selectedId: SlotId;
  onSelect: (id: SlotId) => void;
}

/** Ordered list of every visible page slot in the book. */
export function buildSlots(book: BookData): SlotId[] {
  return ["cover", "dedication", ...book.pages.map((p) => p.pageId), "index", "solutions"];
}

/**
 * Facing-page spreads, like a physical book: the cover sits alone on the right,
 * then pages pair [left, right] through to the back sections.
 */
export function buildSpreads(slots: SlotId[]): (SlotId | null)[][] {
  const spreads: (SlotId | null)[][] = [[null, slots[0]]];
  for (let i = 1; i < slots.length; i += 2) {
    spreads.push([slots[i], slots[i + 1] ?? null]);
  }
  return spreads;
}

export function SpreadCanvas({
  book,
  gridPages,
  gridNumberByPage,
  wordIndex,
  selectedId,
  onSelect,
}: SpreadCanvasProps) {
  const slots = buildSlots(book);
  const spreads = buildSpreads(slots);
  const spread =
    spreads.find((s) => s.includes(selectedId)) ?? spreads[0];
  const spreadIndex = spreads.indexOf(spread);

  function renderSlot(id: SlotId | null) {
    if (id === null) {
      // Blank side (facing the cover, or an odd final page).
      return (
        <div className="w-full max-w-[420px] aspect-[1/1.414] border-2 border-dashed border-black/15" />
      );
    }

    const inner = (() => {
      if (id === "cover") return <CoverPage title={book.title} cover={book.coverConfig} />;
      if (id === "dedication") return <DedicationPage text={book.dedicationText} />;
      if (id === "index") return <WordIndexPage entries={wordIndex} />;
      if (id === "solutions") {
        return (
          <BookPageFrame>
            <div className="flex-1 flex flex-col px-10 py-10 overflow-auto">
              <h2 className="font-heading text-3xl uppercase mb-4">Solutions</h2>
              <div className="space-y-6">
                {gridPages.length === 0 && (
                  <p className="text-muted-foreground italic">Aucune grille.</p>
                )}
                {gridPages.map((p) => (
                  <GridPageView
                    key={p.pageId}
                    page={p}
                    index={gridNumberByPage.get(p.pageId) ?? 0}
                    showSolution
                    maxWidth={300}
                  />
                ))}
              </div>
            </div>
          </BookPageFrame>
        );
      }
      const page = book.pages.find((p) => p.pageId === id);
      if (!page) return null;
      if (page.kind === "content") return <ContentPageView config={page.config} />;
      return (
        <BookPageFrame>
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <GridPageView
              page={page}
              index={gridNumberByPage.get(page.pageId) ?? 0}
              interactive={selectedId === id}
              maxWidth={330}
              maxHeight={450}
            />
          </div>
        </BookPageFrame>
      );
    })();

    return (
      <div
        onClick={() => onSelect(id)}
        className={cn(
          "block w-full max-w-[420px] text-left transition-shadow cursor-pointer",
          selectedId === id && "ring-4 ring-primary ring-offset-2",
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Spread navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          disabled={spreadIndex <= 0}
          onClick={() => {
            const prev = spreads[spreadIndex - 1];
            onSelect((prev[1] ?? prev[0])!);
          }}
          className="border-2 border-black px-3 py-1 text-sm disabled:opacity-20 hover:bg-muted"
        >
          ← Page précédente
        </button>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Planche {spreadIndex + 1} / {spreads.length}
        </span>
        <button
          disabled={spreadIndex >= spreads.length - 1}
          onClick={() => {
            const next = spreads[spreadIndex + 1];
            onSelect((next[0] ?? next[1])!);
          }}
          className="border-2 border-black px-3 py-1 text-sm disabled:opacity-20 hover:bg-muted"
        >
          Page suivante →
        </button>
      </div>

      {/* The open book */}
      <div className="flex items-start justify-center gap-1">
        <div className="flex-1 flex justify-end">{renderSlot(spread[0])}</div>
        <div className="w-px self-stretch bg-black/20" />
        <div className="flex-1 flex justify-start">{renderSlot(spread[1])}</div>
      </div>
    </div>
  );
}
