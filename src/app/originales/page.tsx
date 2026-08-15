import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { absoluteUrl } from "@/lib/site";
import { ORIGINALES_THEME } from "@/lib/originales/constants";
import { GridPreview } from "@/components/originales/grid-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Les Fléchés Originales : nos grilles maison à jouer",
  description:
    "Des mots fléchés originaux, écrits à la main par notre équipe. Grilles thématiques prêtes à jouer et à imprimer, gratuitement.",
  alternates: { canonical: absoluteUrl("/originales") },
};

export default async function OriginalesPage() {
  // Login-gated section: send anonymous visitors to sign in, then back here.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion?redirect=/originales");
  }

  // One query: the collection's ready grids, each with its word count. Grouping
  // by the PK lets Postgres return the other crosswords columns un-aggregated.
  const grids = await db
    .select({
      code: crosswords.code,
      title: crosswords.title,
      width: crosswords.width,
      height: crosswords.height,
      pattern: crosswords.gridPattern,
      wordCount: sql<number>`count(${placedWords.id})::int`,
    })
    .from(crosswords)
    .leftJoin(placedWords, eq(placedWords.crosswordId, crosswords.id))
    .where(and(eq(crosswords.theme, ORIGINALES_THEME), eq(crosswords.status, "ready")))
    .groupBy(crosswords.id)
    .orderBy(desc(crosswords.createdAt));

  return (
    <main className="flex-1">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
            Faites main, par nous
          </p>
          <h1 className="mt-3 text-4xl text-ink sm:text-6xl">
            Les Fléchés Originales
          </h1>
          <p className="font-serif-accent mt-4 max-w-2xl text-xl italic text-ink/70">
            Nos grilles maison : des mots fléchés écrits à la main, avec des définitions
            cousues main. À jouer en ligne ou à imprimer, gratuitement.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {grids.length === 0 ? (
          <div className="frame bg-paper p-10 text-center">
            <p className="font-display text-2xl uppercase text-ink">Bientôt</p>
            <p className="font-serif-accent mt-3 text-lg italic text-ink/70">
              Les premières grilles originales arrivent très vite.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {grids.map((g) => (
              <Link
                key={g.code}
                href={`/grille/${g.code}`}
                className="frame group flex flex-col bg-paper p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="mx-auto w-3/4 py-2">
                  <GridPreview
                    width={g.width}
                    height={g.height}
                    pattern={g.pattern}
                    className="shadow-[4px_4px_0_0_var(--ink)]"
                  />
                </div>
                <h2 className="mt-5 font-display text-2xl uppercase text-ink group-hover:text-brand">
                  {g.title ?? "Grille originale"}
                </h2>
                <p className="mt-1 font-serif-accent text-sm italic text-ink/60">
                  {g.width} × {g.height}
                  {g.wordCount ? ` · ${g.wordCount} mots` : ""}
                </p>
                <span className="btn-lapos mt-5 self-start rounded-none bg-sun px-4 py-2 text-sm text-ink">
                  Jouer la grille
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
