"use client";

import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { ClueIdea } from "@/types/book";

interface ClueIdeasEditorProps {
  ideas: ClueIdea[];
  /** Normalized custom answer → grid numbers it was placed in (for the "used" badge). */
  usage: Map<string, number[]>;
  onChange: (next: ClueIdea[]) => void;
}

/**
 * The clue-idea notepad. A design-time scratchpad (not a printed page) where the
 * maker jots answer + clue ideas up front, then drops them into any grid from the
 * grid creator / regenerate panel. Each row shows whether the idea has landed in
 * a grid yet — usage is derived live from the book's custom placed words, so a
 * regenerate marks it used and deleting that grid frees it again.
 */
export function ClueIdeasEditor({ ideas, usage, onChange }: ClueIdeasEditorProps) {
  function update(id: string, patch: Partial<ClueIdea>) {
    onChange(ideas.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
  }

  function add() {
    onChange([...ideas, { id: crypto.randomUUID(), answer: "", clue: "" }]);
  }

  function remove(id: string) {
    onChange(ideas.filter((idea) => idea.id !== id));
  }

  const usedCount = ideas.filter(
    (idea) => idea.answer.trim() && usage.get(normalizeAnswer(idea.answer))?.length,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-xl uppercase">Carnet d&apos;idées</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Un carnet pour noter vos idées de mots et d&apos;indices. Rien n&apos;est
          imprimé ici, piochez-les ensuite dans vos grilles. Facultatif.
        </p>
        {ideas.length > 0 && (
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {usedCount} sur {ideas.length} utilisée{ideas.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {ideas.map((idea) => {
        const grids = idea.answer.trim() ? usage.get(normalizeAnswer(idea.answer)) : undefined;
        const used = !!grids?.length;
        return (
          <div key={idea.id} className="space-y-1 border-2 border-ink/15 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <input
                placeholder="Mot (ex: MAMIE)"
                value={idea.answer}
                onChange={(e) => update(idea.id, { answer: e.target.value })}
                className="w-32 rounded-none border-2 border-ink/20 bg-white px-2 py-1 text-sm uppercase font-mono"
              />
              <input
                placeholder="Indice (ex: La reine des crêpes)"
                value={idea.clue}
                onChange={(e) => update(idea.id, { clue: e.target.value })}
                className="flex-1 rounded-none border-2 border-ink/20 bg-white px-2 py-1 text-sm"
              />
              <button
                onClick={() => remove(idea.id)}
                className="text-sm text-muted-foreground hover:text-destructive"
                aria-label="Retirer cette idée"
              >
                ✕
              </button>
            </div>
            {used ? (
              <p className="text-xs font-medium text-emerald-700">
                ✓ Utilisée dans {grids!.length > 1 ? "les grilles" : "la grille"}{" "}
                {grids!.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Pas encore utilisée</p>
            )}
          </div>
        );
      })}

      <button
        onClick={add}
        className="rounded-none border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
      >
        + Ajouter une idée
      </button>
    </div>
  );
}
