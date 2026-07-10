import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PortableTextBody } from "@/components/sanity/portable-text";
import { SanityImage } from "@/components/sanity/sanity-image";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { LANDING_PAGE_QUERY, LANDING_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { LandingPage, SlugRow } from "@/types/sanity-content";

type RouteProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch<SlugRow[]>(LANDING_SLUGS_QUERY);
    return (slugs ?? []).map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

async function getPage(params: RouteProps["params"]): Promise<LandingPage | null> {
  const { slug } = await params;
  const { data } = await sanityFetch({ query: LANDING_PAGE_QUERY, params: { slug }, stega: false });
  return (data as LandingPage | null) ?? null;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const page = await getPage(params);
  if (!page) return {};
  return buildMetadata(page.seo, `/${page.slug}`);
}

export default async function LandingPageRoute({ params }: RouteProps) {
  const page = await getPage(params);
  if (!page) notFound();

  const cta = page.cta;

  return (
    <main className="flex-1">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: page.heading, path: `/${page.slug}` },
        ])}
      />

      <section className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl leading-[1.05] text-ink sm:text-6xl">
            {page.heading}
          </h1>
          {page.subheading && (
            <p className="font-serif-accent mx-auto mt-5 max-w-2xl text-xl italic text-ink/75">
              {page.subheading}
            </p>
          )}
          {cta?.label && cta.href && (
            <div className="mt-8">
              <Link
                href={cta.href}
                className={`btn-lapos inline-block rounded-md px-8 py-4 text-lg ${
                  cta.variant === "secondary"
                    ? "bg-paper text-ink"
                    : "bg-brand text-brand-foreground"
                }`}
              >
                {cta.label}
              </Link>
            </div>
          )}
          {page.heroImage && (
            <SanityImage
              value={page.heroImage}
              alt={page.heroImage.alt ?? page.heading}
              width={1200}
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="mx-auto mt-12 w-full max-w-3xl rounded-md"
            />
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <PortableTextBody value={page.body} />
        <FaqSection faqs={page.faqs} />
      </div>
    </main>
  );
}
