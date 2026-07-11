import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PortableTextBody } from "@/components/sanity/portable-text";
import { SanityImage } from "@/components/sanity/sanity-image";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/structured-data";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { GIFT_GUIDE_QUERY, GIFT_GUIDE_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { GiftGuideDetail, SlugRow } from "@/types/sanity-content";

type RouteProps = { params: Promise<{ slug: string }> };

// Revalidate so newly published/edited content appears without a redeploy.
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch<SlugRow[]>(GIFT_GUIDE_SLUGS_QUERY);
    return (slugs ?? []).map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

async function getGuide(params: RouteProps["params"]): Promise<GiftGuideDetail | null> {
  const { slug } = await params;
  const { data } = await sanityFetch({ query: GIFT_GUIDE_QUERY, params: { slug }, stega: false });
  return (data as GiftGuideDetail | null) ?? null;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const guide = await getGuide(params);
  if (!guide) return {};
  return buildMetadata(guide.seo, `/guides/${guide.slug}`);
}

export default async function GiftGuidePage({ params }: RouteProps) {
  const guide = await getGuide(params);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  const items = guide.items ?? [];

  return (
    <main className="flex-1">
      <JsonLd data={itemListJsonLd(items.map((item) => ({ name: item.name })))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path },
        ])}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        {guide.occasion && (
          <p className="font-display text-xs uppercase tracking-[0.2em] text-brand">
            {guide.occasion}
          </p>
        )}
        <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{guide.title}</h1>
        {guide.intro && (
          <p className="font-serif-accent mt-4 text-xl italic text-ink/70">{guide.intro}</p>
        )}

        {guide.mainImage && (
          <SanityImage
            value={guide.mainImage}
            alt={guide.mainImage.alt ?? guide.title}
            width={1024}
            priority
            className="mt-8 w-full rounded-md"
          />
        )}

        <ul className="mt-10 space-y-8">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="frame bg-paper p-6">
              <h2 className="text-2xl text-ink">{item.name}</h2>
              {item.image && (
                <SanityImage
                  value={item.image}
                  alt={item.name}
                  width={720}
                  className="mt-4 w-full rounded-md"
                />
              )}
              {item.description && (
                <p className="mt-3 text-lg leading-relaxed text-ink/80">{item.description}</p>
              )}
              {item.href && (
                <Link
                  href={item.href}
                  className="btn-lapos mt-4 inline-block rounded-md bg-sun px-4 py-2 text-sm text-ink"
                >
                  Composer le mien
                </Link>
              )}
            </li>
          ))}
        </ul>

        {guide.body && (
          <div className="mt-10">
            <PortableTextBody value={guide.body} />
          </div>
        )}

        <FaqSection faqs={guide.faqs} />
      </article>
    </main>
  );
}
