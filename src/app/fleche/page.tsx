"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";

interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: { text: string; direction: "right" | "down"; answerRow: number; answerCol: number; answerLength: number; answer: string }[];
}

interface FlecheData {
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: { answer: string; clue: string; direction: string; isCustom: boolean }[];
}

export default function FlechePage() {
  const [grid, setGrid] = useState<FlecheData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [gridWidth, setGridWidth] = useState(17);
  const [gridHeight, setGridHeight] = useState(11);
  const [gridKey, setGridKey] = useState(0);
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [showCustom, setShowCustom] = useState(false);

  async function generate() {
    setLoading(true);
    setShowSolution(false);
    try {
      const res = await fetch("/api/fleche/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: gridWidth,
          height: gridHeight,
          customClues: customClues.filter((c) => c.answer.trim().length >= 3 && c.clue.trim().length > 0),
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setGrid(data);
      setGridKey((k) => k + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mots Fleches</h1>
          <p className="text-muted-foreground">
            Grille de mots fleches avec indices dans les cases
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Format:</label>
            {[
              { w: 17, h: 11, label: "17x11" },
              { w: 13, h: 9, label: "13x9" },
              { w: 10, h: 10, label: "10x10" },
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
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generation..." : "Generer"}
          </Button>
          {grid && (
            <>
              <Button
                variant="outline"
                onClick={() => setGridKey((k) => k + 1)}
              >
                Effacer
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? "Cacher solution" : "Voir solution"}
              </Button>
            </>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-sm text-muted-foreground underline"
          >
            {showCustom ? "Cacher les mots personnalises" : "Ajouter des mots personnalises"}
          </button>

          {showCustom && (
            <div className="mt-3 space-y-2">
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
                    className="border rounded px-2 py-1 text-sm w-32 uppercase font-mono"
                  />
                  <input
                    placeholder="Indice (ex: La fille du moment!)"
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
                    Supprimer
                  </button>
                </div>
              ))}
              <button
                onClick={() => setCustomClues([...customClues, { answer: "", clue: "" }])}
                className="text-sm border rounded px-3 py-1 hover:bg-muted"
              >
                + Ajouter un mot
              </button>
            </div>
          )}
        </div>

        {grid && (
          <div className="overflow-x-auto">
            <FlecheGrid
              key={gridKey}
              cells={grid.cells}
              width={grid.width}
              height={grid.height}
              showSolution={showSolution}
              interactive={!showSolution}
            />
          </div>
        )}

        {grid && (
          <p className="text-sm text-muted-foreground">
            {grid.words.length} mots places
          </p>
        )}
      </div>
    </main>
  );
}
