"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface SubmittedClue {
  word: string;
  clue: string;
}

interface Contribution {
  word: string;
  clue: string;
  difficulty: number | null;
  author: string | null;
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
  const [contributions, setContributions] = useState<Contribution[]>([]);

  async function loadContributions() {
    try {
      const res = await fetch("/api/contributions");
      if (res.ok) setContributions(await res.json());
    } catch {}
  }

  useEffect(() => { loadContributions(); }, []);

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
      loadContributions();
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
          <h1 className="text-4xl">Contribuer des indices</h1>
          <p className="font-serif-accent mt-2 text-lg italic text-ink/80">
            Ecrivez vos propres indices de mots fléchés. Ils seront relus avant
            d&apos;être utilisés dans les grilles.
          </p>
        </div>

        {/* Author */}
        <div>
          <label className="font-display text-xs uppercase tracking-[0.2em] text-ink">
            Votre nom (optionnel)
          </label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="ex: Louise"
            className="frame-tight mt-2 w-full bg-paper px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        {/* Word + Clue input */}
        <div className="frame space-y-4 bg-paper p-6">
          <div>
            <label className="font-display text-xs uppercase tracking-[0.2em] text-ink">
              Mot
            </label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="ex: CROISSANT"
              className="frame-tight mt-2 w-full bg-paper px-3 py-2 text-lg uppercase font-mono focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("clue-input")?.focus();
                }
              }}
            />
          </div>

          <div>
            <label className="font-display text-xs uppercase tracking-[0.2em] text-ink">
              Indice
            </label>
            <input
              id="clue-input"
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              placeholder="ex: viennoiserie du matin"
              className="frame-tight mt-2 w-full bg-paper px-3 py-2 text-sm focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <p className="font-serif-accent mt-2 text-xs italic text-ink/70">
              L&apos;indice ne doit pas contenir le mot lui-même
            </p>
          </div>

          <div>
            <label className="font-display text-xs uppercase tracking-[0.2em] text-ink">
              Difficulté
            </label>
            <div className="flex gap-2 mt-2">
              {([1, 2, 3] as const).map((d) => {
                const labels = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
                const selected = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-none border-2 border-ink px-4 py-1.5 font-display uppercase tracking-wide text-sm transition-colors ${
                      selected
                        ? "bg-ink text-paper"
                        : "bg-paper text-ink hover:bg-accent"
                    }`}
                  >
                    {labels[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-brand">{error}</p>}

          <Button
            onClick={submit}
            disabled={saving || !word.trim() || !clue.trim()}
            className="btn-lapos w-full rounded-none bg-brand px-6 py-3 text-sm text-brand-foreground"
          >
            {saving ? "Envoi..." : "Soumettre"}
          </Button>
        </div>

        {/* Community contributions */}
        {contributions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-2xl">
              Indices de la communauté ({contributions.length})
            </h2>
            {contributions.map((c, i) => {
              const diffLabel = c.difficulty ? ["", "Facile", "Moyen", "Difficile"][c.difficulty] : null;
              const diffColor = c.difficulty
                ? { 1: "text-turquoise", 2: "text-sun", 3: "text-brand" }[c.difficulty]
                : "";
              return (
                <div key={i} className="frame-tight flex items-center gap-3 bg-paper px-3 py-2 text-sm">
                  <span className="font-mono font-bold uppercase shrink-0 w-24 truncate">{c.word}</span>
                  <span className="font-serif-accent flex-1 italic text-ink/70">{c.clue}</span>
                  {diffLabel && <span className={`font-display text-xs uppercase tracking-wide shrink-0 ${diffColor}`}>{diffLabel}</span>}
                  {c.author && <span className="text-xs text-ink/40 shrink-0">{c.author}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
