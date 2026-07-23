"use client";

import { useState } from "react";
import { GenerationProgress } from "@/components/fleche/generation-progress";
import { WordIdeasHelper } from "@/components/fleche/word-ideas-helper";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import { CLUE_EXAMPLES, DIFFICULTY_INFO } from "@/lib/fleche/difficulty-guide";
import type { GridDifficulty } from "@/types/book";

const FORMATS = [
  { w: 11, h: 17, label: "11×17" },
  { w: 11, h: 15, label: "11×15" },
  { w: 9, h: 13, label: "9×13" },
  { w: 8, h: 11, label: "8×11" },
];

const DIFFICULTIES: { v: GridDifficulty; label: string }[] = [
  { v: "facile", label: "Facile" },
  { v: "balanced", label: "Équilibré" },
  { v: "moyen", label: "Moyen" },
  { v: "difficile", label: "Difficile" },
];

export interface CreateGridOptions {
  width: number;
  height: number;
  count: number;
  difficulty: GridDifficulty;
  customClues: { answer: string; clue: string }[];
  hiddenWord?: string;
}

interface GridCreatorProps {
  busy: boolean;
  onCreate: (opts: CreateGridOptions) => Promise<string | null> | void;
  onClose: () => void;
}

/**
 * Full-screen grid creator for the book editor. Deliberately mirrors the
 * standalone /fleche composer — same card, difficulty explainer, word-ideas
 * helper, hidden word, and generation progress — so building a grid inside a
 * book feels identical to building one on its own. When custom words are present
 * it makes exactly one grid (a personalized grid is one-of-a-kind); otherwise it
 * can batch several.
 */
export function GridCreator({ busy, onCreate, onClose }: GridCreatorProps) {
  const [width, setWidth] = useState(11);
  const [height, setHeight] = useState(17);
  const [count, setCount] = useState(1);
  const [difficulty, setDifficulty] = useState<GridDifficulty>("balanced");
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [hiddenWord, setHiddenWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validCustom = customClues.filter(
    (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
  );
  const hasCustom = validCustom.length > 0;
  const effectiveCount = hasCustom ? 1 : count;
  const capacity = analyzeCapacity(width, height, customClues);
  const canCreate = !busy && capacity.message === null;
  // Same honest pacing as /fleche: custom-word fills take longer; multiple
  // automatic grids run back-to-back.
  const estimatedMs = hasCustom ? 45000 : 12000 * effectiveCount;

  async function create() {
    setError(null);
    const result = await onCreate({
      width,
      height,
      count: effectiveCount,
      difficulty,
      customClues: validCustom,
      hiddenWord: hiddenWord.trim() || undefined,
    });
    if (typeof result === "string") {
      setError(result);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background print:hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b-2 border-ink bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <div>
            <h2 className="text-3xl text-ink">
              Créer une <span className="text-brand">grille</span>
            </h2>
            <p className="font-serif-accent text-sm italic text-ink/75">
              Choisissez un format, glissez vos mots, générez.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-none border-2 border-ink bg-paper px-4 py-1.5 font-sans text-sm font-semibold uppercase tracking-wide text-ink hover:bg-accent"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {busy ? (
          <GenerationProgress estimatedMs={estimatedMs} />
        ) : (
          <div className="space-y-6 rounded-none border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
            {/* Format */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">
                Format
              </label>
              {FORMATS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setWidth(s.w);
                    setHeight(s.h);
                  }}
                  className={`rounded-none border-2 border-ink px-4 py-1.5 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${
                    width === s.w && height === s.h
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink hover:bg-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Difficulty */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">
                Difficulté
              </label>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.v}
                  onClick={() => setDifficulty(d.v)}
                  className={`rounded-none border-2 border-ink px-4 py-1.5 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${
                    difficulty === d.v
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink hover:bg-accent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="-mt-2 space-y-2 border-2 border-ink/15 bg-muted/30 p-4">
              <p className="font-serif-accent text-sm italic text-ink/75">
                {DIFFICULTY_INFO[difficulty].help}
              </p>
              <p className="font-display text-xs uppercase tracking-wide text-ink/60">
                Mélange&nbsp;:{" "}
                <span className="text-brand">{DIFFICULTY_INFO[difficulty].mix}</span>
              </p>
              <ul className="space-y-1">
                {DIFFICULTY_INFO[difficulty].show.map((lvl) => {
                  const ex = CLUE_EXAMPLES[lvl];
                  return (
                    <li key={lvl} className="text-sm text-ink/80">
                      <span className="mr-1 font-display text-[11px] uppercase tracking-wide text-ink/45">
                        {ex.label}
                      </span>
                      <span className="italic">« {ex.clue} »</span> →{" "}
                      <span className="font-mono font-semibold">{ex.answer}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Custom words — the headline feature, front and center */}
            <div className="space-y-3 rounded-none border-2 border-ink/15 bg-muted/30 p-4">
              <CustomWordsEditor
                width={width}
                height={height}
                value={customClues}
                onChange={(next) => {
                  setCustomClues(next);
                  setError(null);
                }}
              />
            </div>

            <WordIdeasHelper
              onPick={(clue) => setCustomClues((prev) => [...prev, { answer: "", clue }])}
            />

            {/* Hidden word — a secondary, optional touch */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                Mot caché (optionnel) :
              </label>
              <input
                placeholder="ex: ANNIVERSAIRE"
                value={hiddenWord}
                onChange={(e) => setHiddenWord(e.target.value)}
                className="w-48 rounded-none border px-2 py-1 text-sm uppercase font-mono"
              />
            </div>

            {/* Count — automatic grids only (a personalized grid is unique) */}
            {!hasCustom && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">
                  Nombre
                </label>
                <div className="flex items-center border-2 border-ink">
                  <button
                    className="px-3 py-1.5 hover:bg-accent"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-mono">{count}</span>
                  <button
                    className="px-3 py-1.5 hover:bg-accent"
                    onClick={() => setCount((c) => Math.min(10, c + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={create}
                disabled={!canCreate}
                className="btn-lapos rounded-none bg-brand px-7 py-3 text-base text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {hasCustom
                  ? "Créer ma grille personnalisée"
                  : count > 1
                    ? `Créer ${count} grilles`
                    : "Créer la grille"}
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
