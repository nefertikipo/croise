"use client";

import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  sub?: string;
  kind: "cover" | "dedication" | "grid" | "content" | "index" | "solutions" | "add";
  /** Spine pages (grid/content) can be reordered. */
  pageId?: string;
}

interface PageRailProps {
  items: RailItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (pageId: string, dir: -1 | 1) => void;
  firstSpineIndex: number;
  lastSpineIndex: number;
}

export function PageRail({
  items,
  selectedId,
  onSelect,
  onMove,
  firstSpineIndex,
  lastSpineIndex,
}: PageRailProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isSpine = item.kind === "grid" || item.kind === "content";
        const selected = item.id === selectedId;
        return (
          <div key={item.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex-1 text-left border-2 px-3 py-2 transition-colors",
                item.kind === "add"
                  ? "border-dashed border-black/40 text-muted-foreground hover:border-primary hover:text-primary"
                  : "border-black",
                selected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <span className="block text-sm font-bold uppercase tracking-wide leading-tight">
                {item.label}
              </span>
              {item.sub && <span className="block text-xs opacity-70">{item.sub}</span>}
            </button>

            {isSpine && item.pageId && (
              <div className="flex flex-col">
                <button
                  disabled={i <= firstSpineIndex}
                  onClick={() => onMove(item.pageId!, -1)}
                  className="px-1 text-xs disabled:opacity-20 hover:text-primary"
                  title="Monter"
                >
                  ▲
                </button>
                <button
                  disabled={i >= lastSpineIndex}
                  onClick={() => onMove(item.pageId!, 1)}
                  className="px-1 text-xs disabled:opacity-20 hover:text-primary"
                  title="Descendre"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
