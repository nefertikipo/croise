"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";

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
  const [gridKey, setGridKey] = useState(0);
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [hiddenWord, setHiddenWord] = useState("");
  const [hiddenCells, setHiddenCells] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Find cells in the grid that spell out the hidden word.
   * Picks one cell per letter, spreading them across the grid.
   * Returns a map of "row,col" -> position (1-indexed).
   */
  function findHiddenWordCells(gridData: FlecheData, word: string): Map<string, number> {
    const target = word.toUpperCase().replace(/[^A-Z]/g, "");
    if (!target) return new Map();

    // Build a map of letter -> list of (row, col) positions
    const letterPositions = new Map<string, { r: number; c: number }[]>();
    for (let r = 0; r < gridData.height; r++) {
      for (let c = 0; c < gridData.width; c++) {
        const cell = gridData.cells[r][c];
        if (cell.type === "letter" && cell.letter) {
          const letter = cell.letter.toUpperCase();
          if (!letterPositions.has(letter)) letterPositions.set(letter, []);
          letterPositions.get(letter)!.push({ r, c });
        }
      }
    }

    // Greedily pick one cell per letter, trying to spread across the grid
    const used = new Set<string>();
    const result = new Map<string, number>();

    for (let i = 0; i < target.length; i++) {
      const letter = target[i];
      const positions = letterPositions.get(letter);
      if (!positions) return new Map(); // letter not in grid, can't form word

      // Pick a position not yet used, preferring spread
      let best: { r: number; c: number } | null = null;
      let bestScore = -1;

      for (const pos of positions) {
        const key = `${pos.r},${pos.c}`;
        if (used.has(key)) continue;

        // Score: distance from all already-picked cells (prefer spread)
        let minDist = Infinity;
        for (const usedKey of used) {
          const [ur, uc] = usedKey.split(",").map(Number);
          const dist = Math.abs(pos.r - ur) + Math.abs(pos.c - uc);
          minDist = Math.min(minDist, dist);
        }
        const score = used.size === 0 ? 0 : minDist;

        if (score > bestScore) {
          bestScore = score;
          best = pos;
        }
      }

      if (!best) return new Map(); // no unused cell with this letter
      const key = `${best.r},${best.c}`;
      used.add(key);
      result.set(key, i + 1);
    }

    return result;
  }

  async function generate() {
    setLoading(true);
    setShowSolution(false);
    setError(null);
    try {
      const validCustom = customClues.filter(
        (c) => c.answer.trim().length >= 2 && c.clue.trim().length > 0,
      );
      const cleanHidden = hiddenWord.toUpperCase().replace(/[^A-Z]/g, "");

      const res = await fetch("/api/fleche/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: gridWidth,
          height: gridHeight,
          customClues: validCustom,
          excludeAnswers: Array.from(usedAnswers),
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

      // Find scattered cells for hidden word
      if (cleanHidden.length >= 2) {
        const found = findHiddenWordCells(data, cleanHidden);
        setHiddenCells(found);
      } else {
        setHiddenCells(new Map());
      }

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
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Mon livre de mots fleches" }),
      });
      if (!res.ok) throw new Error("Failed to create book");
      const { code } = await res.json();
      router.push(`/book/${code}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mots Fleches</h1>
          <p className="text-muted-foreground">
            Generez une grille de mots fleches personnalisee
          </p>
        </div>

        {/* Before generation: simple start */}
        {!grid && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Format:</label>
              {[
                { w: 11, h: 17, label: "11x17" },
                { w: 9, h: 13, label: "9x13" },
                { w: 8, h: 11, label: "8x11" },
                { w: 5, h: 7, label: "5x7" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setGridWidth(s.w); setGridHeight(s.h); }}
                  className={`px-3 py-1 rounded text-sm ${
                    gridWidth === s.w && gridHeight === s.h
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Custom words (optional, before first generation) */}
            {customClues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Mots personnalises:</p>
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
                      className="border rounded px-2 py-1 text-sm w-32 uppercase font-mono"
                    />
                    <input
                      placeholder="Indice"
                      value={cc.clue}
                      onChange={(e) => {
                        const next = [...customClues];
                        next[i] = { ...next[i], clue: e.target.value };
                        setCustomClues(next);
                      }}
                      className="border rounded px-2 py-1 text-sm flex-1"
                    />
                    <button
                      onClick={() => setCustomClues(customClues.filter((_, j) => j !== i))}
                      className="text-sm text-muted-foreground hover:text-destructive"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Mot cache:</label>
              <input
                placeholder="ex: ANNIVERSAIRE"
                value={hiddenWord}
                onChange={(e) => setHiddenWord(e.target.value)}
                className="border rounded px-2 py-1 text-sm w-48 uppercase font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={generate} disabled={loading} size="lg">
                {loading ? "Generation..." : "Generer une grille"}
              </Button>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <button
                onClick={() => setCustomClues([...customClues, { answer: "", clue: "" }])}
                className="text-sm text-muted-foreground underline"
              >
                + Ajouter un mot personnalise
              </button>
            </div>
          </div>
        )}

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
                <span className="text-sm font-medium mr-2">Mot cache:</span>
                {Array.from({ length: hiddenCells.size }, (_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 border-2 border-primary flex items-center justify-center text-xs text-muted-foreground"
                  >
                    {showSolution
                      ? hiddenWord.toUpperCase().replace(/[^A-Z]/g, "")[i]
                      : i + 1}
                  </div>
                ))}
              </div>
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
                  <div key={i} className="flex items-center gap-2">
                    <input
                      placeholder="Mot (ex: SARAH)"
                      value={cc.answer}
                      onChange={(e) => {
                        const next = [...customClues];
                        next[i] = { ...next[i], answer: e.target.value };
                        setCustomClues(next);
                      }}
                      className="border rounded px-2 py-1 text-sm w-32 uppercase font-mono bg-white"
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
                ))}
              </div>

              {/* Hidden word */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Mot cache:</label>
                <input
                  placeholder="ex: ANNIVERSAIRE"
                  value={hiddenWord}
                  onChange={(e) => setHiddenWord(e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-48 uppercase font-mono bg-white"
                />
                {hiddenCells.size > 0 && (
                  <span className="text-xs text-green-600">
                    {hiddenCells.size} lettres dans la grille
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  (integre a la prochaine generation)
                </span>
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
                <Button onClick={generate} disabled={loading}>
                  {loading ? "Generation..." : "Regenerer"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
