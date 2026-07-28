"use client";

import { useElementSize } from "@/components/book/use-element-size";
import { PREVIEW_PAGE_H, PREVIEW_PAGE_W } from "@/lib/books/preview-layout";
import { cn } from "@/lib/utils";

/**
 * One A5-proportioned page surface for the paginated back-matter previews
 * (Solutions, word Index). Content is authored at a fixed design size
 * (PREVIEW_PAGE_W × PREVIEW_PAGE_H) — the same space the paginators reason in —
 * then uniformly scaled to whatever width the surface is rendered at, so a full
 * page always fits its frame exactly and never overflows.
 */
export function PreviewPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const scale = size.width > 0 ? size.width / PREVIEW_PAGE_W : 0;
  return (
    <div
      ref={ref}
      className={cn(
        "relative mx-auto w-full max-w-[640px] overflow-hidden bg-card",
        "border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]",
        className,
      )}
      style={{ aspectRatio: `${PREVIEW_PAGE_W} / ${PREVIEW_PAGE_H}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: PREVIEW_PAGE_W,
          height: PREVIEW_PAGE_H,
          transform: `scale(${scale || 1})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
