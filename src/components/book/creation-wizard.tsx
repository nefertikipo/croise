"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateEmptyBookButton } from "@/components/shared/create-book-link";
import { composeInput, normalizeAnswer } from "@/lib/crossword/normalize";
import { CLUE_EXAMPLES, DIFFICULTY_INFO } from "@/lib/fleche/difficulty-guide";
import { BOOK_MIN_GRIDS } from "@/lib/books/constants";
import { buildWizardPlan, splitHiddenMessage } from "@/lib/books/wizard-plan";
import { cn } from "@/lib/utils";
import type { ClueIdea, GridDifficulty } from "@/types/book";

const STEPS = ["Pour qui ?", "Vos mots", "Message caché", "Difficulté"] as const;

/** Occasion chip → editable dedication seed. "Autre" seeds nothing on purpose. */
const OCCASIONS: { label: string; seed: string }[] = [
  { label: "Anniversaire", seed: "Pour ton anniversaire, un livre rien que pour toi." },
  { label: "Noël", seed: "Joyeux Noël ! Un livre rien que pour toi." },
  { label: "Retraite", seed: "Pour ta retraite, des grilles à savourer sans compter." },
  { label: "Fête", seed: "Bonne fête ! Un livre rien que pour toi." },
  { label: "Autre", seed: "" },
];

/** The three difficulty cards (the "moyen" preset stays reachable per grid later).
 * "Facile" is the recommended default: gift books get solved on the sofa, not
 * fought with. */
const WIZARD_DIFFICULTIES: { v: GridDifficulty; label: string; recommended?: boolean }[] = [
  { v: "facile", label: "Facile", recommended: true },
  { v: "balanced", label: "Équilibré" },
  { v: "difficile", label: "Difficile" },
];

/** Hidden-message words longer than this get a "hard to place" soft warning. */
const LONG_HIDDEN_WORD = 8;

interface WordRow {
  id: string;
  answer: string;
  clue: string;
}

/**
 * Guided book creation: recipient → personal words → hidden message →
 * difficulty. On submit the book is created with title, dedication and the
 * words saved to its clue-idea notepad, and a generation plan (one entry per
 * grid) is handed to the editor via sessionStorage — the editor auto-generates
 * the grids while the user starts on the cover.
 */
