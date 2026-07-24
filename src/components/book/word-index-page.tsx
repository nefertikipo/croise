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
      <div className="flex-1 flex flex-col px-10 py-8 overflow-auto">
        <h2 className="font-heading text-2xl uppercase text-foreground">Index des mots</h2>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {total} mots
        </p>
        {entries.length === 0 && (
          <p className="text-muted-foreground italic">Aucune grille pour le moment.</p>
        )}
        <div className="columns-2 gap-6 [column-fill:balance]">
          {entries.map((entry) => (
            <div key={entry.grid} className="mb-3 break-inside-avoid">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-0.5">
                Grille {entry.grid}
              </h3>
              <p className="text-xs leading-snug text-foreground font-mono">
                {entry.words.join(" · ") || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </BookPageFrame>
  );
}
