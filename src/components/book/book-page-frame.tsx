import { POD_TRIM } from "@/lib/books/constants";
import { cn } from "@/lib/utils";

interface BookPageFrameProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A paper-like page surface used for every book page (cover, dedication,
 * content, index, solutions). Proportioned to the active POD trim
 * (POD_PAGE_SIZE), cream paper, subtle border — the shared canvas so all pages
 * read as one book.
 */
export function BookPageFrame({ children, className, style }: BookPageFrameProps) {
  return (
    <div
      className={cn(
        "book-page relative mx-auto w-full max-w-[640px]",
        "bg-card border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]",
        "flex flex-col overflow-hidden",
        className,
      )}
      style={{ aspectRatio: `${POD_TRIM.w} / ${POD_TRIM.h}`, ...style }}
    >
      {children}
    </div>
  );
}
