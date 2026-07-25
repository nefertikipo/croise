"use client";

import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  kind: "cover" | "dedication" | "ideas" | "grid" | "content" | "index" | "solutions" | "add";
}

interface PageRailProps {
  items: RailItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Design tools, not printed pages — kept out of the numbered book spine. */
const TOOL_KINDS = new Set<RailItem["kind"]>(["ideas", "add"]);

/**
 * Lean table of contents: numbered rows in reading order for quick jumping.
 * The printed book spine (cover → solutions) is numbered; design tools (the
 * clue-idea notepad and "add a page") live below an "Atelier" divider, unnumbered
 * and styled apart, so they don't read as actual pages in the book.
 * Reordering lives in the gallery (drag); this is navigation only.
 */
export function PageRail({ items, selectedId, onSelect }: PageRailProps) {
  let pageNum = 0;
  let toolsStarted = false;

  return (
    <nav className="flex flex-col">
      {items.map((item) => {
        const isTool = TOOL_KINDS.has(item.kind);
        const selected = item.id === selectedId;

        // The divider is emitted once, just before the first tool row.
        let divider: React.ReactNode = null;
        if (isTool && !toolsStarted) {
          toolsStarted = true;
          divider = (
            <div className="mt-4 mb-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                Atelier
              </span>
            </div>
          );
        }

        if (item.kind === "add") {
          return (
            <div key={item.id} className="mt-1">
              {divider}
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full border-2 border-dashed border-black/30 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                  selected && "border-primary text-primary",
                )}
              >
                {item.label}
              </button>
            </div>
          );
        }

        if (item.kind === "ideas") {
          return (
            <div key={item.id}>
              {divider}
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 border-2 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide transition-colors",
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-black/20 text-foreground hover:border-primary hover:text-primary",
                )}
              >
                <span aria-hidden className="text-sm leading-none">✎</span>
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          );
        }

        // Numbered book-spine row.
        pageNum += 1;
        const num = pageNum;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex items-baseline gap-2 border-l-2 px-3 py-1.5 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "font-mono text-[10px]",
                selected ? "text-primary" : "text-muted-foreground",
              )}
            >
              {String(num).padStart(2, "0")}
            </span>
            <span className="truncate text-xs font-bold uppercase tracking-wide leading-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