export function CreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [dedication, setDedication] = useState("");
  const [rows, setRows] = useState<WordRow[]>(() => [
    { id: crypto.randomUUID(), answer: "", clue: "" },
    { id: crypto.randomUUID(), answer: "", clue: "" },
    { id: crypto.randomUUID(), answer: "", clue: "" },
  ]);
  const [message, setMessage] = useState("");
  const [difficulty, setDifficulty] = useState<GridDifficulty>("facile");
  const [submitting, setSubmitting] = useState(false);

  const validRows = rows.filter(
    (r) => normalizeAnswer(r.answer).length >= 2 && r.clue.trim().length > 0,
  );
  const messageWords = splitHiddenMessage(message, BOOK_MIN_GRIDS);
  const totalMessageWords = splitHiddenMessage(message, Number.MAX_SAFE_INTEGER).length;
  const hasLongMessageWord = messageWords.some((w) => w.length > LONG_HIDDEN_WORD);

  function pickOccasion(label: string, seed: string) {
    if (occasion === label) {
      setOccasion(null);
      setDedication("");
      return;
    }
    setOccasion(label);
    setDedication(seed);
  }

  function updateRow(id: string, patch: Partial<WordRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ideas: ClueIdea[] = validRows.map((r) => ({
        id: r.id,
        answer: r.answer.trim(),
        clue: r.clue.trim(),
      }));
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Les flèches de ${firstName.trim()}`,
          dedicationText: dedication.trim() || undefined,
          clueIdeas: ideas.length > 0 ? ideas : undefined,
        }),
      });
      if (res.status === 401) {
        router.push("/connexion?redirect=/livre/nouveau");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Impossible de créer le livre. Réessayez.");
      }
      const { code } = (await res.json()) as { code: string };
      const plan = buildWizardPlan({ ideas, messageWords, difficulty });
      try {
        sessionStorage.setItem(`book-wizard-plan-${code}`, JSON.stringify(plan));
      } catch {
        // Storage unavailable: the book still opens; the editor's empty-book
        // onboarding takes over (the words stay in the notepad).
      }
      router.push(`/book/${code}`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Impossible de créer le livre. Réessayez.",
      );
      setSubmitting(false);
    }
  }

  const canContinue = step === 0 ? firstName.trim().length > 0 : true;
  const lastStep = step === STEPS.length - 1;

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-4xl text-ink">
            Créer un <span className="text-brand">livre</span>
          </h1>
          <p className="font-serif-accent mt-1 text-lg italic text-ink/75">
            Quatre questions, et vos grilles se préparent toutes seules.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <span
              key={label}
              title={label}
              className={cn(
                "h-2.5 w-2.5 border-2 border-ink transition-colors",
                i <= step ? "bg-ink" : "bg-paper",
              )}
            />
          ))}
        </div>

        <div className="space-y-6 rounded-none border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
          <h2 className="font-heading text-xl uppercase">{STEPS[step]}</h2>

          {/* Step 1: recipient */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="wizard-first-name"
                  className="font-display text-sm uppercase tracking-wide text-ink"
                >
                  Prénom de la personne
                </label>
                <input
                  id="wizard-first-name"
                  placeholder="ex: Mamie, Louise, Papa"
                  value={firstName}
                  onChange={(e) => setFirstName(composeInput(e.target.value))}
                  className="w-full rounded-none border-2 border-ink/20 bg-white px-3 py-2 text-sm"
                />
                {firstName.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Le livre s&apos;appellera «&nbsp;Les flèches de {firstName.trim()}&nbsp;»,
                    modifiable ensuite.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-display text-sm uppercase tracking-wide text-ink">
                  Pour quelle occasion&nbsp;? <span className="text-ink/50">(facultatif)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => pickOccasion(o.label, o.seed)}
                      className={cn(
                        "rounded-none border-2 border-ink px-3 py-1.5 font-sans text-sm font-semibold uppercase tracking-wide transition-colors",
                        occasion === o.label
                          ? "bg-ink text-paper"
                          : "bg-paper text-ink hover:bg-accent",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="wizard-dedication"
                  className="font-display text-sm uppercase tracking-wide text-ink"
                >
                  Dédicace <span className="text-ink/50">(modifiable)</span>
                </label>
                <textarea
                  id="wizard-dedication"
                  rows={2}
                  placeholder="Quelques mots imprimés en ouverture du livre…"
                  value={dedication}
                  onChange={(e) => setDedication(composeInput(e.target.value))}
                  className="w-full rounded-none border-2 border-ink/20 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: personal words */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Prénoms, surnoms, lieux, souvenirs, clins d&apos;œil : chaque mot
                accompagné de son indice sera glissé dans les grilles. Visez 10 à
                30 mots pour un livre bien personnalisé.
              </p>

              {/* Reassurance: the wizard is not a one-shot commitment. */}
              <div className="border-2 border-ink bg-accent/40 p-4">
                <p className="text-sm">
                  <span className="font-bold">Pas de pression :</span> vous pourrez
                  ajouter, modifier ou retirer des mots à tout moment après la
                  création. Chaque grille peut être régénérée, et vos idées non
                  placées restent dans votre carnet.
                </p>
              </div>

              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      placeholder="Mot (ex: MAMIE)"
                      value={row.answer}
                      onChange={(e) =>
                        updateRow(row.id, { answer: composeInput(e.target.value) })
                      }
                      className="w-32 rounded-none border-2 border-ink/20 bg-white px-2 py-1 font-mono text-sm uppercase"
                    />
                    <input
                      placeholder="Indice (ex: La reine des crêpes)"
                      value={row.clue}
                      onChange={(e) => updateRow(row.id, { clue: e.target.value })}
                      className="min-w-0 flex-1 rounded-none border-2 border-ink/20 bg-white px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="text-sm text-muted-foreground hover:text-destructive"
                      aria-label="Retirer ce mot"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), answer: "", clue: "" },
                    ])
                  }
                  className="rounded-none border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
                >
                  + Ajouter un mot
                </button>
                {validRows.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {validRows.length} mot{validRows.length > 1 ? "s" : ""} prêt
                    {validRows.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {validRows.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun mot pour l&apos;instant&nbsp;? Continuez : le livre sera généré
                  avec des grilles classiques, à personnaliser ensuite.
                </p>
              )}
            </div>
          )}

          {/* Step 3: hidden message */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un mot caché par grille : à chaque grille résolue, la personne
                découvre un mot, et le message se révèle au fil du livre.
                Facultatif, vous pouvez passer cette étape.
              </p>
              <textarea
                rows={3}
                placeholder="ex: JOYEUX ANNIVERSAIRE MAMIE ON T AIME FORT"
                value={message}
                onChange={(e) => setMessage(composeInput(e.target.value))}
                className="w-full rounded-none border-2 border-ink/20 bg-white px-3 py-2 font-mono text-sm uppercase"
              />
              {messageWords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {messageWords.length} mot{messageWords.length > 1 ? "s" : ""} sur{" "}
                    {BOOK_MIN_GRIDS}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {messageWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className={cn(
                          "border-2 px-2 py-0.5 font-mono text-xs",
                          w.length > LONG_HIDDEN_WORD
                            ? "border-amber-600 text-amber-700"
                            : "border-ink/30 text-ink",
                        )}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                  {hasLongMessageWord && (
                    <p className="text-xs text-amber-600">
                      Attention : les mots longs sont plus difficiles à placer
                      (au-delà de {LONG_HIDDEN_WORD} lettres).
                    </p>
                  )}
                  {totalMessageWords > BOOK_MIN_GRIDS && (
                    <p className="text-xs text-amber-600">
                      Seuls les {BOOK_MIN_GRIDS} premiers mots seront utilisés, un
                      par grille.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: difficulty */}
          {step === 3 && (
            <div className="space-y-3">
              {WIZARD_DIFFICULTIES.map((d) => {
                const info = DIFFICULTY_INFO[d.v];
                const selected = difficulty === d.v;
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setDifficulty(d.v)}
                    aria-pressed={selected}
                    className={cn(
                      "w-full rounded-none border-2 border-ink p-4 text-left transition-colors",
                      selected
                        ? "bg-accent/60 shadow-[3px_3px_0_0] shadow-ink/80"
                        : "bg-paper hover:bg-accent/20",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="font-display text-sm uppercase tracking-wide text-ink">
                          {d.label}
                        </span>
                        {d.recommended && (
                          <span className="border border-ink bg-paper px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                            Recommandé
                          </span>
                        )}
                      </span>
                      {selected && <span className="text-sm font-bold text-brand">✓</span>}
                    </span>
                    <span className="mt-1 block font-serif-accent text-sm italic text-ink/75">
                      {info.help}
                    </span>
                    <span className="mt-2 block space-y-1">
                      {info.show.map((lvl) => {
                        const ex = CLUE_EXAMPLES[lvl];
                        return (
                          <span key={lvl} className="block text-xs text-ink/70">
                            <span className="italic">« {ex.clue} »</span> →{" "}
                            <span className="font-mono font-semibold">{ex.answer}</span>
                          </span>
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 border-t-2 border-ink/10 pt-4">
            {step > 0 ? (
              <Button variant="outline" disabled={submitting} onClick={() => setStep(step - 1)}>
                Retour
              </Button>
            ) : (
              <span />
            )}
            {lastStep ? (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-lapos rounded-none bg-brand px-7 py-3 text-base text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? "Création…" : "Créer mon livre"}
              </button>
            ) : (
              <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
                {step === 2 && messageWords.length === 0 ? "Passer" : "Continuer"}
              </Button>
            )}
          </div>
        </div>

        {/* Escape hatch, only before any effort has been put in. */}
        {step === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Vous préférez partir d&apos;une page blanche&nbsp;?{" "}
            <CreateEmptyBookButton className="underline underline-offset-2 hover:text-foreground disabled:opacity-50">
              Créer un livre vide
            </CreateEmptyBookButton>
          </p>
        )}
      </div>
    </main>
  );
}
