"use client";

import { useState } from "react";
import { GripVertical, Lock } from "lucide-react";
import {
  SlotCard,
  buildSlots,
  slotLabel,
  type SlotData,
  type SlotId,
} from "@/components/book/page-slot";
import { buildSpreads } from "@/components/book/spread-canvas";
import { cn } from "@/lib/utils";

interface GalleryCanvasProps extends SlotData {
  selectedId: SlotId;
  onSelect: (id: SlotId) => void;
  /** Double-click a page to open it in the focused Page view. */
  onFocus?: (id: SlotId) => void;
  /** Drop the dragged page before `beforeId`, or at the end when null. */
  onReorder: (dragId: string, beforeId: string | null) => void;
}

/** Sentinel for "insert after the last movable page". */
const END = "__end__";

/**
 * Zoom-out overview: the whole book laid out as facing-page spreads, in reading
 * order, so you can see the flow and which pages sit side by side. Grids and free
 * pages can be dragged to reorder — a caret shows where the page will land and the
 * others slide to make room; the cover, dedication and back-matter are locked in
 * place. Click to select, double-click to open a page for editing.
 */
export function GalleryCanvas({
  book,
  gridPages,
  gridNumberByPage,
  wordIndex,
  selectedId,
  onSelect,
  onFocus,
  onReorder,
}: GalleryCanvasProps) {
  const data: SlotData = { book, gridPages, gridNumberByPage, wordIndex };
  const slots = buildSlots(book);
  const spreads = buildSpreads(slots);
  // Only grids and free pages can be reordered; everything else is fixed.
  const movableIds = book.pages.map((p) => p.pageId);
  const movable = new Set(movableIds);
  const lastMovableId = movableIds[movableIds.length - 1];

  const [dragId, setDragId] = useState<string | null>(null);
  // Which movable page the dragged one will land before (or END for the tail).
  const [dropBefore, setDropBefore] = useState<string | null>(null);

  function clearDrag() {
    setDragId(null);
    setDropBefore(null);
  }

  function renderSide(id: SlotId | null) {
    if (id === null) {
      // Inside back cover facing the front cover — mirrors a real open book.
      return (
        <div className="flex-1">
          <div className="flex aspect-[1/1.414] items-center justify-center border border-dashed border-black/12 bg-black/[0.015]">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Intérieur
            </span>
          </div>
        </div>
      );
    }

    const draggable = movable.has(id);
    const isDragging = dragId === id;
    // Show the caret before this page, or after it when it is the tail target.
    const caretBefore = dragId !== null && dragId !== id && dropBefore === id;
    const caretAfter =
      dragId !== null &&
      dropBefore === END &&
      id === lastMovableId &&
      dragId !== id;

    return (
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5 transition-[margin] duration-150",
          caretBefore && "ml-6",
          caretAfter && "mr-6",
          isDragging && "opacity-40",
        )}
        draggable={draggable}
        onDragStart={
          draggable
            ? (e) => {
                setDragId(id);
                e.dataTransfer.effectAllowed = "move";
              }
            : undefined
        }
        onDragEnd={clearDrag}
        onDragOver={
          draggable
            ? (e) => {
                if (!dragId) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const before = e.clientX - r.left < r.width / 2;
                if (before) {
                  setDropBefore(id);
                } else {
                  const m = movableIds.indexOf(id);
                  setDropBefore(movableIds[m + 1] ?? END);
                }
              }
            : undefined
        }
        onDrop={
          draggable
            ? (e) => {
                e.preventDefault();
                if (dragId) onReorder(dragId, dropBefore === END ? null : dropBefore);
                clearDrag();
              }
            : undefined
        }
      >
        <div className="relative">
          {/* Insertion caret — a thick rule where the page will land. */}
          {caretBefore && (
            <div className="absolute -left-3 top-0 bottom-0 z-10 w-1.5 rounded bg-primary" />
          )}
          {caretAfter && (
            <div className="absolute -right-3 top-0 bottom-0 z-10 w-1.5 rounded bg-primary" />
          )}

          {/* Locked vs. draggable badge. */}
          <span
            className={cn(
              "absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-sm border px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] shadow-sm",
              draggable
                ? "border-black/15 bg-paper/90 text-muted-foreground"
                : "border-black/10 bg-muted/90 text-muted-foreground/70",
            )}
            title={draggable ? "Glissez pour déplacer" : "Position fixe"}
          >
            {draggable ? (
              <>
                <GripVertical className="h-2.5 w-2.5" aria-hidden />
                Déplacer
              </>
            ) : (
              <>
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Fixe
              </>
            )}
          </span>

          <SlotCard
            id={id}
            data={data}
            selected={selectedId === id}
            interactive={false}
            scaled
            onSelect={onSelect}
            onFocus={onFocus}
          />
        </div>

        <div className="flex items-baseline gap-1.5 px-0.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {String(slots.indexOf(id) + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "truncate text-[11px] uppercase tracking-[0.12em]",
              selectedId === id ? "text-primary font-bold" : "text-muted-foreground",
            )}
          >
            {slotLabel(id, data)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        {spreads.map((pair, si) => (
          // Facing pages sit flush around a soft crease so each pair reads as
          // one open spread.
          <div key={si} className="flex items-start">
            {renderSide(pair[0])}
            <div className="w-2.5 self-stretch bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.16),transparent)]" />
            {renderSide(pair[1] ?? null)}
          </div>
        ))}
      </div>
    </div>
  );
}
