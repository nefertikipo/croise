import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { GridCard } from "@/components/mes-grilles/grid-card";

interface UnifiedGrid {
  code: string;
  title: string | null;
  width: number;
  height: number;
  createdAt: Date;
  kind: "fleche" | "croise";
}

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

  const [fleches, croises] = await Promise.all([
    db
      .select({
        code: crosswords.code,
        title: crosswords.title,
        width: crosswords.width,
        height: crosswords.height,
        createdAt: crosswords.createdAt,
      })
      .from(crosswords)
      .where(eq(crosswords.ownerId, session.user.id))
      .orderBy(desc(crosswords.createdAt)),
    db
      .select({
        code: americanCrosswords.code,
        title: americanCrosswords.title,
        width: americanCrosswords.width,
        height: americanCrosswords.height,
        createdAt: americanCrosswords.createdAt,
      })
      .from(americanCrosswords)
      .where(eq(americanCrosswords.ownerId, session.user.id))
      .orderBy(desc(americanCrosswords.createdAt)),
  ]);

  // Merge both puzzle types into one list, newest first.
  const grids: UnifiedGrid[] = [
    ...fleches.map((g) => ({ ...g, kind: "fleche" as const })),
    ...croises.map((g) => ({ ...g, kind: "croise" as const })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/fleche"
              className="btn-lapos inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-paper"
            >
              Créer des mots fléchés
            </Link>
            <Link
              href="/croises"
              className="btn-lapos inline-flex rounded-md border-2 border-ink px-5 py-2.5 text-sm text-ink"
            >
              Créer des mots croisés
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grids.map((g) => {
            const href =
              g.kind === "croise" ? `/croises/${g.code}` : `/grille/${g.code}`;
            return (
              <li key={g.code}>
                <GridCard
                  code={g.code}
                  title={g.title?.trim() || "Grille sans titre"}
                  size={`${g.width}×${g.height}`}
                  href={href}
                  kind={g.kind}
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
