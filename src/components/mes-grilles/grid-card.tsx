"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * A single grid tile on "Mes grilles" with an inline delete button.
 * The delete button sits outside the <Link> so it stays independently clickable.
 */
export function GridCard({
  code,
  title,
  size,
  href,
  dateLabel,
  kind = "fleche",
}: {
  code: string;
  title: string;
  size: string;
  href: string;
  dateLabel: string;
  /** Puzzle type — drives the badge and the delete endpoint. */
  kind?: "fleche" | "croise";
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer cette grille ? Cette action est définitive.")) {
      return;
    }
    setDeleting(true);
    try {
      const endpoint =
        kind === "croise" ? `/api/croises/${code}` : `/api/crosswords/${code}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || "Impossible de supprimer la grille.");
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Impossible de supprimer la grille.");
      setDeleting(false);
    }
  }

  return (
    <div className="relative">
      <Link
        href={href}
        className="block h-full border-2 border-ink bg-paper p-5 pr-12 shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-xl uppercase tracking-wide text-ink">
            {title}
          </span>
          <span className="shrink-0 font-display text-xs uppercase tracking-wide text-ink/50">
            {size}
          </span>
        </div>
        <span className="mt-2 inline-block border border-ink/30 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wide text-ink/60">
          {kind === "croise" ? "Mots croisés" : "Mots fléchés"}
        </span>
        <p className="mt-2 font-mono text-xs text-brand">{code}</p>
        <p className="mt-1 font-serif text-xs italic text-ink/60">{dateLabel}</p>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Supprimer la grille"
        title="Supprimer"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-lg leading-none text-ink/40 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand disabled:opacity-40"
      >
        {deleting ? "…" : "✕"}
      </button>
    </div>
  );
}
