"use client";

import { useState } from "react";
import { Field, TextField, ColorPicker } from "@/components/book/field";
import { DifficultyPicker } from "@/components/book/difficulty-picker";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { GridPhotoField } from "@/components/book/grid-photo-field";
import { ClueIdeaPicker } from "@/components/book/clue-idea-picker";
import { ConfirmButton } from "@/components/book/confirm-button";
import { addPickedIdeas } from "@/components/book/pick-ideas";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/shared/generation-progress";
import { ClueList, difficultyBand } from "@/components/fleche/clue-list";
import { estimateGenerationMs } from "@/lib/crossword/estimate-generation";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import { composeInput, normalizeAnswer } from "@/lib/crossword/normalize";
import { INTERIOR_COLOR_ENABLED } from "@/lib/books/constants";
import type { ClueIdea, GridPage, GridPageConfig, BookWord } from "@/types/book";

/** Facile / moyen / difficile split of the grid's placed words, as a bar + legend. */
function DifficultyBreakdown({ words }: { words: BookWord[] }) {
  const scored = words.filter((w) => !w.isCustom && w.difficulty != null);
  const facile = scored.filter((w) => difficultyBand(w.difficulty) === "facile").length;
  const moyen = scored.filter((w) => difficultyBand(w.difficulty) === "moyen").length;
  const difficile = scored.filter((w) => difficultyBand(w.difficulty) === "difficile").length;
  const total = scored.length;

  // Grids saved before difficulty was persisted have no scored words — say so
  // rather than drawing an empty bar.
  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Répartition indisponible : régénérez la grille pour la calculer.
      </p>
    );
  }

  const segments = [
    { label: "Facile", n: facile, bar: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Moyen", n: moyen, bar: "bg-amber-500", text: "text-amber-700" },
    { label: "Difficile", n: difficile, bar: "bg-red-500", text: "text-red-700" },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        {segments.map((s) =>
          s.n > 0 ? (
            <div
              key={s.label}
              className={s.bar}
              style={{ width: `${(s.n / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {segments.map((s) => (
          <span key={s.label} className={s.text}>
            {s.n} {s.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

interface GridPagePropertiesProps {
  page: GridPage;
  index: number;
  regenerating: boolean;
  /** The book's saved clue ideas, offered as one-click custom words. */
  ideas: ClueIdea[];
  /** Normalized custom answer → grid numbers, for the idea picker's "used" hints. */
  ideaUsage: Map<string, number[]>;
  onConfigChange: (patch: Partial<GridPageConfig>) => void;
  onRegenerate: (customClues: { answer: string; clue: string }[]) => void;
  onDelete: () => void;
}

export function GridPageProperties({
  page,
  index,
  regenerating,
  ideas,
  ideaUsage,
  onConfigChange,
  onRegenerate,
  onDelete,
}: GridPagePropertiesProps) {
  // Seed with the grid's already-placed custom words so regenerating (e.g. to
  // change the difficulty level) keeps them instead of dropping every custom
  // word. The editor then also lets the maker review/edit/remove them.
  // Remounts per page (key={pageId} in the parent), so this reads the right grid.
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>(() =>
    page.words
      .filter((w) => w.isCustom)
      .map((w) => ({ answer: w.answer, clue: w.clue })),
  );

  const addedAnswers = new Set(customClues.map((c) => normalizeAnswer(c.answer)));
  function pickIdea(idea: ClueIdea) {
    pickIdeas([idea]);
  }
  function pickIdeas(picked: ClueIdea[]) {
    setCustomClues((prev) => addPickedIdeas(prev, picked));
  }
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

      <DifficultyBreakdown words={page.words} />

      <details className="group" open>
        <summary className="cursor-pointer list-none font-heading text-sm uppercase tracking-wide text-muted-foreground marker:content-none">
          <span className="group-open:hidden">▸ </span>
          <span className="hidden group-open:inline">▾ </span>
          Liste des mots ({page.words.length})
        </summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <ClueList words={page.words} />
        </div>
      </details>

      <Field label="Nom de la grille">
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onConfigChange({ title: title.trim() || undefined })}
          placeholder={`Grille ${index}`}
        />
      </Field>

      {/* The standard carnet prints B&W, so no grid-colour choice. Kept in code,
          re-enabled with INTERIOR_COLOR_ENABLED when the photo edition ships. */}
      {INTERIOR_COLOR_ENABLED && (
        <Field label="Couleur de la grille">
          <ColorPicker
            value={page.config.gridColor}
            onChange={(c) => onConfigChange({ gridColor: c })}
          />
        </Field>
      )}

      <DifficultyPicker
        value={page.config.difficulty ?? "balanced"}
        onChange={(difficulty) => onConfigChange({ difficulty })}
      />
      <p className="text-xs text-muted-foreground -mt-2">
        Appliquée à la prochaine régénération de cette grille.
      </p>

      <GridPhotoField
        photo={page.config.photo}
        width={page.width}
        height={page.height}
        onChange={(photo) => onConfigChange({ photo })}
      />

      <Field label="Mot caché">
        <TextField
          value={hiddenWord}
          onChange={(e) => setHiddenWord(composeInput(e.target.value))}
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
            <>, lettres absentes de la grille : {missingLetters.join(", ")}</>
          )}
          . Changez de mot ou régénérez la grille.
        </p>
      )}

      <div className="border-t-2 border-black/10 pt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Ajoutez vos mots, puis régénérez la grille pour les intégrer.
        </p>

        <ClueIdeaPicker
          ideas={ideas}
          usage={ideaUsage}
          addedAnswers={addedAnswers}
          width={page.width}
          height={page.height}
          onPick={pickIdea}
          onPickMany={pickIdeas}
        />

        <CustomWordsEditor
          width={page.width}
          height={page.height}
          value={customClues}
          onChange={setCustomClues}
        />

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

      <ConfirmButton
        label="Supprimer cette grille"
        prompt="Supprimer cette grille ?"
        onConfirm={onDelete}
        className="w-full"
      />
    </div>
  );
}
