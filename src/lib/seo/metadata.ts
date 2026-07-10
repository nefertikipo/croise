import type { Metadata } from "next";
import type { SanityImageSource } from "@sanity/image-url";

import { absoluteUrl } from "@/lib/site";
import { urlFor } from "@/sanity/lib/image";

export type SeoInput = {
  title?: string | null;
  description?: string | null;
  image?: SanityImageSource | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
};

// Turns the coalesced `seo` projection from GROQ into a Next.js Metadata object,
// with canonical, Open Graph and Twitter cards wired up consistently.
export function buildMetadata(seo: SeoInput, path: string): Metadata {
  const ogImage = seo.image
    ? urlFor(seo.image).width(1200).height(630).fit("crop").url()
    : undefined;

  const metadata: Metadata = {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    alternates: { canonical: seo.canonicalUrl ?? absoluteUrl(path) },
    openGraph: {
      title: seo.title ?? undefined,
      description: seo.description ?? undefined,
      url: absoluteUrl(path),
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title ?? undefined,
      description: seo.description ?? undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };

  if (seo.noIndex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}
