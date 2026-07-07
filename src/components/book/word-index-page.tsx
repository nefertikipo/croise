import { BookPageFrame } from "@/components/book/book-page-frame";
import type { WordIndexEntry } from "@/types/book";

interface WordIndexPageProps {
  entries: WordIndexEntry[];
}

/** Back-of-book word index: every word used, alphabetical, grouped by grid. */
export function WordIndexPage({ entries }: WordIndexPageProps) {
  const total = entries.reduce((n, e) => n + e.words.length, 0);
  return (
    <BookPageFrame>
      <div className="flex-1 flex flex-col px-12 py-12 overflow-auto">
        <h2 className="font-heading text-4xl uppercase text-foreground">Index des mots</h2>
        <p className="text-sm text-muted-foreground mb-6">{total} mots</p>
        {entries.length === 0 && (
          <p className="text-muted-foreground italic">Aucune grille pour le moment.</p>
        )}
        <div className="space-y-5">
          {entries.map((entry) => (
            <div key={entry.grid}>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
                Grille {entry.grid}
              </h3>
              <p className="text-sm leading-relaxed text-foreground font-mono">
                {entry.words.join(" · ") || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </BookPageFrame>
  );
}
