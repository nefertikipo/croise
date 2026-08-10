import { notFound } from "next/navigation";
import { loadPostcard } from "@/lib/postcards/serialize";
import { PostcardCreator } from "@/components/postcard/postcard-creator";

export const metadata = {
  title: "Ma carte de mots fléchés",
};

// Cards are edited live; never cache.
export const dynamic = "force-dynamic";

export default async function CartePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await loadPostcard(code);
  if (!card) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">La carte</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-brand">
          {card.title?.trim() || "Ma carte"}
        </h1>
        <p className="mt-2 font-serif text-sm italic text-ink/70">Code : {card.code}</p>
      </header>
      <PostcardCreator initialCard={card} />
    </main>
  );
}
