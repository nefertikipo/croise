import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { client } from "@/sanity/lib/client";
import { SITEMAP_QUERY } from "@/sanity/lib/queries";

type SitemapRow = {
  _type: "seoLandingPage" | "article" | "giftGuide";
  slug: string;
  _updatedAt: string;
};

// Static, hand-maintained routes that should always appear in the sitemap.
const STATIC_PATHS = ["/", "/fleche", "/blog", "/guides"];

function hrefFor(row: SitemapRow): string {
  switch (row._type) {
    case "article":
      return `/blog/${row.slug}`;
    case "giftGuide":
      return `/guides/${row.slug}`;
    default:
      return `/${row.slug}`;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  try {
    const rows = await client.fetch<SitemapRow[]>(SITEMAP_QUERY);
    const dynamicEntries: MetadataRoute.Sitemap = (rows ?? []).map((row) => ({
      url: absoluteUrl(hrefFor(row)),
      lastModified: row._updatedAt ? new Date(row._updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: row._type === "seoLandingPage" ? 0.9 : 0.6,
    }));
    return [...staticEntries, ...dynamicEntries];
  } catch (error) {
    console.error("Sitemap generation failed:", error);
    return staticEntries;
  }
}
