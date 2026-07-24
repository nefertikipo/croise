"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * A single book tile on "Mes livres" with an inline delete button.
 * The delete button sits outside the <Link> so it stays independently clickable.
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer ce livre ? Cette action est définitive.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${code}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || "Impossible de supprimer le livre.");
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Impossible de supprimer le livre.");
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
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Supprimer le livre"
        title="Supprimer"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-lg leading-none text-ink/40 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand disabled:opacity-40"
      >
        {deleting ? "…" : "✕"}
      </button>
    </div>
  );
}
