"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * A single book tile on "Mes livres" with an inline delete button.
 * The delete button sits outside the <Link> so it stays independently
 * clickable; a first click arms an inline "Confirmer / Annuler" strip.
 */
export function BookCard({
  code,
  title,
  statusLabel,
  dateLabel,
}: {
  code: string;
  title: string;
  statusLabel: string;
  dateLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setConfirming(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${code}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Impossible de supprimer le livre.");
        setDeleting(false);
        return;
      }
      toast.success("Livre supprimé.");
      router.refresh();
    } catch {
      toast.error("Impossible de supprimer le livre.");
      setDeleting(false);
    }
  }

  return (
    <div className="relative">
      <Link
        href={`/book/${code}`}
        className="block h-full border-2 border-ink bg-paper p-5 pr-12 shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-xl uppercase tracking-wide text-ink">
            {title}
          </span>
          <span className="shrink-0 font-display text-xs uppercase tracking-wide text-ink/50">
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-brand">{code}</p>
        <p className="mt-2 font-serif text-xs italic text-ink/60">{dateLabel}</p>
      </Link>
      {confirming ? (
        <div className="absolute right-2 top-2 flex items-center gap-1.5 border border-ink/20 bg-paper px-2 py-1 shadow-sm">
          <span className="text-xs text-ink/70">Supprimer ce livre ?</span>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs font-semibold uppercase text-brand hover:underline"
          >
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs uppercase text-ink/50 hover:underline"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={deleting}
          aria-label="Supprimer le livre"
          title="Supprimer"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-lg leading-none text-ink/40 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand disabled:opacity-40"
        >
          {deleting ? "…" : "✕"}
        </button>
      )}
    </div>
  );
}
