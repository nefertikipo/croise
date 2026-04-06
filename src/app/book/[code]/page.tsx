"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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

interface GridData {
  id: string;
  code: string;
  position: number;
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: { answer: string; clue: string; direction: string; isCustom: boolean }[];
}

interface BookData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  dedicationText: string | null;
  grids: GridData[];
}

export default function BookPage() {
  const params = useParams();
  const code = params.code as string;

  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeGrid, setActiveGrid] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);

  const loadBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${code}`);
      if (!res.ok) return;
      const data = await res.json();
      setBook(data);
      setTitle(data.title);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  async function addGrid() {
    if (!book) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/books/${code}/grids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: 11,
          height: 17,
          customClues: customClues.filter(
            (c) => c.answer.trim().length >= 3 && c.clue.trim().length > 0,
          ),
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const grid = await res.json();
      setBook((prev) => prev ? { ...prev, grids: [...prev.grids, grid] } : prev);
      setActiveGrid(book.grids.length); // switch to new grid
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function removeGrid(gridId: string) {
    if (!book) return;
    try {
      await fetch(`/api/books/${code}/grids/${gridId}`, { method: "DELETE" });
      setBook((prev) => {
        if (!prev) return prev;
        const newGrids = prev.grids.filter((g) => g.id !== gridId);
        return { ...prev, grids: newGrids };
      });
      setActiveGrid((prev) => Math.min(prev, (book.grids.length - 2)));
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTitle() {
    if (!book || title === book.title) return;
    await fetch(`/api/books/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBook((prev) => prev ? { ...prev, title } : prev);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/book/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-destructive">Livre introuvable</p>
        </div>
      </main>
    );
  }

  const currentGrid = book.grids[activeGrid] ?? null;

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={updateTitle}
            className="text-3xl font-bold bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary outline-none"
          />
          <span className="text-sm text-muted-foreground font-mono">{code}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={addGrid} disabled={generating}>
            {generating ? "Generation..." : "+ Ajouter une grille"}
          </Button>
          <Button variant="outline" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? "Cacher solutions" : "Voir solutions"}
          </Button>
          {book.grids.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              Imprimer le livre
            </Button>
          )}
          <Button variant="outline" onClick={copyShareLink}>
            {copied ? "Lien copie!" : "Copier le lien"}
          </Button>
        </div>

        {/* Custom words */}
        <div>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-sm text-muted-foreground underline"
          >
            {showCustom ? "Cacher les mots personnalises" : "Mots personnalises"}
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

        {/* Grid navigation */}
        {book.grids.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Grilles:</span>
            {book.grids.map((g, i) => (
              <div key={g.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveGrid(i)}
                  className={`w-8 h-8 rounded text-sm ${
                    activeGrid === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {i + 1}
                </button>
                {activeGrid === i && book.grids.length > 1 && (
                  <button
                    onClick={() => removeGrid(g.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    title="Supprimer cette grille"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active grid display */}
        {currentGrid && (
          <div className="overflow-x-auto">
            <FlecheGrid
              cells={currentGrid.cells}
              width={currentGrid.width}
              height={currentGrid.height}
              showSolution={showSolution}
              interactive={!showSolution}
            />
          </div>
        )}

        {book.grids.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            Aucune grille. Cliquez sur &quot;+ Ajouter une grille&quot; pour commencer.
          </p>
        )}

        {currentGrid && (
          <p className="text-sm text-muted-foreground">
            {currentGrid.words.length} mots — Grille {activeGrid + 1} / {book.grids.length}
          </p>
        )}

        {/* Print view: all grids */}
        {book.grids.length > 0 && (
          <div className="hidden fleche-print-area">
            {book.grids.map((g, i) => (
              <div key={g.id}>
                {i > 0 && <div className="print:break-before-page" />}
                <div className="text-center text-sm font-medium mb-2 print:block">
                  Grille {i + 1}
                </div>
                <FlecheGrid
                  cells={g.cells}
                  width={g.width}
                  height={g.height}
                  showSolution={false}
                />
                <div className="print:break-before-page" />
                <div className="rotate-180">
                  <FlecheGrid
                    cells={g.cells}
                    width={g.width}
                    height={g.height}
                    showSolution
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
