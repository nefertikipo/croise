import type { PortableTextBlock } from "sanity";

export type SanityImage = {
  asset?: { _ref?: string };
  _ref?: string;
  alt?: string;
};

export type SeoProjection = {
  title?: string | null;
  description?: string | null;
  image?: SanityImage | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
};

export type FaqProjection = {
  _id?: string;
  question: string;
  answer?: string | null;
};

export type SlugRow = { slug: string };

// ─── Articles ───
export type ArticleListItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  mainImage?: SanityImage | null;
  categories?: (string | null)[] | null;
};

export type ArticleAuthor = {
  name: string;
  slug?: string | null;
  role?: string | null;
  image?: SanityImage | null;
  bio?: string | null;
};

export type ArticleDetail = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
  mainImage?: SanityImage | null;
  body?: PortableTextBlock[] | null;
  author?: ArticleAuthor | null;
  categories?: { title: string; slug?: string | null }[] | null;
  faqs?: FaqProjection[] | null;
  seo: SeoProjection;
};

// ─── Gift guides ───
export type GiftGuideListItem = {
  _id: string;
  title: string;
  slug: string;
  intro?: string | null;
  occasion?: string | null;
  mainImage?: SanityImage | null;
};

export type GiftItem = {
  name: string;
  description?: string | null;
  image?: SanityImage | null;
  href?: string | null;
  priceBracket?: "low" | "mid" | "high" | null;
};

export type GiftGuideDetail = {
  _id: string;
  title: string;
  slug: string;
  intro?: string | null;
  occasion?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
  mainImage?: SanityImage | null;
  body?: PortableTextBlock[] | null;
  items?: GiftItem[] | null;
  faqs?: FaqProjection[] | null;
  seo: SeoProjection;
};

// ─── Landing pages ───
export type LandingCta = { label?: string | null; href?: string | null; variant?: "primary" | "secondary" | null };

export type LandingPage = {
  _id: string;
  title: string;
  heading: string;
  subheading?: string | null;
  slug: string;
  heroImage?: SanityImage | null;
  cta?: LandingCta | null;
  body?: PortableTextBlock[] | null;
  _updatedAt?: string | null;
  faqs?: FaqProjection[] | null;
  seo: SeoProjection;
};
