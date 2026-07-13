import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { books } from "@/db/schema/books";

export const metadata = {
  title: "Mes livres - Les Flèches",
};

// User-owned books are always fresh; never cache this page.
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  ordered: "Commandé",
};

export default async function MesLivresPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion?redirect=/mes-livres");
  }

  const list = await db
    .select({
      code: books.code,
      title: books.title,
      status: books.status,
      createdAt: books.createdAt,
    })
    .from(books)
    .where(eq(books.ownerId, session.user.id))
    .orderBy(desc(books.createdAt));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand">
          Mes livres
        </h1>
        <p className="mt-1 font-serif text-sm italic text-ink/70">
          {list.length === 0
            ? "Aucun livre enregistré pour le moment."
            : `${list.length} livre${list.length > 1 ? "s" : ""} enregistré${list.length > 1 ? "s" : ""}.`}
        </p>
      </header>

      {list.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center">
          <p className="font-serif italic text-ink/70">
            Les livres que vous créez en étant connecté apparaîtront ici.
          </p>
          <Link
            href="/fleche"
            className="btn-lapos mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-paper"
          >
            Créer un livre
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((b) => (
            <li key={b.code}>
              <Link
                href={`/book/${b.code}`}
                className="block border-2 border-ink bg-paper p-4 shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg uppercase tracking-wide text-ink">
                    {b.title?.trim() || "Livre sans titre"}
                  </span>
                  <span className="shrink-0 font-display text-xs uppercase tracking-wide text-ink/50">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-brand">{b.code}</p>
                <p className="mt-2 font-serif text-xs italic text-ink/60">
                  {b.createdAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
