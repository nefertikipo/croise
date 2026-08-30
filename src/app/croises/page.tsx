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
      <h1 className="text-2xl font-bold">Mots croisés</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Générateur de mots croisés à l&apos;américaine — grille symétrique, cases
        noires, définitions numérotées.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border bg-neutral-50 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Format</span>
          <span className="text-xs font-normal text-neutral-500">
            s&apos;agrandit pour les mots longs
          </span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Difficulté</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Mots personnalisés (un par ligne, « MOT: définition »)</span>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder={"ELISE: Prénom de la destinataire\nNOEL: Fête de décembre"}
            className="rounded border px-2 py-1.5 font-mono text-xs"
          />
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Génération…" : "Générer"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {unplaced.length > 0 && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Mots non placés dans ce format : {unplaced.join(", ")}. Essayez un format plus grand.
        </p>
      )}

      {code && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>
            Lien de partage :{" "}
            <a href={`/croises/${code}`} className="font-medium underline">
              /croises/{code}
            </a>
          </span>
          <a
            href={`/api/croises/${code}/pdf`}
            target="_blank"
            rel="noopener"
            className="font-medium underline"
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
