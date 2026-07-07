"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { GenerationProgress } from "@/components/fleche/generation-progress";
import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import {
  findHiddenWordCells,
  missingHiddenLetters,
  normalizeHiddenWord,
} from "@/lib/crossword/hidden-word";

interface ClueInCell {
  text: string;
  direction: "right" | "down";
  answerRow: number;
  answerCol: number;
  answerLength: number;
  answer: string;
  isCustom?: boolean;
}

interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: ClueInCell[];
}

interface FlecheData {
  id?: string;
  code?: string;
  width: number;
  height: number;
  hiddenWordSatisfied?: boolean;
  cells: FlecheCell[][];
  words: { answer: string; clue: string; direction: string; isCustom: boolean }[];
}

export default function FlechePage() {
  const router = useRouter();
  const [grid, setGrid] = useState<FlecheData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [gridWidth, setGridWidth] = useState(11);
  const [gridHeight, setGridHeight] = useState(17);
  const [difficulty, setDifficulty] = useState<
    "facile" | "moyen" | "difficile" | "balanced"
  >("balanced");
  const [gridKey, setGridKey] = useState(0);
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [hiddenWord, setHiddenWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Valid custom words drive both the generation estimate and the button state.
  const validCustomCount = customClues.filter(
    (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
  ).length;
  const estimatedMs = validCustomCount > 0 ? 45000 : 12000;

  // Live feasibility flagging: warn before the user hits generate when the
  // custom words can't fit (too long / too many) rather than after a long wait.
  const maxDim = Math.max(gridWidth, gridHeight);
  const capacity = analyzeCapacity(gridWidth, gridHeight, customClues);
  const isWordTooLong = (answer: string) => {
    const w = answer.toUpperCase().replace(/[^A-Z]/g, "");
    return w.length >= 2 && w.length > maxDim;
  };

  // Hidden word is a post-hoc highlight over the generated grid, recomputed live
  // as the user edits it so the strip + feedback stay in sync without a regen.
  const cleanHiddenWord = normalizeHiddenWord(hiddenWord);
  const hiddenCells = useMemo(() => {
    if (!grid || cleanHiddenWord.length < 2) return new Map<string, number>();
    return findHiddenWordCells(grid, cleanHiddenWord);
  }, [grid, cleanHiddenWord]);
  const hiddenMissing = useMemo(() => {
    if (!grid || cleanHiddenWord.length < 2 || hiddenCells.size > 0) return [];
    return missingHiddenLetters(grid, cleanHiddenWord);
  }, [grid, cleanHiddenWord, hiddenCells]);

  async function generate() {
    setLoading(true);
    setShowSolution(false);
    setError(null);
    try {
      const validCustom = customClues.filter(
        (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
      );
      const cleanHidden = normalizeHiddenWord(hiddenWord);

      const res = await fetch("/api/fleche/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: gridWidth,
          height: gridHeight,
          customClues: validCustom,
          excludeAnswers: Array.from(usedAnswers),
          hiddenWord: cleanHidden || undefined,
          difficulty,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation echouee" }));
        setError(err.error);
        setLoading(false);
        return;
      }
      const data: FlecheData = await res.json();
      setGrid(data);
      setGridKey((k) => k + 1);

      // Track used answers so next regeneration avoids them
      // Custom words are never excluded (user wants them in every grid)
      setUsedAnswers((prev) => {
        const next = new Set(prev);
        for (const w of data.words) {
          if (!w.isCustom) next.add(w.answer);
        }
        // Remove custom word answers from exclusion (they should always be available)
        for (const cc of customClues) {
          next.delete(cc.answer.toUpperCase().replace(/[^A-Z]/g, ""));
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createBook() {
    try {
      const cleanHidden = normalizeHiddenWord(hiddenWord);
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mon livre de mots fleches",
          // Carry the grid the user is looking at in as the first page.
          seedCrosswordCode: grid?.code,
          seedConfig: cleanHidden ? { hiddenWord: cleanHidden } : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create book");
      const { code } = await res.json();
      router.push(`/book/${code}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-ink">
            Mots <span className="text-brand">Fléchés</span>
          </h1>
          <p className="text-muted-foreground">
            Générez une grille personnalisée, glissez vos mots, imprimez.
          </p>
        </div>

        {/* Before generation: pick a format, add your words, generate */}
        {!grid && !loading && (
          <div className="space-y-6 rounded-2xl border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium mr-1">Format :</label>
              {[
                { w: 11, h: 17, label: "11×17" },
                { w: 11, h: 15, label: "11×15" },
                { w: 9, h: 13, label: "9×13" },
                { w: 8, h: 11, label: "8×11" },
                { w: 5, h: 7, label: "5×7" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setGridWidth(s.w); setGridHeight(s.h); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    gridWidth === s.w && gridHeight === s.h
                      ? "bg-ink text-paper"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Difficulty selector */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium mr-1">Difficulté :</label>
              {[
                { v: "facile", label: "Facile" },
                { v: "balanced", label: "Équilibré" },
                { v: "moyen", label: "Moyen" },
                { v: "difficile", label: "Difficile" },
              ].map((d) => (
                <button
                  key={d.v}
                  onClick={() => setDifficulty(d.v as typeof difficulty)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    difficulty === d.v
                      ? "bg-ink text-paper"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Custom words — the headline feature, front and center */}
            <div className="space-y-3 rounded-xl border-2 border-ink/15 bg-muted/30 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em]">
                  Vos mots personnalisés
                </p>
                <p className="text-sm text-muted-foreground">
                  Prénoms, dates, clins d&apos;œil — ils seront placés dans la grille.
                </p>
              </div>

              {customClues.map((cc, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Mot (ex: SARAH)"
                      value={cc.answer}
                      onChange={(e) => {
                        const next = [...customClues];
                        next[i] = { ...next[i], answer: e.target.value };
                        setCustomClues(next);
                      }}
                      className={`w-36 rounded border-2 bg-white px-2 py-1 text-sm uppercase font-mono ${
                        isWordTooLong(cc.answer) ? "border-destructive" : "border-ink/20"
                      }`}
                    />
                    <input
                      placeholder="Indice (ex: La fille du moment!)"
                      value={cc.clue}
                      onChange={(e) => {
                        const next = [...customClues];
                        next[i] = { ...next[i], clue: e.target.value };
                        setCustomClues(next);
                      }}
                      className="flex-1 rounded border-2 border-ink/20 bg-white px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => setCustomClues(customClues.filter((_, j) => j !== i))}
                      className="text-sm text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                  {isWordTooLong(cc.answer) && (
                    <p className="text-xs text-destructive">
                      Trop long pour une grille {gridWidth}×{gridHeight} (max {maxDim} lettres).
                    </p>
                  )}
                </div>
              ))}

              <button
                onClick={() => setCustomClues([...customClues, { answer: "", clue: "" }])}
                className="rounded-lg border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
              >
                + Ajouter un mot personnalisé
              </button>

              {capacity.message && (
                <p className="text-sm font-medium text-destructive">⚠ {capacity.message}</p>
              )}
              {!capacity.message && capacity.tight && (
                <p className="text-sm text-amber-600">
                  Grille bien remplie — la génération peut être plus longue, voire
                  échouer. Si c&apos;est le cas, agrandissez la grille ou retirez un mot.
                </p>
              )}
            </div>

            {/* Hidden word — a secondary, optional touch */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                Mot caché (optionnel) :
              </label>
              <input
                placeholder="ex: ANNIVERSAIRE"
                value={hiddenWord}
                onChange={(e) => setHiddenWord(e.target.value)}
                className="w-48 rounded border px-2 py-1 text-sm uppercase font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={generate}
                disabled={loading || capacity.message !== null}
                size="lg"
              >
                Générer une grille
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}

        {/* Generation in progress (first grid) */}
        {!grid && loading && <GenerationProgress estimatedMs={estimatedMs} />}

        {/* After generation: grid + actions below */}
        {grid && (
          <>
            {/* Grid display */}
            <div className="fleche-print-area">
              <div className="overflow-x-auto">
                <FlecheGrid
                  key={gridKey}
                  cells={grid.cells}
                  width={grid.width}
                  height={grid.height}
                  showSolution={showSolution}
                  interactive={!showSolution}
                  highlightedCells={hiddenCells}
                />
              </div>
              <div className="hidden print:block print:break-before-page">
                <div className="rotate-180">
                  <FlecheGrid
                    cells={grid.cells}
                    width={grid.width}
                    height={grid.height}
                    showSolution
                  />
                </div>
              </div>
            </div>

            {/* Hidden word answer boxes */}
            {hiddenCells.size > 0 && (
              <div className="flex items-center gap-1 mt-4">
                <span className="text-sm font-medium mr-2">Mot caché :</span>
                {Array.from({ length: hiddenCells.size }, (_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 border-2 border-primary flex items-center justify-center text-xs text-muted-foreground"
                  >
                    {showSolution ? cleanHiddenWord[i] : i + 1}
                  </div>
                ))}
              </div>
            )}
            {cleanHiddenWord.length >= 2 && hiddenCells.size > 0 && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Mot caché « {cleanHiddenWord} » intégré à la grille.
              </p>
            )}
            {hiddenMissing.length > 0 && (
              <p className="mt-2 text-sm text-destructive">
                ⚠ Le mot caché « {cleanHiddenWord} » n&apos;a pas pu être entièrement
                intégré — lettres absentes : {hiddenMissing.join(", ")}. Régénérez ou
                changez de mot.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              {grid.words.length} mots places
              {grid.words.some((w) => w.isCustom) && (
                <> dont {grid.words.filter((w) => w.isCustom).length} personnalise(s)</>
              )}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {grid.code && (
                <span className="text-sm font-mono text-muted-foreground">{grid.code}</span>
              )}
              <Button variant="outline" onClick={() => setShowSolution(!showSolution)}>
                {showSolution ? "Cacher solution" : "Voir solution"}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Imprimer / PDF
              </Button>
              {grid.code && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/grille/${grid.code}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Lien copie!" : "Copier le lien"}
                </Button>
              )}
              <Button variant="outline" onClick={createBook}>
                Creer un livre
              </Button>
            </div>

            {/* Add custom words + regenerate */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Ajouter des mots et regenerer</p>
              <div className="space-y-2">
                {customClues.map((cc, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        placeholder="Mot (ex: SARAH)"
                        value={cc.answer}
                        onChange={(e) => {
                          const next = [...customClues];
                          next[i] = { ...next[i], answer: e.target.value };
                          setCustomClues(next);
                        }}
                        className={`border-2 rounded px-2 py-1 text-sm w-32 uppercase font-mono bg-white ${
                          isWordTooLong(cc.answer) ? "border-destructive" : "border-transparent"
                        }`}
                      />
                      <input
                        placeholder="Indice (ex: La fille du moment!)"
                        value={cc.clue}
                        onChange={(e) => {
                          const next = [...customClues];
                          next[i] = { ...next[i], clue: e.target.value };
                          setCustomClues(next);
                        }}
                        className="border rounded px-2 py-1 text-sm flex-1 bg-white"
                      />
                      <button
                        onClick={() => setCustomClues(customClues.filter((_, j) => j !== i))}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        x
                      </button>
                    </div>
                    {isWordTooLong(cc.answer) && (
                      <p className="text-xs text-destructive">
                        Trop long pour une grille {gridWidth}×{gridHeight} (max {maxDim} lettres).
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {capacity.message && (
                <p className="text-sm font-medium text-destructive">⚠ {capacity.message}</p>
              )}
              {!capacity.message && capacity.tight && (
                <p className="text-sm text-amber-600">
                  Grille bien remplie — la génération peut être plus longue, voire échouer.
                </p>
              )}

              {/* Hidden word */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Mot caché :</label>
                <input
                  placeholder="ex: ANNIVERSAIRE"
                  value={hiddenWord}
                  onChange={(e) => setHiddenWord(e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-48 uppercase font-mono bg-white"
                />
                {hiddenCells.size > 0 && (
                  <span className="text-xs text-green-600">
                    ✓ {hiddenCells.size} lettres réparties dans la grille
                  </span>
                )}
                {hiddenMissing.length > 0 && (
                  <span className="text-xs text-destructive">
                    ⚠ lettres absentes : {hiddenMissing.join(", ")} — régénérez
                  </span>
                )}
              </div>

              {/* Reset excluded answers */}
              {usedAnswers.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {usedAnswers.size} mots exclus de la prochaine generation.{" "}
                  <button
                    onClick={() => setUsedAnswers(new Set())}
                    className="underline hover:text-foreground"
                  >
                    Reinitialiser
                  </button>
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCustomClues([...customClues, { answer: "", clue: "" }])}
                  className="text-sm border rounded px-3 py-1 hover:bg-muted bg-white"
                >
                  + Ajouter un mot
                </button>
                <Button onClick={generate} disabled={loading || capacity.message !== null}>
                  Régénérer
                </Button>
              </div>

              {loading && <GenerationProgress estimatedMs={estimatedMs} />}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
