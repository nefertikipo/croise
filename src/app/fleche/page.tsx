"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { ShareGridButton } from "@/components/fleche/share-grid-button";
import { GenerationProgress } from "@/components/shared/generation-progress";
import { WordIdeasHelper } from "@/components/fleche/word-ideas-helper";
import { ClueList } from "@/components/fleche/clue-list";
import { AddToBook } from "@/components/fleche/add-to-book";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { analyzeCapacity, checkHiddenWord, needsBoostedCompute } from "@/lib/crossword/check-capacity";
import { estimateGenerationMs } from "@/lib/crossword/estimate-generation";
import { composeInput, normalizeAnswer } from "@/lib/crossword/normalize";
import {
  findHiddenWordCells,
  missingHiddenLetters,
  normalizeHiddenWord,
} from "@/lib/crossword/hidden-word";
import {
  FlechePrintHeader,
  FlechePrintMotCache,
  FlechePrintFooter,
  computeFlechePrintScale,
} from "@/components/fleche/fleche-print-chrome";
import { CLUE_EXAMPLES, DIFFICULTY_INFO } from "@/lib/fleche/difficulty-guide";
import { GRID_FORMATS, DEFAULT_GRID_FORMAT } from "@/lib/crossword/grid-formats";
import { GridFormatPreview } from "@/components/fleche/grid-format-preview";

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
  breakRight?: boolean;
  breakBottom?: boolean;
}

interface FlecheData {
  id?: string;
  code?: string;
  width: number;
  height: number;
  hiddenWordSatisfied?: boolean;
  cells: FlecheCell[][];
  words: {
    answer: string;
    clue: string;
    direction: string;
    isCustom: boolean;
    difficulty?: number | null;
  }[];
}

