"use client";

export interface ClueListItem {
  answer: string;
  clue: string;
  /** "right" (horizontale) or "down" (verticale). */
  direction: string;
  isCustom: boolean;
  /** 1 = facile, 2 = moyen, 3 = difficile. null = custom/unscored. */
  difficulty?: number | null;
}

/** Round + clamp a raw score (1-5 in the schema, 1-3 in practice) to a label. */
function difficultyLabel(d?: number | null, isCustom?: boolean): string {
  if (isCustom) return "Perso";
  if (d == null) return "—";
  const r = Math.round(d);
  return r <= 1 ? "Facile" : r >= 3 ? "Difficile" : "Moyen";
}

/** Sort key: hardest first, custom/unscored clues last. */
function sortWeight(w: ClueListItem): number {
  if (w.isCustom || w.difficulty == null) return -1;
  return Math.round(w.difficulty);
}

export function ClueList({ words }: { words: ClueListItem[] }) {
  const sorted = [...words].sort((a, b) => sortWeight(b) - sortWeight(a));
  return (
    <div className="frame-tight bg-paper p-4 print:hidden">
      <h3 className="mb-3 font-display text-base uppercase tracking-wide text-ink">
        Définitions ({words.length})
      </h3>
      <ul className="space-y-1">
        {sorted.map((w, i) => (
          <li
            key={`${w.answer}-${i}`}
            className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1 text-sm"
          >
            <span className="min-w-0">
              <span className="font-semibold text-ink">{w.answer}</span>
              <span className="text-muted-foreground"> — {w.clue}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">
              {difficultyLabel(w.difficulty, w.isCustom)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
