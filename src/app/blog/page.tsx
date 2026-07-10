import type { Metadata } from "next";
import Link from "next/link";

import { SanityImage } from "@/components/sanity/sanity-image";
import { absoluteUrl } from "@/lib/site";
import { sanityFetch } from "@/sanity/lib/live";
import { ARTICLES_QUERY } from "@/sanity/lib/queries";
import type { ArticleListItem } from "@/types/sanity-content";

export const metadata: Metadata = {
  title: "Le journal : idées cadeaux et jeux de lettres",
  description:
    "Conseils, idées cadeaux originales et guides autour des mots fléchés et mots croisés personnalisés.",
  alternates: { canonical: absoluteUrl("/blog") },
};

// Revalidate so newly published/edited content appears without a redeploy.
export const revalidate = 60;

export default async function BlogIndexPage() {
  const { data } = await sanityFetch({ query: ARTICLES_QUERY });
  const articles = (data ?? []) as ArticleListItem[];

  return (
    <main className="flex-1">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
            Le journal
          </p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
            Idées cadeaux & jeux de lettres
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {articles.length === 0 ? (
          <p className="font-serif-accent text-lg italic text-ink/60">
            Aucun article pour le moment — revenez bientôt.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article._id}
                href={`/blog/${article.slug}`}
                className="frame group flex flex-col overflow-hidden bg-paper"
              >
                {article.mainImage && (
                  <SanityImage
                    value={article.mainImage}
                    alt={article.mainImage.alt ?? article.title}
                    width={640}
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="aspect-[3/2] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-2xl text-ink group-hover:text-brand">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="font-serif-accent mt-2 flex-1 text-[15px] italic leading-snug text-ink/70">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
