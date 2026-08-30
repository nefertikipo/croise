"use client";

// =============================================================================
// /croises — American-style crossword ("mots croisés") generator + solver
// =============================================================================
// Milestone 1: prove the engine. Generate one grid and solve it on screen.
// No persistence / sharing / PDF yet.
// =============================================================================

import { useState } from "react";
import { CrosswordGrid } from "@/components/crossword/crossword-grid";
import type { AmPuzzle } from "@/lib/crossword/american/types";

const TEMPLATES = [
  { id: "mini-7", label: "7 × 7 (mini)" },
  { id: "small-9", label: "9 × 9" },
  { id: "medium-11", label: "11 × 11" },
  { id: "large-13", label: "13 × 13" },
  { id: "daily-15", label: "15 × 15 (quotidien)" },
  { id: "sunday-21", label: "21 × 21 (dimanche)" },
];

const DIFFICULTIES = [
  { id: "balanced", label: "Varié" },
  { id: "facile", label: "Facile" },
  { id: "moyen", label: "Moyen" },
  { id: "difficile", label: "Difficile" },
];

export default function CroisesPage() {
  const [templateId, setTemplateId] = useState("medium-11");
  const [difficulty, setDifficulty] = useState("balanced");
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<AmPuzzle | null>(null);
  const [unplaced, setUnplaced] = useState<string[]>([]);
  const [code, setCode] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setUnplaced([]);
    setCode(null);
    try {
      // Custom words: one per line, "ANSWER: clue" (clue optional).
      const customClues = customText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [answer, ...rest] = line.split(":");
          return { answer: answer.trim(), clue: rest.join(":").trim() || answer.trim() };
        });

      const res = await fetch("/api/croises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, difficulty, customClues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la génération");
      setPuzzle(data.puzzle);
      setUnplaced(data.unplacedCustom ?? []);
      setCode(data.code ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide text-brand">
        Mots croisés
      </h1>
      <p className="mt-1 font-serif text-sm italic text-ink/70">
        Générateur de mots croisés à l&apos;américaine — grille symétrique, cases
        noires, définitions numérotées.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-none border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
        <label className="flex flex-col gap-1">
          <span className="font-display text-sm uppercase tracking-wide text-ink">Format</span>
          <span className="font-display text-[11px] uppercase tracking-wide text-ink/45">
            s&apos;agrandit pour les mots longs
          </span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-none border-2 border-ink/20 bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-sm uppercase tracking-wide text-ink">Difficulté</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-none border-2 border-ink/20 bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <span className="font-display text-sm uppercase tracking-wide text-ink">
            Mots personnalisés <span className="text-ink/45">(un par ligne, « MOT: définition »)</span>
          </span>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder={"ELISE: Prénom de la destinataire\nNOEL: Fête de décembre"}
            className="rounded-none border-2 border-ink/20 bg-paper px-3 py-1.5 font-mono text-xs text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-lapos rounded-none bg-brand px-7 py-3 text-base text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? "Génération…" : "Générer"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-none border-2 border-brand/40 bg-brand/5 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
      {unplaced.length > 0 && (
        <p className="mt-4 rounded-none border-2 border-ink/15 bg-muted/30 px-3 py-2 text-sm text-ink">
          Mots non placés dans ce format : {unplaced.join(", ")}. Essayez un format plus grand.
        </p>
      )}

      {code && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-none border-2 border-ink/15 bg-accent/40 px-3 py-2 text-sm text-ink">
          <span>
            Lien de partage :{" "}
            <a href={`/croises/${code}`} className="font-medium text-brand underline">
              /croises/{code}
            </a>
          </span>
          <a
            href={`/api/croises/${code}/pdf`}
            target="_blank"
            rel="noopener"
            className="font-medium text-brand underline"
          >
            Télécharger le PDF
          </a>
        </div>
      )}

      {puzzle && (
        <div className="mt-8">
          <CrosswordGrid puzzle={puzzle} />
        </div>
      )}
    </main>
  );
}
