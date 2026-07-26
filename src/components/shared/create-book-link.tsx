"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const NAV_CLASS =
  "font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand disabled:opacity-50";

/**
 * "Créer un livre" entry point: links to the guided creation wizard
 * (/livre/nouveau). Used both as a bare nav link (default styling) and as a
 * styled CTA button — pass `className` + `children` to reuse it anywhere
 * "Créer un livre" should start the book flow.
 */
export function CreateBookLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href="/livre/nouveau" className={className ?? NAV_CLASS}>
      {children ?? "Créer un livre"}
    </Link>
  );
}

/**
 * Instant-create escape hatch: POSTs an empty book and opens it in the editor,
 * skipping the wizard entirely. Used by the wizard's "partir d'une page
 * blanche" link. Requires a signed-in user (book creation is account-only);
 * a 401 sends the visitor to sign in and back.
 */
export function CreateEmptyBookButton({
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
      if (res.status === 401) {
        router.push("/connexion?redirect=/livre/nouveau");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Impossible de créer le livre. Réessayez.");
      }
      const { code } = await res.json();
      router.push(`/book/${code}`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Impossible de créer le livre. Réessayez.",
      );
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={createBook}
      disabled={creating}
      className={className ?? NAV_CLASS}
    >
      {creating ? "Création…" : (children ?? "Créer un livre vide")}
    </button>
  );
}
