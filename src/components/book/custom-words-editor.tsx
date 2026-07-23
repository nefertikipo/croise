"use client";

import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import { normalizeAnswer } from "@/lib/crossword/normalize";

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

      {value.map((cc, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              placeholder="Mot ou phrase (ex: BON ANNIVERSAIRE)"
              value={cc.answer}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], answer: e.target.value };
                onChange(next);
              }}
              className={`w-36 rounded-none border-2 bg-white px-2 py-1 text-sm uppercase font-mono ${
                isWordTooLong(cc.answer) ? "border-destructive" : "border-ink/20"
              }`}
            />
            <input
              placeholder="Indice (ex: La fille du moment!)"
              value={cc.clue}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], clue: e.target.value };
                onChange(next);
              }}
              className="flex-1 rounded-none border-2 border-ink/20 bg-white px-2 py-1 text-sm"
            />
            <button
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-sm text-muted-foreground hover:text-destructive"
              aria-label="Retirer ce mot"
            >
              ✕
            </button>
          </div>
          {isWordTooLong(cc.answer) && (
            <p className="text-xs text-destructive">
              Trop long pour une grille {width}×{height} (max {maxDim} lettres).
            </p>
          )}
        </div>
      ))}

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
