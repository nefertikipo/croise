"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AUTHOR_KEY = "lesfleches-author";

interface ContributeFormProps {
  code: string;
  bookTitle: string;
}

/**
 * Public form a friend uses to add one clue to someone's carnet (via the share
 * link). No account: the share code is the credential. The contributor's name
 * is remembered in localStorage (same key as /contribuer) so adding several in
 * a row doesn't retype it, and it becomes ClueIdea.author — credited in the
 * finished book's dedication.
 */
export function ContributeForm({ code, bookTitle }: ContributeFormProps) {
  const [answer, setAnswer] = useState("");
  const [clue, setClue] = useState("");
  const [author, setAuthor] = useState("");
  const [sending, setSending] = useState(false);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      if (saved) setAuthor(saved);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (answer.trim().length < 2 || !clue.trim()) {
      toast.error("Ajoutez un mot (2 lettres min.) et son indice.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/books/${code}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answer.trim(),
          clue: clue.trim(),
          author: author.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Impossible d'ajouter cet indice. Réessayez.");
        return;
      }
      try {
        if (author.trim()) localStorage.setItem(AUTHOR_KEY, author.trim());
      } catch {
        /* ignore */
      }
      setAnswer("");
      setClue("");
      setAdded((n) => n + 1);
      toast.success("Merci ! Votre indice est ajouté au carnet.");
    } catch {
      toast.error("Connexion perdue. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="font-display text-xs uppercase tracking-[0.2em]">
          Le mot
        </label>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="MAMIE"
          maxLength={120}
          className="w-full rounded-none border-2 border-ink bg-white px-3 py-2 font-mono text-lg uppercase"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label className="font-display text-xs uppercase tracking-[0.2em]">
          L&apos;indice
        </label>
        <input
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          placeholder="La reine des crêpes du dimanche"
          maxLength={500}
          className="w-full rounded-none border-2 border-ink bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="font-display text-xs uppercase tracking-[0.2em]">
          Votre prénom{" "}
          <span className="font-serif-accent normal-case italic text-ink/60">
            (pour la dédicace)
          </span>
        </label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Théo"
          maxLength={80}
          className="w-full rounded-none border-2 border-ink/30 bg-white px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={sending} className="w-full">
        {sending ? "Un instant…" : "Ajouter mon indice"}
      </Button>

      {added > 0 && (
        <p className="text-center text-sm font-semibold text-ink">
          {added} indice{added > 1 ? "s" : ""} ajouté{added > 1 ? "s" : ""} pour «&nbsp;
          {bookTitle}&nbsp;». Ajoutez-en un autre !
        </p>
      )}
    </form>
  );
}