export default function FlechePage() {
  const router = useRouter();
  const [grid, setGrid] = useState<FlecheData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [checkErrors, setCheckErrors] = useState(false);
  const [gridWidth, setGridWidth] = useState(DEFAULT_GRID_FORMAT.w);
  const [gridHeight, setGridHeight] = useState(DEFAULT_GRID_FORMAT.h);
  const [difficulty, setDifficulty] = useState<
    "facile" | "moyen" | "difficile" | "balanced"
  >("balanced");
  const [gridKey, setGridKey] = useState(0);
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [hiddenWord, setHiddenWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [poster, setPoster] = useState(false);
  const [title, setTitle] = useState("");
  const gridTitle = title.trim();

  // Poster intent (from the homepage "Créer un poster" CTA): read client-side
  // after mount to avoid a hydration mismatch, then default to the largest
  // single-sheet format meant for framing.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("intent") === "poster") {
      setPoster(true);
      setGridWidth(DEFAULT_GRID_FORMAT.w);
      setGridHeight(DEFAULT_GRID_FORMAT.h);
    }
  }, []);

  // Valid custom words drive both the generation estimate and the button state.
  const validCustomCount = customClues.filter(
    (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
  ).length;
  const estimatedMs = estimateGenerationMs({
    width: gridWidth,
    height: gridHeight,
    customCount: validCustomCount,
  });

  // Live feasibility flagging: warn before the user hits generate when the
  // custom words can't fit (too long / too many) rather than after a long wait.
  const maxDim = Math.max(gridWidth, gridHeight);
  const minDim = Math.min(gridWidth, gridHeight);
  const capacity = analyzeCapacity(gridWidth, gridHeight, customClues);
  // Blocked: a word as long as / longer than the short side only fits one way and
  // reliably breaks generation. Matches the hard block in analyzeCapacity.
  const isWordTooLong = (answer: string) => {
    const w = normalizeAnswer(answer);
    return w.length >= 2 && w.length >= minDim;
  };

  // Block an impossible mot caché before generation (too long / too rare).
  const hiddenError = checkHiddenWord(gridWidth, gridHeight, hiddenWord);

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

      // Route hard-but-doable grids (many/long/rare words, demanding mot caché)
      // to the boosted-CPU endpoint; easy grids stay on the cheaper classic one.
      const boost = needsBoostedCompute(
        gridWidth,
        gridHeight,
        validCustom,
        cleanHidden || undefined,
      );

      const res = await fetch(boost ? "/api/fleche/generate/boost" : "/api/fleche/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: gridWidth,
          height: gridHeight,
          customClues: validCustom,
          excludeAnswers: Array.from(usedAnswers),
          hiddenWord: cleanHidden || undefined,
          title: gridTitle || undefined,
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
          next.delete(normalizeAnswer(cc.answer));
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
      // Book creation now requires an account — send anonymous users to sign
      // in, then back here to retry.
      if (res.status === 401) {
        router.push("/connexion?redirect=/fleche");
        return;
      }
      if (!res.ok) throw new Error("Failed to create book");
      const { code } = await res.json();
      router.push(`/book/${code}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="flex-1 px-4 pt-10 pb-28 md:pb-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-5xl text-ink">
            {poster ? (
              <>
                Votre <span className="text-brand">Poster</span>
              </>
            ) : (
              <>
                Mots <span className="text-brand">Fléchés</span>
              </>
            )}
          </h1>
          <p className="font-serif-accent text-lg italic text-ink/75">
            {poster
              ? "Une grande grille, prête à imprimer et à encadrer."
              : "Générez une grille personnalisée, glissez vos mots, imprimez."}
          </p>
        </div>

        {/* Before generation: pick a format, add your words, generate */}
        {!grid && !loading && (
          <div className="space-y-6 rounded-none border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">Titre</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                placeholder="ex: Joyeux anniversaire Maman (optionnel)"
                className="frame-tight w-72 max-w-full bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">Format</label>
                {GRID_FORMATS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setGridWidth(s.w); setGridHeight(s.h); }}
                    className={`rounded-none border-2 border-ink px-4 py-1.5 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${
                      gridWidth === s.w && gridHeight === s.h
                        ? "bg-ink text-paper"
                        : "bg-paper text-ink hover:bg-accent"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 text-ink/60">
                <GridFormatPreview w={gridWidth} h={gridHeight} />
                <span className="font-sans text-xs tabular-nums">
                  {gridWidth}×{gridHeight}
                </span>
              </div>
            </div>

            {/* Difficulty selector */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-2 font-display text-sm uppercase tracking-wide text-ink">Difficulté</label>
              {[
                { v: "facile", label: "Facile" },
                { v: "balanced", label: "Équilibré" },
                { v: "moyen", label: "Moyen" },
                { v: "difficile", label: "Difficile" },
              ].map((d) => (
                <button
                  key={d.v}
                  onClick={() => setDifficulty(d.v as typeof difficulty)}
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
            <div className="rounded-none border-2 border-ink/15 bg-muted/30 p-4">
              <CustomWordsEditor
                width={gridWidth}
                height={gridHeight}
                value={customClues}
                onChange={setCustomClues}
              />
            </div>

            <WordIdeasHelper
              onPick={(clue) =>
                setCustomClues((prev) => [...prev, { answer: "", clue }])
              }
            />

            {/* Hidden word — a secondary, optional touch */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                Mot caché (optionnel) :
              </label>
              <input
                placeholder="ex: ANNIVERSAIRE"
                value={hiddenWord}
                onChange={(e) => setHiddenWord(composeInput(e.target.value))}
                className={`w-48 rounded-none border px-2 py-1 text-sm uppercase font-mono ${
                  hiddenError ? "border-destructive text-destructive" : ""
                }`}
              />
              {hiddenError && (
                <p className="text-sm font-medium text-destructive">⚠ {hiddenError}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={generate}
                disabled={loading || capacity.message !== null || hiddenError !== null}
                className="btn-lapos rounded-none bg-brand px-7 py-3 text-base text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Créer ma grille
              </button>
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
            <div
              className="fleche-print-area"
              style={
                {
                  "--print-scale": computeFlechePrintScale(
                    grid.width,
                    grid.height,
                    hiddenCells.size > 0,
                    gridTitle.length > 0,
                  ),
                } as CSSProperties
              }
            >
              <div className="fleche-print-page">
                <div className="fleche-print-scale">
                  <FlechePrintHeader title={gridTitle || undefined} />
                  <div className="overflow-x-auto">
                    <FlecheGrid
                      key={gridKey}
                      cells={grid.cells}
                      width={grid.width}
                      height={grid.height}
                      showSolution={showSolution}
                      interactive={!showSolution}
                      revealErrors={checkErrors}
                      solverLayout
                      highlightedCells={hiddenCells}
                    />
                  </div>
                  <FlechePrintMotCache count={hiddenCells.size} />
                  <FlechePrintFooter />
                </div>
              </div>
              <div className="fleche-print-solution hidden print:block">
                <p className="mb-4 font-display text-xl uppercase tracking-wide text-ink">
                  Solution{gridTitle ? ` : ${gridTitle}` : ""}
                </p>
                <div className="fleche-print-scale fleche-print-solution-scale">
                  <FlecheGrid
                    cells={grid.cells}
                    width={grid.width}
                    height={grid.height}
                    showSolution
                    plain
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
                intégré, lettres absentes : {hiddenMissing.join(", ")}. Régénérez ou
                changez de mot.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              {grid.words.length} mots places
              {grid.words.some((w) => w.isCustom) && (
                <> dont {grid.words.filter((w) => w.isCustom).length} personnalise(s)</>
              )}
            </p>

            {/* List of clues added, with per-clue difficulty. Screen only. */}
            <ClueList words={grid.words} />

            {/* Grid title — editable after generation; shows on the printed sheet */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-1 font-display text-sm uppercase tracking-wide text-ink">
                Titre
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                placeholder="ex: Joyeux anniversaire Maman (optionnel)"
                className="frame-tight w-80 max-w-full bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {grid.code && (
                <span className="text-sm font-mono text-muted-foreground">{grid.code}</span>
              )}
              <Button variant="outline" className="rounded-none" onClick={() => setShowSolution(!showSolution)}>
                {showSolution ? "Cacher solution" : "Voir solution"}
              </Button>
              {!showSolution && (
                <Button variant="outline" className="rounded-none" onClick={() => setCheckErrors((v) => !v)}>
                  {checkErrors ? "Masquer les erreurs" : "Vérifier"}
                </Button>
              )}
              <Button variant="outline" className="rounded-none" onClick={() => window.print()}>
                Imprimer / PDF
              </Button>
              {grid.code && (
                <ShareGridButton
                  url={`/grille/${grid.code}`}
                  title={title}
                  variant="outline"
                  className="rounded-none"
                />
              )}
              <Button variant="outline" className="rounded-none" onClick={createBook}>
                Creer un livre
              </Button>
              {grid.code && (
                <AddToBook crosswordCode={grid.code} difficulty={difficulty} />
              )}
            </div>

            {/* Add custom words + regenerate */}
            <div className="border rounded-none p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Ajouter des mots et regenerer</p>
              <p className="text-sm text-muted-foreground">
                Grille {gridWidth}×{gridHeight} : jusqu&apos;à {capacity.recommendedMax}{" "}
                {capacity.recommendedMax > 1 ? "mots" : "mot"} recommandé
                {capacity.recommendedMax > 1 ? "s" : ""}
                {validCustomCount > 0 && (
                  <span className={validCustomCount > capacity.recommendedMax ? "text-amber-600" : ""}>
                    {" "}· {validCustomCount} ajouté{validCustomCount > 1 ? "s" : ""}
                  </span>
                )}
              </p>
              {customClues.length > 0 && (
                <div className="rounded-none border-2 border-ink/20 bg-white">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2.25rem] bg-accent/40 text-xs font-bold uppercase tracking-wide text-ink/70">
                    <div className="px-3 py-2">Mot</div>
                    <div className="border-l-2 border-ink/10 px-3 py-2">Indice</div>
                    <div />
                  </div>
                  {customClues.map((cc, i) => {
                    const tooLong = isWordTooLong(cc.answer);
                    return (
                      <div key={i} className="border-t-2 border-ink/10">
                        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2.25rem] items-stretch">
                          <input
                            placeholder="ex : BON ANNIVERSAIRE"
                            value={cc.answer}
                            onChange={(e) => {
                              const next = [...customClues];
                              next[i] = { ...next[i], answer: composeInput(e.target.value) };
                              setCustomClues(next);
                            }}
                            className={`w-full bg-transparent px-3 py-2.5 font-mono text-base uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground/60 ${
                              tooLong ? "text-destructive" : "text-ink"
                            }`}
                          />
                          <input
                            placeholder="ex : La fille du moment !"
                            value={cc.clue}
                            onChange={(e) => {
                              const next = [...customClues];
                              next[i] = { ...next[i], clue: e.target.value };
                              setCustomClues(next);
                            }}
                            className="w-full border-l-2 border-ink/10 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60"
                          />
                          <button
                            onClick={() => setCustomClues(customClues.filter((_, j) => j !== i))}
                            className="flex items-center justify-center text-muted-foreground hover:text-destructive"
                            aria-label="Retirer ce mot"
                          >
                            ✕
                          </button>
                        </div>
                        {tooLong && (
                          <p className="border-t-2 border-ink/10 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
                            Trop long pour une grille {gridWidth}×{gridHeight} (max {minDim - 1} lettres).
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {capacity.message && (
                <p className="text-sm font-medium text-destructive">⚠ {capacity.message}</p>
              )}
              {!capacity.message && capacity.overRecommended && (
                <p className="text-sm text-amber-600">
                  Au-delà de {capacity.recommendedMax} mots, la génération peut être plus
                  longue, voire échouer sur cette grille.
                </p>
              )}
              {!capacity.message && !capacity.overRecommended && capacity.tight && (
                <p className="text-sm text-amber-600">
                  Grille bien remplie, la génération peut être plus longue, voire échouer.
                </p>
              )}

              {/* Hidden word */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Mot caché :</label>
                <input
                  placeholder="ex: ANNIVERSAIRE"
                  value={hiddenWord}
                  onChange={(e) => setHiddenWord(composeInput(e.target.value))}
                  className="border rounded-none px-2 py-1 text-sm w-48 uppercase font-mono bg-white"
                />
                {hiddenCells.size > 0 && (
                  <span className="text-xs text-green-600">
                    ✓ {hiddenCells.size} lettres réparties dans la grille
                  </span>
                )}
                {hiddenMissing.length > 0 && (
                  <span className="text-xs text-destructive">
                    ⚠ lettres absentes : {hiddenMissing.join(", ")}, régénérez
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
                  className="rounded-none border-2 border-ink bg-paper px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
                >
                  + Ajouter un mot
                </button>
                <button
                  onClick={generate}
                  disabled={loading || capacity.message !== null || hiddenError !== null}
                  className="btn-lapos rounded-none bg-brand px-6 py-2.5 text-sm text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Régénérer
                </button>
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
