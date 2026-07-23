"use client";

import { useState } from "react";
import { Field, TextField, ColorPicker } from "@/components/book/field";
import { DifficultyPicker } from "@/components/book/difficulty-picker";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/shared/generation-progress";
import { estimateGenerationMs } from "@/lib/crossword/estimate-generation";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import type { GridPage, GridPageConfig } from "@/types/book";

interface GridPagePropertiesProps {
  page: GridPage;
  index: number;
  regenerating: boolean;
  onConfigChange: (patch: Partial<GridPageConfig>) => void;
  onRegenerate: (customClues: { answer: string; clue: string }[]) => void;
  onDelete: () => void;
}

export function GridPageProperties({
  page,
  index,
  regenerating,
  onConfigChange,
  onRegenerate,
  onDelete,
}: GridPagePropertiesProps) {
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [hiddenWord, setHiddenWord] = useState(page.config.hiddenWord ?? "");
  const [title, setTitle] = useState(page.config.title ?? "");

  const validCustom = customClues.filter(
    (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
  );

  // Feedback: can the hidden word actually be spelled with this grid's letters?
  const cleanHidden = normalizeHiddenWord(hiddenWord);
  const hiddenPlaced =
    cleanHidden.length >= 2 &&
    findHiddenWordCells(
      { width: page.width, height: page.height, cells: page.cells },
      cleanHidden,
    ).size > 0;
  const missingLetters =
    cleanHidden.length >= 2 && !hiddenPlaced
      ? [...new Set([...cleanHidden])].filter(
          (ch) =>
            !page.cells.some((row) =>
              row.some((c) => c.type === "letter" && c.letter?.toUpperCase() === ch),
            ),
        )
      : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl uppercase">Grille {index}</h3>
        <span className="text-xs text-muted-foreground">
          {page.words.length} mots · {page.width}×{page.height}
        </span>
      </div>

      <Field label="Nom de la grille">
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onConfigChange({ title: title.trim() || undefined })}
          placeholder={`Grille ${index}`}
        />
      </Field>

      <Field label="Couleur de la grille">
        <ColorPicker
          value={page.config.gridColor}
          onChange={(c) => onConfigChange({ gridColor: c })}
        />
      </Field>

      <DifficultyPicker
        value={page.config.difficulty ?? "balanced"}
        onChange={(difficulty) => onConfigChange({ difficulty })}
      />
      <p className="text-xs text-muted-foreground -mt-2">
        Appliquée à la prochaine régénération de cette grille.
      </p>

      <Field label="Mot caché">
        <TextField
          value={hiddenWord}
          onChange={(e) => setHiddenWord(e.target.value)}
          onBlur={() => onConfigChange({ hiddenWord: hiddenWord })}
          placeholder="ex: ANNIVERSAIRE"
          className="uppercase font-mono"
        />
      </Field>
      {cleanHidden.length >= 2 && hiddenPlaced && (
        <p className="text-xs text-accent-foreground">
          ✓ {cleanHidden.length} lettres réparties dans la grille
        </p>
      )}
      {cleanHidden.length >= 2 && !hiddenPlaced && (
        <p className="text-xs text-destructive">
          ⚠ Impossible à placer
          {missingLetters.length > 0 && (
            <> — lettres absentes de la grille : {missingLetters.join(", ")}</>
          )}
          . Changez de mot ou régénérez la grille.
        </p>
      )}

      <div className="border-t-2 border-black/10 pt-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Mots personnalisés
        </p>
        <p className="text-xs text-muted-foreground">
          Ajoutez vos mots, puis régénérez la grille pour les intégrer.
        </p>

        {customClues.map((cc, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              placeholder="Mot"
              value={cc.answer}
              onChange={(e) => {
                const next = [...customClues];
                next[i] = { ...next[i], answer: e.target.value };
                setCustomClues(next);
              }}
              className="w-28 border-2 border-black px-2 py-1 text-sm uppercase font-mono"
            />
            <input
              placeholder="Indice"
              value={cc.clue}
              onChange={(e) => {
                const next = [...customClues];
                next[i] = { ...next[i], clue: e.target.value };
                setCustomClues(next);
              }}
              className="flex-1 border-2 border-black px-2 py-1 text-sm"
            />
            <button
              onClick={() => setCustomClues(customClues.filter((_, j) => j !== i))}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => setCustomClues([...customClues, { answer: "", clue: "" }])}
          className="text-sm border-2 border-black px-3 py-1 hover:bg-muted"
        >
          + Ajouter un mot
        </button>

        {regenerating ? (
          <GenerationProgress
            estimatedMs={estimateGenerationMs({
              width: page.width,
              height: page.height,
              customCount: validCustom.length,
            })}
          />
        ) : (
          <Button onClick={() => onRegenerate(validCustom)} className="w-full">
            Régénérer la grille
          </Button>
        )}
      </div>

      <Button variant="outline" onClick={onDelete} className="w-full">
        Supprimer cette grille
      </Button>
    </div>
  );
}
