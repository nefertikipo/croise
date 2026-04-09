"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ClueData {
  id: number;
  word: string;
  clue: string;
  source: string;
}

interface Stats {
  total: number;
  labeled: number;
  facile: number;
  moyen: number;
  difficile: number;
}

export default function LabelPage() {
  const [pair, setPair] = useState<ClueData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedClue, setEditedClue] = useState("");
  const [loved, setLoved] = useState(false);

  // Solve mode state
  const [revealed, setRevealed] = useState(false);
  const [guessLetters, setGuessLetters] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [solveStartTime, setSolveStartTime] = useState(0);
  const [solveTime, setSolveTime] = useState<number | null>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    setGuessLetters([]);
    setSelectedCell(0);
    setHintsUsed(0);
    setRevealedLetters(new Set());
    setSolveTime(null);
    setLoved(false);
    setEditing(false);
    try {
      const res = await fetch("/api/admin/label?calibration=true");
      const data = await res.json();
      if (data.done) {
        setDone(true);
        setPair(null);
      } else {
        setPair(data.pair);
        setStats(data.stats);
        setDone(false);
        setSolveStartTime(Date.now());
        setGuessLetters(new Array(data.pair.word.length).fill(""));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  function revealAnswer() {
    setRevealed(true);
    setSolveTime(Date.now() - solveStartTime);
  }

  function revealHint() {
    if (!pair) return;
    const unrevealed = [];
    for (let i = 0; i < pair.word.length; i++) {
      if (!revealedLetters.has(i) && !guessLetters[i]) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setRevealedLetters((prev) => new Set([...prev, idx]));
    setHintsUsed((prev) => prev + 1);
  }

  function handleCellKey(index: number, e: React.KeyboardEvent) {
    if (!pair) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (guessLetters[index]) {
        setGuessLetters((prev) => { const n = [...prev]; n[index] = ""; return n; });
      } else if (index > 0) {
        setSelectedCell(index - 1);
        setGuessLetters((prev) => { const n = [...prev]; n[index - 1] = ""; return n; });
        cellRefs.current.get(index - 1)?.focus();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      setSelectedCell(index - 1);
      cellRefs.current.get(index - 1)?.focus();
      return;
    }
    if (e.key === "ArrowRight" && index < pair.word.length - 1) {
      e.preventDefault();
      setSelectedCell(index + 1);
      cellRefs.current.get(index + 1)?.focus();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      revealAnswer();
      return;
    }

    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      const newLetters = [...guessLetters];
      newLetters[index] = letter;
      setGuessLetters(newLetters);

      // Check if solved
      const full = newLetters.every((l, i) => l === pair.word[i] || revealedLetters.has(i));
      if (full) {
        setRevealed(true);
        setSolveTime(Date.now() - solveStartTime);
        return;
      }

      // Move to next empty cell
      for (let next = index + 1; next < pair.word.length; next++) {
        if (!newLetters[next] && !revealedLetters.has(next)) {
          setSelectedCell(next);
          cellRefs.current.get(next)?.focus();
          return;
        }
      }
    }
  }

  async function label(difficulty: 1 | 2 | 3) {
    if (!pair) return;
    const labels = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
    const timeStr = solveTime ? ` (${(solveTime / 1000).toFixed(1)}s, ${hintsUsed} indices)` : "";
    const newClue = editing && editedClue.trim() !== pair.clue ? editedClue.trim() : undefined;
    setLastAction(`${pair.word} → ${labels[difficulty]}${timeStr}${newClue ? " (modifie)" : ""}`);

    await fetch("/api/admin/label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clueId: pair.id,
        difficulty,
        newClue,
        loved,
        solveTimeMs: solveTime,
        hintsUsed,
      }),
    });

    setEditing(false);
    setLoved(false);
    fetchNext();
  }

  function toggleLove() {
    setLoved((prev) => !prev);
  }

  async function deleteBad() {
    if (!pair) return;
    setLastAction(`${pair.word} / "${pair.clue}" → supprime`);

    await fetch("/api/admin/label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clueId: pair.id, action: "delete" }),
    });

    fetchNext();
  }

  function skip() {
    setLastAction("Passe");
    fetchNext();
  }

  // Keyboard shortcuts: only number keys after reveal, escape to reveal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT") return;

      if (!revealed) {
        if (e.key === "Escape") { e.preventDefault(); revealAnswer(); }
        return;
      }

      // After reveal: number keys for difficulty
      if (e.key === "1") label(1);
      else if (e.key === "2") label(2);
      else if (e.key === "3") label(3);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (done) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Tout est labellise!</h1>
          <p className="text-muted-foreground">Plus aucune paire a scorer.</p>
          {stats && (
            <p className="text-sm">
              {stats.facile} facile / {stats.moyen} moyen / {stats.difficile} difficile
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Calibration LLM</h1>
          <p className="text-xs text-violet-600 mt-1">100 paires test pour comparer avec le LLM</p>
          <p className="text-sm text-muted-foreground mt-1">
            {!revealed
              ? "Tapez dans les cases, Echap = reveler"
              : "1 = Facile, 2 = Moyen, 3 = Difficile"
            }
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-green-600 font-medium">{stats.facile} facile</span>
            <span className="text-amber-600 font-medium">{stats.moyen} moyen</span>
            <span className="text-red-600 font-medium">{stats.difficile} difficile</span>
            <span className="text-muted-foreground">{stats.labeled} / {stats.total}</span>
          </div>
        )}

        {/* Card */}
        {pair && !loading && (
          <div className="border rounded-xl p-8 space-y-6 bg-white shadow-sm">

            {/* Clue (always visible) */}
            <div className="text-center">
              {editing ? (
                <input
                  value={editedClue}
                  onChange={(e) => setEditedClue(e.target.value)}
                  className="text-lg text-center w-full border-b-2 border-primary bg-transparent outline-none py-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditing(false); }
                  }}
                />
              ) : (
                <p className="text-xl italic text-foreground">
                  &laquo; {pair.clue} &raquo;
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {pair.word.length} lettres
              </p>
            </div>

            {/* Solve phase: guess or reveal */}
            {!revealed && (
              <div className="space-y-4">
                {/* Interactive grid cells */}
                <div className="flex justify-center gap-1">
                  {[...pair.word].map((ch, i) => {
                    const isHinted = revealedLetters.has(i);
                    const letter = isHinted ? ch : guessLetters[i] || "";
                    const isSelected = selectedCell === i;
                    return (
                      <div
                        key={i}
                        ref={(el) => { if (el) cellRefs.current.set(i, el); }}
                        tabIndex={0}
                        onClick={() => {
                          if (!isHinted) {
                            setSelectedCell(i);
                            cellRefs.current.get(i)?.focus();
                          }
                        }}
                        onKeyDown={(e) => handleCellKey(i, e)}
                        className={`w-10 h-10 border-2 flex items-center justify-center bg-white outline-none cursor-pointer transition-colors ${
                          isSelected && !isHinted ? "border-primary ring-2 ring-primary/30" : "border-black/30"
                        }`}
                      >
                        <span className={`text-lg font-bold uppercase font-mono ${
                          isHinted ? "text-blue-600" : "text-black"
                        }`}>
                          {letter}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Hint + Reveal buttons */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={revealHint}
                    className="text-sm px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
                  >
                    ? - Indice ({hintsUsed})
                  </button>
                  <button
                    onClick={revealAnswer}
                    className="text-sm px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors"
                  >
                    R - Reveler
                  </button>
                  <button
                    onClick={deleteBad}
                    className="text-sm px-4 py-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 border border-gray-200 transition-colors"
                  >
                    X - Supprimer
                  </button>
                  <button
                    onClick={skip}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    Passer
                  </button>
                </div>
              </div>
            )}

            {/* Rating phase: after reveal */}
            {revealed && (
              <div className="space-y-4">
                {/* Answer word in grid format */}
                <div className="flex justify-center gap-1">
                  {[...pair.word].map((ch, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 border-2 border-black/30 flex items-center justify-center bg-white"
                    >
                      <span className="text-lg font-bold uppercase font-mono text-black">
                        {ch}
                      </span>
                    </div>
                  ))}
                </div>
                {solveTime && (
                  <p className="text-xs text-muted-foreground text-center">
                    {(solveTime / 1000).toFixed(1)}s
                    {hintsUsed > 0 && ` · ${hintsUsed} indice${hintsUsed > 1 ? "s" : ""}`}
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  source: {pair.source}
                  {!editing && (
                    <> &middot; <button onClick={() => { setEditing(true); setEditedClue(pair.clue); }} className="underline hover:text-foreground">modifier</button></>
                  )}
                </p>

                {/* Difficulty buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => label(1)}
                    className="flex-1 py-4 rounded-lg text-lg font-medium bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 transition-colors"
                  >
                    1 - Facile
                  </button>
                  <button
                    onClick={() => label(2)}
                    className="flex-1 py-4 rounded-lg text-lg font-medium bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-700 transition-colors"
                  >
                    2 - Moyen
                  </button>
                  <button
                    onClick={() => label(3)}
                    className="flex-1 py-4 rounded-lg text-lg font-medium bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 transition-colors"
                  >
                    3 - Difficile
                  </button>
                </div>

                {/* Love + Delete + Skip */}
                <div className="flex justify-center gap-4 items-center">
                  <button
                    onClick={toggleLove}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      loved
                        ? "bg-pink-200 text-pink-700 border-pink-400"
                        : "bg-pink-50 hover:bg-pink-100 text-pink-500 hover:text-pink-600 border-pink-200"
                    }`}
                  >
                    {loved ? "♥ Favori" : "L - Favori"}
                  </button>
                  <button
                    onClick={deleteBad}
                    className="text-sm px-4 py-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 border border-gray-200 transition-colors"
                  >
                    X - Supprimer
                  </button>
                  <button
                    onClick={skip}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    Passer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center text-muted-foreground py-12">
            Chargement...
          </div>
        )}

        {/* Last action feedback */}
        {lastAction && (
          <p className="text-center text-sm text-muted-foreground">
            {lastAction}
          </p>
        )}
      </div>
    </main>
  );
}
