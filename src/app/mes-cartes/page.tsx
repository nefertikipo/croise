import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";

export const metadata = {
  title: "Mes cartes - Les Flèches",
};

// User-owned cards are always fresh; never cache this page.
export const dynamic = "force-dynamic";

export default async function MesCartesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion?redirect=/mes-cartes");
  }

  const rows = await db
    .select({
      code: postcards.code,
      title: postcards.title,
      recipientName: postcards.recipientName,
      status: postcards.status,
      createdAt: postcards.createdAt,
    })
    .from(postcards)
    .where(eq(postcards.ownerId, session.user.id))
    .orderBy(desc(postcards.createdAt));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide text-brand">Mes cartes</h1>
          <p className="mt-1 font-serif text-sm italic text-ink/70">
            {rows.length === 0
              ? "Aucune carte pour le moment."
              : `${rows.length} carte${rows.length > 1 ? "s" : ""}.`}
          </p>
        </div>
        <Link href="/carte/nouveau" className="btn-lapos rounded-none bg-ink px-5 py-2.5 text-sm text-paper">
          Nouvelle carte
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center">
          <p className="font-serif italic text-ink/70">
            Les cartes que vous créez en étant connecté apparaîtront ici.
          </p>
          <Link
            href="/carte/nouveau"
            className="btn-lapos mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-paper"
          >
            Créer une carte
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.code}>
              <Link
                href={`/carte/${r.code}`}
                className="frame flex flex-col gap-1 bg-background p-5 transition-colors hover:bg-gold/20"
              >
                <span className="font-display text-lg uppercase tracking-wide text-ink">
                  {r.title?.trim() || "Carte sans titre"}
                </span>
                {r.recipientName?.trim() && (
                  <span className="font-serif text-sm italic text-ink/70">Pour {r.recipientName.trim()}</span>
                )}
                <span className="mt-2 font-condensed text-xs uppercase tracking-wide text-ink/50">
                  {r.status === "ready" ? "Grille prête" : "Brouillon"} ·{" "}
                  {r.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
