import type { SchemaTypeDefinition } from "sanity";

import { blockContent } from "@/sanity/schemaTypes/objects/blockContent";
import { callout } from "@/sanity/schemaTypes/objects/callout";
import { cta } from "@/sanity/schemaTypes/objects/cta";
import { pteImage } from "@/sanity/schemaTypes/objects/pteImage";
import { seo } from "@/sanity/schemaTypes/objects/seo";
import { article } from "@/sanity/schemaTypes/documents/article";
import { author } from "@/sanity/schemaTypes/documents/author";
import { category } from "@/sanity/schemaTypes/documents/category";
import { faq } from "@/sanity/schemaTypes/documents/faq";
import { giftGuide } from "@/sanity/schemaTypes/documents/giftGuide";
import { seoLandingPage } from "@/sanity/schemaTypes/documents/seoLandingPage";
import { siteSettings } from "@/sanity/schemaTypes/documents/siteSettings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Documents
    seoLandingPage,
    article,
    giftGuide,
    faq,
    author,
    category,
    siteSettings,
    // Objects
    seo,
    cta,
    callout,
    pteImage,
    blockContent,
  ],
};
