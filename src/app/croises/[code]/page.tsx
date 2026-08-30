import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { CrosswordGrid } from "@/components/crossword/crossword-grid";

export const dynamic = "force-dynamic";

export default async function CroiseByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [row] = await db
    .select()
    .from(americanCrosswords)
    .where(eq(americanCrosswords.code, code))
    .limit(1);

  if (!row) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{row.title ?? "Mots croisés"}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Grille {row.code} ·{" "}
        <a
          href={`/api/croises/${row.code}/pdf`}
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Télécharger le PDF
        </a>
      </p>
      <div className="mt-8">
        <CrosswordGrid puzzle={row.puzzle} />
      </div>
    </main>
  );
}
