import { BookPageFrame } from "@/components/book/book-page-frame";
import { PageDesignLayer } from "@/components/book/page-design-layer";
import type { ContentPageConfig } from "@/types/book";

interface ContentPageViewProps {
  config: ContentPageConfig;
}

/** A user-authored content page interleaved between grids (a note or a quote). */
export function ContentPageView({ config }: ContentPageViewProps) {
  const bg = config.backgroundColor ?? "var(--color-card)";

  if (config.layout === "quote") {
    return (
      <BookPageFrame style={{ backgroundColor: bg }}>
        <PageDesignLayer design={config.design} />
        <div className="relative flex-1 flex flex-col items-center justify-center px-14 text-center">
          <span className="font-heading text-7xl leading-none text-primary">“</span>
          <p className="font-heading text-3xl italic leading-snug text-foreground whitespace-pre-wrap">
            {config.quote || "Votre citation…"}
          </p>
          {config.title && (
            <p className="mt-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              — {config.title}
            </p>
          )}
        </div>
      </BookPageFrame>
    );
  }

  return (
    <BookPageFrame style={{ backgroundColor: bg }}>
      <PageDesignLayer design={config.design} />
      <div className="relative flex-1 flex flex-col px-12 py-14">
        {config.title && (
          <h2 className="font-heading text-4xl uppercase text-foreground mb-6">
            {config.title}
          </h2>
        )}
        <div className="h-px w-full bg-black/20 mb-6" />
        <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
          {config.body || "Votre texte…"}
        </p>
      </div>
    </BookPageFrame>
  );
}
