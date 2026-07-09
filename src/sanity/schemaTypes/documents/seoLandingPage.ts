import { RocketIcon } from "@sanity/icons/Rocket";
import { defineField, defineType } from "sanity";

// High-intent "money" landing pages served at the site root, e.g.
// /mots-fleches-personnalises, /mot-croise-personnalise, /idee-cadeau-couple.
export const seoLandingPage = defineType({
  name: "seoLandingPage",
  title: "Page SEO (atterrissage)",
  type: "document",
  icon: RocketIcon,
  groups: [
    { name: "content", title: "Contenu", default: true },
    { name: "seo", title: "Référencement" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Titre interne",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      description: "Servi à la racine du site : /{slug}. Ex. mots-fleches-personnalises",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "targetKeyword",
      title: "Mot-clé cible",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "heading",
      title: "Titre principal (H1)",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subheading",
      title: "Sous-titre",
      type: "text",
      rows: 3,
      group: "content",
    }),
    defineField({
      name: "heroImage",
      title: "Image de couverture",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "cta",
      title: "Bouton principal",
      type: "cta",
      group: "content",
    }),
    defineField({
      name: "body",
      title: "Contenu",
      type: "blockContent",
      group: "content",
    }),
    defineField({
      name: "faqs",
      title: "Questions fréquentes",
      type: "array",
      group: "content",
      of: [{ type: "reference", to: [{ type: "faq" }] }],
    }),
    defineField({
      name: "seo",
      title: "Référencement",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: { title: "heading", subtitle: "slug.current" },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `/${subtitle}` : "sans slug" };
    },
  },
});
