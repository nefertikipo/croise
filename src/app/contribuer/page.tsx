"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SubmittedClue {
  word: string;
  clue: string;
}

export default function ContributePage() {
  const [word, setWord] = useState("");
  const [clue, setClue] = useState("");
  const [author, setAuthor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lesfleches-author") || "";
    }
    return "";
  });
  const [submitted, setSubmitted] = useState<SubmittedClue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!word.trim() || !clue.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (author) {
        localStorage.setItem("lesfleches-author", author);
      }

      const res = await fetch("/api/admin/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim(), clue: clue.trim(), author: author.trim(), difficulty }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }

      setSubmitted((prev) => [{ word: word.toUpperCase(), clue: clue.trim() }, ...prev]);
      setWord("");
      setClue("");
    } catch {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Contribuer des indices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ecrivez vos propres indices de mots fleches. Ils seront relus avant d'etre utilises dans les grilles.
          </p>
        </div>

        {/* Author */}
        <div>
          <label className="text-sm font-medium">Votre nom (optionnel)</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="ex: Louise"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Word + Clue input */}
        <div className="border rounded-xl p-6 space-y-4 bg-white shadow-sm">
          <div>
            <label className="text-sm font-medium">Mot</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="ex: CROISSANT"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-lg uppercase font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("clue-input")?.focus();
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Indice</label>
            <input
              id="clue-input"
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              placeholder="ex: viennoiserie du matin"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              L'indice ne doit pas contenir le mot lui-meme
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Difficulte</label>
            <div className="flex gap-2 mt-1">
              {([1, 2, 3] as const).map((d) => {
                const labels = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
                const colors = {
                  1: difficulty === d ? "bg-green-200 border-green-400 text-green-700" : "bg-green-50 border-green-200 text-green-600",
                  2: difficulty === d ? "bg-amber-200 border-amber-400 text-amber-700" : "bg-amber-50 border-amber-200 text-amber-600",
                  3: difficulty === d ? "bg-red-200 border-red-400 text-red-700" : "bg-red-50 border-red-200 text-red-600",
                };
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${colors[d]}`}
                  >
                    {labels[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={submit} disabled={saving || !word.trim() || !clue.trim()} className="w-full">
            {saving ? "Envoi..." : "Soumettre"}
          </Button>
        </div>

        {/* Recently submitted */}
        {submitted.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Soumis ({submitted.length})
            </h2>
            {submitted.map((s, i) => (
              <div key={i} className="flex gap-3 text-sm border rounded-lg px-3 py-2">
                <span className="font-mono font-bold uppercase">{s.word}</span>
                <span className="text-muted-foreground">{s.clue}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
