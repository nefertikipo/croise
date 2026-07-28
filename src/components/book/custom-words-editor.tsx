"use client";

import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import { composeInput, normalizeAnswer } from "@/lib/crossword/normalize";

type CustomClue = { answer: string; clue: string };

interface CustomWordsEditorProps {
  /** Grid dimensions, so capacity feedback matches the target format. */
  width: number;
  height: number;
  value: CustomClue[];
  onChange: (next: CustomClue[]) => void;
}

/**
 * Shared editor for a grid's personalized words (name/date/in-joke → clue).
 * Styled to match the /fleche composer so the two entry points feel identical.
 * Rows + an "add a word" button + live capacity feedback. Used both when
 * creating a grid (GridCreator) and when regenerating one (GridPageProperties).
 */
export function CustomWordsEditor({ width, height, value, onChange }: CustomWordsEditorProps) {
  const capacity = analyzeCapacity(width, height, value);
  const validCount = value.filter(
    (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
  ).length;
  const maxDim = Math.max(width, height);

  function isWordTooLong(answer: string): boolean {
    const w = normalizeAnswer(answer);
    return w.length >= 2 && w.length > maxDim;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em]">Vos mots personnalisés</p>
        <p className="text-sm text-muted-foreground">
          Prénoms, dates, clins d&apos;œil, ils seront placés dans la grille.
        </p>
        <p className="mt-1 text-sm font-medium">
          Grille {width}×{height} : jusqu&apos;à {capacity.recommendedMax}{" "}
          {capacity.recommendedMax > 1 ? "mots" : "mot"} recommandé
          {capacity.recommendedMax > 1 ? "s" : ""}
          {validCount > 0 && (
            <span
              className={
                validCount > capacity.recommendedMax ? "text-amber-600" : "text-muted-foreground"
              }
            >
              {" "}· {validCount} ajouté{validCount > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {value.length > 0 && (
        <div className="rounded-none border-2 border-ink/20 bg-white">
          {/* Header row */}
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2.25rem] bg-accent/40 text-xs font-bold uppercase tracking-wide text-ink/70">
            <div className="px-3 py-2">Mot</div>
            <div className="border-l-2 border-ink/10 px-3 py-2">Indice</div>
            <div />
          </div>
          {value.map((cc, i) => {
            const tooLong = isWordTooLong(cc.answer);
            return (
              <div key={i} className="border-t-2 border-ink/10">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2.25rem] items-stretch">
                  <input
                    placeholder="ex : BON ANNIVERSAIRE"
                    value={cc.answer}
                    onChange={(e) => {
                      const next = [...value];
                      next[i] = { ...next[i], answer: composeInput(e.target.value) };
                      onChange(next);
                    }}
                    className={`w-full bg-transparent px-3 py-2.5 font-mono text-base uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground/60 ${
                      tooLong ? "text-destructive" : "text-ink"
                    }`}
                  />
                  <input
                    placeholder="ex : La fille du moment !"
                    value={cc.clue}
                    onChange={(e) => {
                      const next = [...value];
                      next[i] = { ...next[i], clue: e.target.value };
                      onChange(next);
                    }}
                    className="w-full border-l-2 border-ink/10 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className="flex items-center justify-center text-muted-foreground hover:text-destructive"
                    aria-label="Retirer ce mot"
                  >
                    ✕
                  </button>
                </div>
                {tooLong && (
                  <p className="border-t-2 border-ink/10 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
                    Trop long pour une grille {width}×{height} (max {maxDim} lettres).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => onChange([...value, { answer: "", clue: "" }])}
        className="rounded-none border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
      >
        + Ajouter un mot personnalisé
      </button>

      {capacity.message && (
        <p className="text-sm font-medium text-destructive">⚠ {capacity.message}</p>
      )}
      {!capacity.message && capacity.overRecommended && (
        <p className="text-sm text-amber-600">
          Au-delà de {capacity.recommendedMax} mots, la génération peut être plus longue,
          voire échouer sur cette grille. Retirez un mot ou choisissez une grille plus grande
          pour un résultat fiable.
        </p>
      )}
      {!capacity.message && !capacity.overRecommended && capacity.tight && (
        <p className="text-sm text-amber-600">
          Grille bien remplie, la génération peut être plus longue, voire échouer. Si c&apos;est
          le cas, agrandissez la grille ou retirez un mot.
        </p>
      )}
    </div>
  );
}
