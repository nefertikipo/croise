import { defineQuery } from "next-sanity";

// FAQs are projected with the answer flattened to plain text (pt::text) so it
// can drop straight into FAQPage JSON-LD.
const FAQ_PROJECTION = /* groq */ `
  faqs[]->{
    _id,
    question,
    "answer": pt::text(answer)
  }
`;

// ─────────────────────────── Articles ───────────────────────────

export const ARTICLES_QUERY = defineQuery(`
  *[_type == "article" && defined(slug.current) && seo.noIndex != true]
    | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    mainImage,
    "categories": categories[]->title
  }
`);

export const ARTICLE_QUERY = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    _updatedAt,
    mainImage,
    body,
    author->{ name, "slug": slug.current, role, image, bio },
    categories[]->{ title, "slug": slug.current },
    ${FAQ_PROJECTION},
    "seo": {
      "title": coalesce(seo.title, title),
      "description": coalesce(seo.description, excerpt),
      "image": coalesce(seo.image, mainImage),
      "canonicalUrl": seo.canonicalUrl,
      "noIndex": seo.noIndex == true
    }
  }
`);

export const ARTICLE_SLUGS_QUERY = defineQuery(`
  *[_type == "article" && defined(slug.current)]{ "slug": slug.current }
`);

// ─────────────────────────── Gift guides ───────────────────────────

export const GIFT_GUIDES_QUERY = defineQuery(`
  *[_type == "giftGuide" && defined(slug.current) && seo.noIndex != true]
    | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    intro,
    occasion,
    mainImage
  }
`);

export const GIFT_GUIDE_QUERY = defineQuery(`
  *[_type == "giftGuide" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    intro,
    occasion,
    publishedAt,
    _updatedAt,
    mainImage,
    body,
    items[]{ name, description, image, href, priceBracket },
    ${FAQ_PROJECTION},
    "seo": {
      "title": coalesce(seo.title, title),
      "description": coalesce(seo.description, intro),
      "image": coalesce(seo.image, mainImage),
      "canonicalUrl": seo.canonicalUrl,
      "noIndex": seo.noIndex == true
    }
  }
`);

export const GIFT_GUIDE_SLUGS_QUERY = defineQuery(`
  *[_type == "giftGuide" && defined(slug.current)]{ "slug": slug.current }
`);

// ─────────────────────────── Landing pages ───────────────────────────

export const LANDING_PAGE_QUERY = defineQuery(`
  *[_type == "seoLandingPage" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    heading,
    subheading,
    "slug": slug.current,
    heroImage,
    cta,
    body,
    _updatedAt,
    ${FAQ_PROJECTION},
    "seo": {
      "title": coalesce(seo.title, heading, title),
      "description": coalesce(seo.description, subheading),
      "image": coalesce(seo.image, heroImage),
      "canonicalUrl": seo.canonicalUrl,
      "noIndex": seo.noIndex == true
    }
  }
`);

export const LANDING_SLUGS_QUERY = defineQuery(`
  *[_type == "seoLandingPage" && defined(slug.current)]{ "slug": slug.current }
`);

// ─────────────────────────── Global ───────────────────────────

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings"][0]{
    organizationName,
    description,
    logo,
    defaultOgImage,
    socialLinks
  }
`);

export const SITEMAP_QUERY = defineQuery(`
  *[
    (_type == "seoLandingPage" || _type == "article" || _type == "giftGuide")
    && defined(slug.current)
    && seo.noIndex != true
  ]{
    _type,
    "slug": slug.current,
    _updatedAt
  }
`);
