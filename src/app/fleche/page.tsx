"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";

interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: { text: string; direction: "right" | "down"; answerLength: number; answer: string }[];
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
  const [size, setSize] = useState(10);

  async function generate() {
    setLoading(true);
    setShowSolution(false);
    try {
      const res = await fetch("/api/fleche/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width: size, height: size }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setGrid(data);
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
            <label className="text-sm font-medium">Taille:</label>
            {[8, 10, 12].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1 rounded text-sm ${
                  size === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {s}x{s}
              </button>
            ))}
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generation..." : "Generer"}
          </Button>
          {grid && (
            <Button
              variant="outline"
              onClick={() => setShowSolution(!showSolution)}
            >
              {showSolution ? "Cacher solution" : "Voir solution"}
            </Button>
          )}
        </div>

        {grid && (
          <div className="overflow-x-auto">
            <FlecheGrid
              cells={grid.cells}
              width={grid.width}
              height={grid.height}
              showSolution={showSolution}
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
