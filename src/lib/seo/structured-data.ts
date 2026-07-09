import type {
  Article,
  BreadcrumbList,
  FAQPage,
  ItemList,
  Organization,
  WithContext,
} from "schema-dts";

import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

type FaqLike = { question: string; answer?: string | null };
type BreadcrumbItem = { name: string; path: string };

// FAQPage — the highest-leverage schema for both rich results and AI citations.
export function faqPageJsonLd(faqs: FaqLike[]): WithContext<FAQPage> | null {
  const entries = faqs.filter((f) => f.question && f.answer);
  if (!entries.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer as string,
      },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
}): WithContext<Article> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description ?? undefined,
    mainEntityOfPage: absoluteUrl(input.path),
    image: input.imageUrl ? [input.imageUrl] : undefined,
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function itemListJsonLd(items: { name: string; path?: string }[]): WithContext<ItemList> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.path ? absoluteUrl(item.path) : undefined,
    })),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd(input?: {
  name?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  sameAs?: string[] | null;
}): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input?.name ?? SITE_NAME,
    url: SITE_URL,
    description: input?.description ?? undefined,
    logo: input?.logoUrl ?? undefined,
    sameAs: input?.sameAs ?? undefined,
  };
}
