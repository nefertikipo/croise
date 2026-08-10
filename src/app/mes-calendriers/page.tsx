import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { calendars, calendarMonths } from "@/db/schema/calendars";

export const metadata = {
  title: "Mes calendriers - Les Flèches",
};

export const dynamic = "force-dynamic";

export default async function MesCalendriersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion?redirect=/mes-calendriers");
  }

  const rows = await db
    .select({ id: calendars.id, code: calendars.code, title: calendars.title, year: calendars.year, createdAt: calendars.createdAt })
    .from(calendars)
    .where(eq(calendars.ownerId, session.user.id))
    .orderBy(desc(calendars.createdAt));

  const withCounts = await Promise.all(
    rows.map(async (r) => {
      const [{ n }] = await db
        .select({ n: count() })
        .from(calendarMonths)
        .where(eq(calendarMonths.calendarId, r.id));
      return { ...r, monthCount: Number(n) };
    }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide text-brand">Mes calendriers</h1>
          <p className="mt-1 font-serif text-sm italic text-ink/70">
            {withCounts.length === 0 ? "Aucun calendrier pour le moment." : `${withCounts.length} calendrier${withCounts.length > 1 ? "s" : ""}.`}
          </p>
        </div>
        <Link href="/calendrier/nouveau" className="btn-lapos rounded-none bg-ink px-5 py-2.5 text-sm text-paper">
          Nouveau calendrier
        </Link>
      </header>

      {withCounts.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center">
          <p className="font-serif italic text-ink/70">Les calendriers que vous créez apparaîtront ici.</p>
          <Link href="/calendrier/nouveau" className="btn-lapos mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-paper">
            Créer un calendrier
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withCounts.map((r) => (
            <li key={r.code}>
              <Link href={`/calendrier/${r.code}`} className="frame flex flex-col gap-1 bg-background p-5 transition-colors hover:bg-gold/20">
                <span className="font-display text-lg uppercase tracking-wide text-ink">
                  {r.title?.trim() || "Calendrier"} {r.year}
                </span>
                <span className="mt-2 font-condensed text-xs uppercase tracking-wide text-ink/50">
                  {r.monthCount}/12 mois ·{" "}
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
