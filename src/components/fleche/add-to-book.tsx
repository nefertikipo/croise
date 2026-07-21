"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GridDifficulty } from "@/types/book";

interface BookSummary {
  code: string;
  title: string;
  gridCount: number;
}

interface Conflict {
  bookCode: string;
  words: string[];
  clues: string[];
}

interface AddToBookProps {
  /** Code of the standalone grid currently shown, to attach to a chosen book. */
  crosswordCode: string;
  /** Clue difficulty to use if the grid has to be regenerated to fit the book. */
  difficulty?: GridDifficulty;
}

/**
 * Adds the current standalone /fleche grid to one of the signed-in user's
 * existing books. If the grid reuses words/clues the book already has, the API
 * reports the conflict and we offer to regenerate the grid to fit (keeping its
 * custom words) or add it anyway.
 */
export function AddToBook({ crosswordCode, difficulty }: AddToBookProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openPanel() {
    setOpen(true);
    setConflict(null);
    setDone(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/books");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { books: BookSummary[] };
      setBooks(data.books);
    } catch {
      setError("Impossible de charger vos livres.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  async function attach(
    bookCode: string,
    opts?: { regenerateToFit?: boolean; force?: boolean },
  ) {
    setBusyCode(bookCode);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookCode}/pages/attach-grid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crosswordCode,
          ...opts,
          config: difficulty ? { difficulty } : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as
        | { conflict: { words: string[]; clues: string[] } }
        | { pageId: string };
      if ("conflict" in data) {
        setConflict({ bookCode, ...data.conflict });
        return;
      }
      setConflict(null);
      setDone(bookCode);
    } catch {
      setError("Échec de l'ajout.");
    } finally {
      setBusyCode(null);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" className="rounded-none" onClick={openPanel}>
        Ajouter à un livre
      </Button>
    );
  }

  return (
    <div className="border-2 border-ink rounded-none bg-white p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Ajouter à un livre existant</p>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {done && (
        <div className="text-sm space-y-2">
          <p className="text-brand">✓ Grille ajoutée au livre.</p>
          <a href={`/book/${done}`} className="underline hover:no-underline">
            Ouvrir le livre →
          </a>
        </div>
      )}

      {!done && conflict && (
        <div className="space-y-2 border-2 border-destructive/40 p-3 bg-destructive/5">
          <p className="text-sm">
            Cette grille réutilise déjà{" "}
            {conflict.words.length > 0 && (
              <>
                {conflict.words.length} mot
                {conflict.words.length > 1 ? "s" : ""}
              </>
            )}
            {conflict.words.length > 0 && conflict.clues.length > 0 && " et "}
            {conflict.clues.length > 0 && (
              <>
                {conflict.clues.length} définition
                {conflict.clues.length > 1 ? "s" : ""}
              </>
            )}{" "}
            de ce livre.
          </p>
          {conflict.words.length > 0 && (
            <p className="text-xs font-mono text-muted-foreground break-words">
              {conflict.words.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              className="rounded-none"
              disabled={busyCode === conflict.bookCode}
              onClick={() => attach(conflict.bookCode, { regenerateToFit: true })}
            >
              {busyCode === conflict.bookCode ? "Régénération…" : "Régénérer pour ce livre"}
            </Button>
            <Button
              variant="outline"
              className="rounded-none"
              disabled={busyCode === conflict.bookCode}
              onClick={() => attach(conflict.bookCode, { force: true })}
            >
              Ajouter quand même
            </Button>
          </div>
        </div>
      )}

      {!done && !conflict && (
        <>
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && books && books.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore de livre. Créez-en un avec « Créer un livre ».
            </p>
          )}
          {!loading && books && books.length > 0 && (
            <ul className="space-y-1 max-h-64 overflow-auto">
              {books.map((b) => (
                <li key={b.code}>
                  <button
                    disabled={busyCode !== null}
                    onClick={() => attach(b.code)}
                    className="w-full text-left border-2 border-transparent hover:border-ink px-2 py-1.5 flex items-center justify-between gap-2 disabled:opacity-50"
                  >
                    <span className="text-sm truncate">{b.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {busyCode === b.code
                        ? "Ajout…"
                        : `${b.gridCount} grille${b.gridCount > 1 ? "s" : ""}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
