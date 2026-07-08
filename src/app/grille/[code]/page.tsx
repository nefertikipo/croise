"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import {
  FlechePrintHeader,
  FlechePrintMotCache,
  computeFlechePrintScale,
} from "@/components/fleche/fleche-print-chrome";

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
  hiddenWord?: string;
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

  const cleanHidden = normalizeHiddenWord(grid?.hiddenWord ?? "");
  const hiddenCells = useMemo(() => {
    if (!grid || cleanHidden.length < 2) return new Map<string, number>();
    return findHiddenWordCells(grid, cleanHidden);
  }, [grid, cleanHidden]);

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
          <p className="font-serif-accent text-lg italic text-ink/70">Chargement...</p>
        </div>
      </main>
    );
  }

  if (!grid) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-brand">Grille introuvable</p>
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
            className="font-display text-2xl uppercase tracking-wide bg-transparent border-b-2 border-transparent hover:border-ink/30 focus:border-ink outline-none"
          />
          <span className="text-sm font-mono text-ink/60">{code}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowSolution(!showSolution)}
            className="btn-lapos rounded-md bg-sun px-4 py-2.5 text-sm text-ink"
          >
            {showSolution ? "Cacher solution" : "Voir solution"}
          </Button>
          <Button
            onClick={() => window.print()}
            className="btn-lapos rounded-md bg-brand px-4 py-2.5 text-sm text-brand-foreground"
          >
            Imprimer / PDF
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="btn-lapos rounded-md bg-paper px-4 py-2.5 text-sm text-ink"
          >
            {copied ? "Lien copié!" : "Copier le lien"}
          </Button>
          <Button
            onClick={() => router.push("/fleche")}
            className="btn-lapos rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
          >
            Nouvelle grille
          </Button>
        </div>

        <div
          className="fleche-print-area"
          style={
            {
              "--print-scale": computeFlechePrintScale(
                grid.width,
                grid.height,
                hiddenCells.size > 0,
              ),
            } as CSSProperties
          }
        >
          <div className="fleche-print-page">
            <div className="fleche-print-scale">
              <FlechePrintHeader />
              <div className="overflow-x-auto">
                <FlecheGrid
                  cells={grid.cells}
                  width={grid.width}
                  height={grid.height}
                  showSolution={showSolution}
                  interactive={!showSolution}
                  highlightedCells={hiddenCells}
                />
              </div>
              <FlechePrintMotCache count={hiddenCells.size} />
            </div>
          </div>
          <div className="fleche-print-solution hidden print:block">
            <div className="fleche-print-scale">
              <div className="rotate-180">
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
        </div>

        {hiddenCells.size > 0 && (
          <div className="flex items-center gap-1">
            <span className="mr-2 font-display text-sm uppercase tracking-[0.2em] text-ink">Mot caché :</span>
            {Array.from({ length: hiddenCells.size }, (_, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink text-xs text-ink/70"
              >
                {showSolution ? cleanHidden[i] : i + 1}
              </div>
            ))}
          </div>
        )}

        <p className="font-serif-accent text-sm italic text-ink/70">
          {grid.words.length} mots
        </p>
      </div>
    </main>
  );
}
