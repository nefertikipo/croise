import { BookPageFrame } from "@/components/book/book-page-frame";
import { PageDesignLayer } from "@/components/book/page-design-layer";
import type { CoverConfig } from "@/types/book";

interface CoverPageProps {
  title: string;
  cover: CoverConfig | null;
}

/** The front cover of the book. Vintage editorial: big Anton title, ruled frame. */
export function CoverPage({ title, cover }: CoverPageProps) {
  const accent = cover?.themeColor ?? "var(--color-primary)";
  return (
    <BookPageFrame>
      <div
        className="relative flex-1 flex flex-col items-center justify-between p-10 text-center"
        style={{ backgroundColor: accent, color: "var(--color-primary-foreground)" }}
      >
        <PageDesignLayer design={cover?.design} />
        <div className="relative w-full border-2 border-current pt-2 pb-1 text-xs uppercase tracking-[0.3em]">
          Mots Fléchés
        </div>

        <div className="relative flex flex-col items-center gap-4">
          <h1 className="font-heading text-5xl md:text-6xl uppercase leading-[0.95] tracking-tight">
            {title || "Sans titre"}
          </h1>
          {cover?.subtitle && (
            <p className="text-lg italic opacity-90">{cover.subtitle}</p>
          )}
        </div>

        <div className="relative w-full space-y-2">
          {cover?.occasion && (
            <p className="text-sm uppercase tracking-[0.2em]">{cover.occasion}</p>
          )}
          {cover?.recipientName && (
            <p className="font-heading text-2xl uppercase">Pour {cover.recipientName}</p>
          )}
          <div className="mx-auto mt-4 h-px w-24 bg-current opacity-60" />
        </div>
      </div>
    </BookPageFrame>
  );
}
