import type { Metadata } from "next";
import Link from "next/link";

import { SanityImage } from "@/components/sanity/sanity-image";
import { absoluteUrl } from "@/lib/site";
import { sanityFetch } from "@/sanity/lib/live";
import { GIFT_GUIDES_QUERY } from "@/sanity/lib/queries";
import type { GiftGuideListItem } from "@/types/sanity-content";

export const metadata: Metadata = {
  title: "Guides cadeaux — idées originales à offrir",
  description:
    "Nos guides d'idées cadeaux personnalisés : pour un couple, un anniversaire, Noël ou la fête des mères.",
  alternates: { canonical: absoluteUrl("/guides") },
};

// Revalidate so newly published/edited content appears without a redeploy.
export const revalidate = 60;

export default async function GuidesIndexPage() {
  const { data } = await sanityFetch({ query: GIFT_GUIDES_QUERY });
  const guides = (data ?? []) as GiftGuideListItem[];

  return (
    <main className="flex-1">
      <header className="border-b-2 border-ink bg-brand text-brand-foreground">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="font-display text-xs uppercase tracking-[0.3em]">Guides cadeaux</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Des idées à offrir, triées pour vous</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {guides.length === 0 ? (
          <p className="font-serif-accent text-lg italic text-ink/60">
            Aucun guide pour le moment — revenez bientôt.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {guides.map((guide) => (
              <Link
                key={guide._id}
                href={`/guides/${guide.slug}`}
                className="frame group flex flex-col overflow-hidden bg-paper"
              >
                {guide.mainImage && (
                  <SanityImage
                    value={guide.mainImage}
                    alt={guide.mainImage.alt ?? guide.title}
                    width={720}
                    sizes="(max-width: 640px) 100vw, 500px"
                    className="aspect-[2/1] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6">
                  {guide.occasion && (
                    <span className="font-display text-xs uppercase tracking-[0.2em] text-brand">
                      {guide.occasion}
                    </span>
                  )}
                  <h2 className="mt-1 text-2xl text-ink group-hover:text-brand">
                    {guide.title}
                  </h2>
                  {guide.intro && (
                    <p className="font-serif-accent mt-2 flex-1 text-[15px] italic leading-snug text-ink/70">
                      {guide.intro}
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
