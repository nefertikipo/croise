"use client";

import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  kind: "cover" | "dedication" | "grid" | "content" | "index" | "solutions" | "add";
}

interface PageRailProps {
  items: RailItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Lean table of contents: numbered rows in reading order for quick jumping.
 * Reordering lives in the gallery (drag); this is navigation only.
 */
export function PageRail({ items, selectedId, onSelect }: PageRailProps) {
  return (
    <nav className="flex flex-col">
      {items.map((item, i) => {
        if (item.kind === "add") {
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "mt-2 border-2 border-dashed border-black/30 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                selectedId === item.id && "border-primary text-primary",
              )}
            >
              {item.label}
            </button>
          );
        }

        const selected = item.id === selectedId;
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
              {String(i + 1).padStart(2, "0")}
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
