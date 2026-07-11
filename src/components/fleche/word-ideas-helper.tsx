"use client";

import { useState } from "react";

import { WORD_IDEAS } from "@/lib/word-ideas";

// In-flow inspiration for the /fleche composer. Pick a recipient, then click a
// prompt to drop it in as a clue (the user fills the answer with their own word).
export function WordIdeasHelper({ onPick }: { onPick: (clue: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(WORD_IDEAS[0].slug);
  const recipient = WORD_IDEAS.find((r) => r.slug === active) ?? WORD_IDEAS[0];

  return (
    <div className="rounded-none border-2 border-ink/15 bg-gold/10 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span>
          <span className="text-sm font-bold uppercase tracking-[0.12em]">
            Besoin d&apos;inspiration ?
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Des idées de mots selon la personne à qui vous offrez la grille.
          </span>
        </span>
        <span className="ml-3 shrink-0 text-brand">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {WORD_IDEAS.map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => setActive(r.slug)}
                className={`rounded-none border-2 px-3 py-1 text-sm transition-colors ${
                  r.slug === active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-white text-ink hover:border-ink/50"
                }`}
              >
                Pour {r.label}
              </button>
            ))}
          </div>

          {recipient.groups.map((group) => (
            <div key={group.theme}>
              <p className="font-display text-xs uppercase tracking-[0.16em] text-brand">
                {group.theme}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => onPick(idea)}
                    title="Ajouter comme indice"
                    className="rounded-none border border-ink/20 bg-white px-2.5 py-1 text-sm text-ink/80 transition-colors hover:border-brand hover:text-brand"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Cliquez une idée pour l&apos;ajouter comme indice, puis écrivez le mot
            correspondant.
          </p>
        </div>
      )}
    </div>
  );
}
