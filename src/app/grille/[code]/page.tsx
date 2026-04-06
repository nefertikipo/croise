"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  title: string | null;
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: { answer: string; clue: string; direction: string; isCustom: boolean; startRow: number; startCol: number; length: number }[];
}

export default function GrillePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);

  const loadGrid = useCallback(async () => {
    try {
      const res = await fetch(`/api/grille/${code}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGrid(data);
      setTitle(data.title || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  async function updateTitle() {
    if (!grid || title === (grid.title || "")) return;
    await fetch(`/api/grille/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
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

  if (!grid) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-destructive">Grille introuvable</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={updateTitle}
            placeholder="Nommer cette grille..."
            className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary outline-none"
          />
          <span className="text-sm font-mono text-muted-foreground">{code}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? "Cacher solution" : "Voir solution"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Imprimer / PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Lien copie!" : "Copier le lien"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/fleche")}>
            Nouvelle grille
          </Button>
        </div>

        <div className="fleche-print-area">
          <div className="overflow-x-auto">
            <FlecheGrid
              cells={grid.cells}
              width={grid.width}
              height={grid.height}
              showSolution={showSolution}
              interactive={!showSolution}
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

        <p className="text-sm text-muted-foreground">
          {grid.words.length} mots
        </p>
      </div>
    </main>
  );
}
