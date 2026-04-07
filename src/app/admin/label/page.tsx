"use client";

import { useState, useEffect, useCallback } from "react";

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

  const fetchNext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/label");
      const data = await res.json();
      if (data.done) {
        setDone(true);
        setPair(null);
      } else {
        setPair(data.pair);
        setStats(data.stats);
        setDone(false);
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

  async function label(difficulty: 1 | 2 | 3) {
    if (!pair) return;
    const labels = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
    const newClue = editing && editedClue.trim() !== pair.clue ? editedClue.trim() : undefined;
    setLastAction(`${pair.word} → ${labels[difficulty]}${newClue ? " (modifie)" : ""}`);

    await fetch("/api/admin/label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clueId: pair.id, difficulty, newClue, loved }),
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

  // Keyboard shortcuts (disabled while editing)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editing) return;
      if (e.key === "1") label(1);
      else if (e.key === "2") label(2);
      else if (e.key === "3") label(3);
      else if (e.key === "l") toggleLove();
      else if (e.key === "x" || e.key === "0") deleteBad();
      else if (e.key === "e") { e.preventDefault(); if (pair) { setEditing(true); setEditedClue(pair.clue); } }
      else if (e.key === " ") { e.preventDefault(); skip(); }
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
          <h1 className="text-2xl font-bold">Scorer les indices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            1 = Facile, 2 = Moyen, 3 = Difficile, L = Favori, X = Supprimer, Espace = Passer
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
            {/* Answer word */}
            <div className="text-center">
              <span className="text-4xl font-bold font-mono tracking-widest uppercase">
                {pair.word}
              </span>
              <span className="text-sm text-muted-foreground ml-3">
                {pair.word.length} lettres
              </span>
            </div>

            {/* Clue */}
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
                <p
                  className="text-lg italic text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => { setEditing(true); setEditedClue(pair.clue); }}
                  title="Cliquer pour modifier"
                >
                  &laquo; {pair.clue} &raquo;
                </p>
              )}
              <p className="text-xs text-muted-foreground/50 mt-2">
                source: {pair.source}
                {!editing && (
                  <> &middot; <button onClick={() => { setEditing(true); setEditedClue(pair.clue); }} className="underline hover:text-foreground">modifier</button></>
                )}
              </p>
            </div>

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
