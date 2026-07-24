"use client";

import { SlotCard, buildSlots, type SlotData, type SlotId } from "@/components/book/page-slot";

interface SpreadCanvasProps extends SlotData {
  selectedId: SlotId;
  onSelect: (id: SlotId) => void;
  /** Double-click a page to open it in the focused Page view. */
  onFocus?: (id: SlotId) => void;
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
  onFocus,
}: SpreadCanvasProps) {
  const data: SlotData = { book, gridPages, gridNumberByPage, wordIndex };
  const slots = buildSlots(book);
  const spreads = buildSpreads(slots);
  const spread = spreads.find((s) => s.includes(selectedId)) ?? spreads[0];
  const spreadIndex = spreads.indexOf(spread);

  function renderSlot(id: SlotId | null) {
    if (id === null) {
      // Blank side (facing the cover, or an odd final page).
      return (
        <div className="w-full max-w-[420px] aspect-[1/1.414] border-2 border-dashed border-black/15" />
      );
    }
    return (
      <SlotCard
        id={id}
        data={data}
        selected={selectedId === id}
        interactive={selectedId === id}
        onSelect={onSelect}
        onFocus={onFocus}
        className="max-w-[420px]"
      />
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
