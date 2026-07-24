import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { BookCard } from "@/components/mes-livres/book-card";

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
    <main className="mx-auto max-w-6xl px-6 py-12">
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.code}>
              <BookCard
                code={b.code}
                title={b.title?.trim() || "Livre sans titre"}
                statusLabel={STATUS_LABELS[b.status] ?? b.status}
                dateLabel={b.createdAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
