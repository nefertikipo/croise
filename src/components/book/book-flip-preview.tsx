"use client";

import { useEffect, useMemo, useState } from "react";
import { buildWordIndex } from "@/lib/crossword/word-index";
import { rehydrateDesignPreview } from "@/lib/books/photo-preview";
import {
  SlotInner,
  buildSlots,
  slotLabel,
  type SlotData,
  type SlotId,
} from "@/components/book/page-slot";
import { cn } from "@/lib/utils";
import type { BookData, GridPage } from "@/types/book";

/**
 * Flip-through preview of the real book pages — the friendly, mobile-native
 * replacement for the print-PDF iframes on the order page. Renders one page at
 * a time with the SAME components the editor uses (WYSIWYG), so "this is exactly
 * what prints" holds without ever showing a PDF. Click the page or use the
 * arrows / keyboard to turn pages. The cover shows in colour; every interior
 * page is desaturated to mirror the black-&-white print.
 */
export function BookFlipPreview({ book: initialBook }: { book: BookData }) {
  const [book, setBook] = useState(initialBook);
  const [current, setCurrent] = useState(0);

  // Rebuild the cover photo from its stored photoRef (the base64 preview is
  // never persisted) — mirrors the editor's mount-only rehydration.
  useEffect(() => {
    const design = initialBook.coverConfig?.design;
    if (!design?.photoRef || design.imageUrl) return;
    let cancelled = false;
    void rehydrateDesignPreview(design).then((rehydrated) => {
      if (cancelled || rehydrated.imageUrl === undefined) return;
      setBook((b) => {
        const cover = b.coverConfig ?? {};
        if (cover.design?.imageUrl) return b;
        return { ...b, coverConfig: { ...cover, design: { ...cover.design, ...rehydrated } } };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [initialBook]);

  const data: SlotData = useMemo(() => {
    const gridPages = book.pages.filter((p): p is GridPage => p.kind === "grid");
    const gridNumberByPage = new Map<string, number>();
    gridPages.forEach((p, idx) => gridNumberByPage.set(p.pageId, idx + 1));
    return { book, gridPages, gridNumberByPage, wordIndex: buildWordIndex(gridPages) };
  }, [book]);

  const slots = useMemo(() => buildSlots(book, data), [book, data]);
  const clamped = Math.min(current, slots.length - 1);
  const id: SlotId = slots[clamped];
  const isCover = id === "cover";

  function go(delta: number) {
    setCurrent((n) => Math.max(0, Math.min(slots.length - 1, n + delta)));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // slots.length is stable enough; go clamps against the latest length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[420px]">
        <div
          onClick={() => go(1)}
          role="button"
          tabIndex={0}
          aria-label="Page suivante"
          className={cn("cursor-pointer select-none", !isCover && "grayscale")}
        >
          <SlotInner id={id} data={data} interactive={false} />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          disabled={clamped === 0}
          aria-label="Page précédente"
          className="absolute left-1 top-1/2 -translate-y-1/2 border-2 border-ink bg-white/90 px-2 py-3 text-lg font-bold shadow-[2px_2px_0_0] shadow-ink/60 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          disabled={clamped === slots.length - 1}
          aria-label="Page suivante"
          className="absolute right-1 top-1/2 -translate-y-1/2 border-2 border-ink bg-white/90 px-2 py-3 text-lg font-bold shadow-[2px_2px_0_0] shadow-ink/60 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[420px] items-center justify-between text-xs">
        <span className="font-display uppercase tracking-[0.15em]">
          {slotLabel(id, data)}
        </span>
        <span className="text-muted-foreground">
          Page {clamped + 1} / {slots.length}
        </span>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Feuilletez chaque page (clic ou flèches). Les pages intérieures sont
        imprimées en <span className="font-semibold text-ink">noir &amp; blanc</span> ;
        seule la couverture est en couleur.
      </p>
    </div>
  );
}
