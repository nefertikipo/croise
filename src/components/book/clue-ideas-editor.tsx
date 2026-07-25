"use client";

import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { ClueIdea } from "@/types/book";

interface ClueIdeasEditorProps {
  ideas: ClueIdea[];
  /** Normalized custom answer → grid numbers it was placed in (for the "used" badge). */
  usage: Map<string, number[]>;
  onChange: (next: ClueIdea[]) => void;
}

/** Ideas with no category fall under this heading, kept last. */
const UNCATEGORIZED = "Sans catégorie";

/**
 * The clue-idea notepad. A design-time scratchpad (not a printed page) where the
 * maker jots answer + clue ideas up front, then drops them into any grid from the
 * grid creator / regenerate panel. Each row shows whether the idea has landed in
 * a grid yet — usage is derived live from the book's custom placed words, so a
 * regenerate marks it used and deleting that grid frees it again.
 *
 * Rows carry an optional category (a friend group, a situation, "Général"). The
 * notepad groups by it so a theme reads together, and the grid picker can then
 * fill a whole grid from one category.
 */
export function ClueIdeasEditor({ ideas, usage, onChange }: ClueIdeasEditorProps) {
  function update(id: string, patch: Partial<ClueIdea>) {
    onChange(ideas.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
  }

  function add(category?: string) {
    onChange([...ideas, { id: crypto.randomUUID(), answer: "", clue: "", category }]);
  }

  function remove(id: string) {
    onChange(ideas.filter((idea) => idea.id !== id));
  }

  const usedCount = ideas.filter(
    (idea) => idea.answer.trim() && usage.get(normalizeAnswer(idea.answer))?.length,
  ).length;

  // Distinct categories / authors already in use, for the quick-pick datalists.
  const categories = Array.from(
    new Set(ideas.map((i) => i.category?.trim()).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "fr"));
  const authors = Array.from(
    new Set(ideas.map((i) => i.author?.trim()).filter((a): a is string => !!a)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  // Group rows by category (blank → "Sans catégorie", kept last), each group in
  // first-seen order so editing never reshuffles a row out from under the cursor.
  const groupOrder: string[] = [];
  const groups = new Map<string, ClueIdea[]>();
  for (const idea of ideas) {
    const key = idea.category?.trim() || UNCATEGORIZED;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(idea);
  }
  groupOrder.sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, "fr");
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-xl uppercase">Carnet d&apos;idées</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Un carnet pour noter vos idées de mots et d&apos;indices. Rien n&apos;est
          imprimé ici, piochez-les ensuite dans vos grilles. Rangez-les par
          catégorie (un groupe d&apos;amis, une situation, « Général »). Facultatif.
        </p>
        {ideas.length > 0 && (
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {usedCount} sur {ideas.length} utilisée{ideas.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <datalist id="clue-idea-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="clue-idea-authors">
        {authors.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {groupOrder.map((groupKey) => (
        <div key={groupKey} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {groupKey}
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {groups.get(groupKey)!.length}
            </span>
          </div>

          {groups.get(groupKey)!.map((idea) => {
            const grids = idea.answer.trim()
              ? usage.get(normalizeAnswer(idea.answer))
              : undefined;
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
                <div className="flex items-center gap-2">
                  <input
                    list="clue-idea-categories"
                    placeholder="Catégorie (ex: HEC, Général)"
                    value={idea.category ?? ""}
                    onChange={(e) => update(idea.id, { category: e.target.value })}
                    className="w-40 rounded-none border-2 border-ink/15 bg-white px-2 py-0.5 text-xs"
                  />
                  <input
                    list="clue-idea-authors"
                    placeholder="De qui ? (ex: Théo)"
                    value={idea.author ?? ""}
                    onChange={(e) => update(idea.id, { author: e.target.value })}
                    className="w-32 rounded-none border-2 border-ink/15 bg-white px-2 py-0.5 text-xs"
                  />
                </div>
                <div>
                  {used ? (
                    <span className="text-xs font-medium text-emerald-700">
                      ✓ Utilisée dans {grids!.length > 1 ? "les grilles" : "la grille"}{" "}
                      {grids!.join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pas encore utilisée</span>
                  )}
                </div>
              </div>
            );
          })}

          {groupKey !== UNCATEGORIZED && (
            <button
              onClick={() => add(groupKey)}
              className="text-xs font-medium text-muted-foreground hover:text-primary"
            >
              + Ajouter dans « {groupKey} »
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => add()}
        className="rounded-none border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
      >
        + Ajouter une idée
      </button>
    </div>
  );
}
