import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { GridCard } from "@/components/mes-grilles/grid-card";

export const metadata = {
  title: "Mes grilles - Les Flèches",
};

// User-owned grids are always fresh; never cache this page.
export const dynamic = "force-dynamic";

export default async function MesGrillesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion?redirect=/mes-grilles");
  }

  const grids = await db
    .select({
      code: crosswords.code,
      title: crosswords.title,
      width: crosswords.width,
      height: crosswords.height,
      language: crosswords.language,
      createdAt: crosswords.createdAt,
    })
    .from(crosswords)
    .where(eq(crosswords.ownerId, session.user.id))
    .orderBy(desc(crosswords.createdAt));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand">
          Mes grilles
        </h1>
        <p className="mt-1 font-serif text-sm italic text-ink/70">
          {grids.length === 0
            ? "Aucune grille enregistrée pour le moment."
            : `${grids.length} grille${grids.length > 1 ? "s" : ""} enregistrée${grids.length > 1 ? "s" : ""}.`}
        </p>
      </header>

      {grids.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center">
          <p className="font-serif italic text-ink/70">
            Les grilles que vous générez en étant connecté apparaîtront ici.
          </p>
          <Link
            href="/fleche"
            className="btn-lapos mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-paper"
          >
            Créer une grille
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grids.map((g) => {
            const href = `/grille/${g.code}`;
            return (
              <li key={g.code}>
                <GridCard
                  code={g.code}
                  title={g.title?.trim() || "Grille sans titre"}
                  size={`${g.width}×${g.height}`}
                  href={href}
                  dateLabel={g.createdAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
