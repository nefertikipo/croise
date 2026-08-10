import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPoster } from "@/lib/posters/serialize";
import { PosterOrder } from "@/components/poster/poster-order";

export const metadata = {
  title: "Poster de mots fléchés",
  description: "Votre grille de mots fléchés imprimée en grand format, prête à encadrer.",
};

export const dynamic = "force-dynamic";

export default async function PosterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const poster = await loadPoster(code);
  if (!poster) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">Le poster</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-brand">
          {poster.title?.trim() || "Votre poster"}
        </h1>
        <p className="mt-2 font-serif text-sm italic text-ink/70">
          Une grande grille, prête à imprimer et à encadrer.{" "}
          <Link href="/fleche?intent=poster" className="text-brand underline">
            Créer une autre grille
          </Link>
        </p>
      </header>
      <PosterOrder poster={poster} />
    </main>
  );
}
