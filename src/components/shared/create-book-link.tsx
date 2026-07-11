"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NAV_CLASS =
  "font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand disabled:opacity-50";

/**
 * Creates an empty book and opens it in the editor. Used both as a bare nav
 * link (default styling) and as a styled CTA button — pass `className` +
 * `children` to reuse it anywhere "Créer un livre" should start the book flow.
 */
export function CreateBookLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createBook() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to create book");
      const { code } = await res.json();
      router.push(`/book/${code}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  return (
    <button
      onClick={createBook}
      disabled={creating}
      className={className ?? NAV_CLASS}
    >
      {creating ? "Création…" : (children ?? "Créer un livre")}
    </button>
  );
}
