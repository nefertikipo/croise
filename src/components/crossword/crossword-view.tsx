"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GridDisplay } from "@/components/crossword/grid-display";
import { ClueList } from "@/components/crossword/clue-list";

interface WordInfo {
  answer: string;
  clue: string;
  direction: "across" | "down";
  number: number;
  startRow: number;
  startCol: number;
  length: number;
  isCustom: boolean;
}

interface CrosswordViewProps {
  grid: string[];
  words: WordInfo[];
  code: string;
}

export function CrosswordView({ grid, words, code }: CrosswordViewProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCellClick(row: number, col: number) {
    const word = words.find(
      (w) =>
        (w.direction === "across" &&
          row === w.startRow &&
          col >= w.startCol &&
          col < w.startCol + w.length) ||
        (w.direction === "down" &&
          col === w.startCol &&
          row >= w.startRow &&
          row < w.startRow + w.length)
    );
    if (word) {
      setHighlightedWord(
        highlightedWord === word.number ? null : word.number
      );
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/crossword/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="shrink-0">
          <GridDisplay
            grid={grid}
            words={words}
            showSolution={showSolution}
            highlightedWord={highlightedWord}
            onCellClick={handleCellClick}
          />
        </div>
        <div className="flex-1 min-w-0">
          <ClueList
            words={words}
            highlightedWord={highlightedWord}
            onClueClick={setHighlightedWord}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setShowSolution(!showSolution)}
        >
          {showSolution ? "Hide solution" : "Show solution"}
        </Button>
        <Button variant="outline" onClick={copyLink}>
          {copied ? "Copied!" : "Copy share link"}
        </Button>
        <Button
          render={<a href={`/api/crosswords/${code}/pdf`} target="_blank" />}
        >
          Download PDF
        </Button>
      </div>
    </div>
  );
}
