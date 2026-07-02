"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Nav action: creates an empty book and opens it in the editor. */
export function CreateBookLink() {
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
      className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      {creating ? "Création…" : "Créer un livre"}
    </button>
  );
}
