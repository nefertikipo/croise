import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortableTextBody } from "@/components/sanity/portable-text";
import { SanityImage } from "@/components/sanity/sanity-image";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { ARTICLE_QUERY, ARTICLE_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { ArticleDetail, SlugRow } from "@/types/sanity-content";

type RouteProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch<SlugRow[]>(ARTICLE_SLUGS_QUERY);
    return (slugs ?? []).map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

async function getArticle(params: RouteProps["params"]): Promise<ArticleDetail | null> {
  const { slug } = await params;
  const { data } = await sanityFetch({ query: ARTICLE_QUERY, params: { slug }, stega: false });
  return (data as ArticleDetail | null) ?? null;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const article = await getArticle(params);
  if (!article) return {};
  return buildMetadata(article.seo, `/blog/${article.slug}`);
}

export default async function ArticlePage({ params }: RouteProps) {
  const article = await getArticle(params);
  if (!article) notFound();

  const path = `/blog/${article.slug}`;
  const imageUrl = article.mainImage
    ? urlFor(article.mainImage).width(1200).height(630).fit("crop").url()
    : article.seo.image
      ? urlFor(article.seo.image).width(1200).height(630).fit("crop").url()
      : null;

  return (
    <main className="flex-1">
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.seo.description,
          path,
          imageUrl,
          publishedAt: article.publishedAt,
          updatedAt: article._updatedAt,
          authorName: article.author?.name,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Journal", path: "/blog" },
          { name: article.title, path },
        ])}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav className="font-display text-xs uppercase tracking-[0.2em] text-brand">
          {article.categories?.[0]?.title ?? "Article"}
        </nav>
        <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{article.title}</h1>
        {article.excerpt && (
          <p className="font-serif-accent mt-4 text-xl italic text-ink/70">
            {article.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3 text-sm text-ink/60">
          {article.author?.name && <span>Par {article.author.name}</span>}
          {article.publishedAt && (
            <time dateTime={article.publishedAt}>
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                new Date(article.publishedAt),
              )}
            </time>
          )}
        </div>

        {article.mainImage && (
          <SanityImage
            value={article.mainImage}
            alt={article.mainImage.alt ?? article.title}
            width={1024}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="mt-8 w-full rounded-md"
          />
        )}

        <div className="mt-8">
          <PortableTextBody value={article.body} />
        </div>

        <FaqSection faqs={article.faqs} />
      </article>
    </main>
  );
}
