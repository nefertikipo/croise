import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { ContributeForm } from "@/components/book/contribute-form";

/**
 * Public "add a clue" page reached via the owner's share link. Anyone can add
 * clues here (no account) as long as the owner has opened contributions. The
 * carnet's grids/photos/cover are never shown — just the invitation and the
 * form — so the surprise stays intact for the recipient.
 */
export default async function ParticiperPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [book] = await db
    .select({ title: books.title, enabled: books.contributionsEnabled })
    .from(books)
    .where(eq(books.code, code))
    .limit(1);

  const closed = !book || !book.enabled;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="font-heading text-sm uppercase tracking-[0.3em] text-ink/70"
          >
            Les Flèches
          </Link>
        </div>

        {closed ? (
          <div className="border-2 border-ink bg-card p-6 text-center shadow-[4px_4px_0_0] shadow-ink/80">
            <h1 className="font-heading text-2xl uppercase">Contributions fermées</h1>
            <p className="mt-3 text-sm text-ink/75">
              {book
                ? "Ce carnet n'accepte pas (ou plus) de nouveaux indices. Demandez le lien à la personne qui l'a créé."
                : "Ce carnet est introuvable. Vérifiez le lien qu'on vous a envoyé."}
            </p>
            <Link
              href="/livre/nouveau"
              className="mt-4 inline-block font-serif-accent text-sm italic underline"
            >
              Créer votre propre carnet →
            </Link>
          </div>
        ) : (
          <div className="border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
            <h1 className="font-heading text-2xl uppercase leading-tight">
              Aidez à écrire «&nbsp;{book.title}&nbsp;»
            </h1>
            <p className="mt-2 mb-5 text-sm text-ink/75">
              Ajoutez un mot et son indice — un souvenir, une blague, un détail qui
              lui ressemble. Ils seront cachés dans les grilles du carnet, et votre
              prénom apparaîtra dans la dédicace.
            </p>
            <ContributeForm code={code} bookTitle={book.title} />
          </div>
        )}

        <p className="text-center font-serif-accent text-xs italic text-ink/50">
          Un carnet de mots fléchés personnalisé, écrit à plusieurs mains.
        </p>
      </div>
    </main>
  );
}
