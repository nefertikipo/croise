import { PackageIcon } from "@sanity/icons/Package";
import { defineField, defineType } from "sanity";

// Gift-guide listicle — targets "idée cadeau" queries and is highly citable by
// AI answer engines (a structured list of options with reasons).
export const giftGuide = defineType({
  name: "giftGuide",
  title: "Guide cadeau",
  type: "document",
  icon: PackageIcon,
  groups: [
    { name: "content", title: "Contenu", default: true },
    { name: "seo", title: "Référencement" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Titre",
      description: "Ex. « 10 idées de cadeaux personnalisés pour les amoureux des mots ».",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Introduction",
      type: "text",
      rows: 3,
      group: "content",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: "mainImage",
      title: "Image principale",
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
      name: "occasion",
      title: "Occasion",
      description: "Ex. Noël, Saint-Valentin, anniversaire, fête des mères.",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "items",
      title: "Idées cadeaux",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          name: "giftItem",
          title: "Idée",
          fields: [
            defineField({
              name: "name",
              title: "Nom",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "description",
              title: "Pourquoi c'est une bonne idée",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
            }),
            defineField({
              name: "href",
              title: "Lien",
              description: "Lien vers le produit ou la page concernée.",
              type: "string",
            }),
            defineField({
              name: "priceBracket",
              title: "Budget",
              type: "string",
              options: {
                list: [
                  { title: "€ — moins de 20€", value: "low" },
                  { title: "€€ — 20 à 50€", value: "mid" },
                  { title: "€€€ — plus de 50€", value: "high" },
                ],
              },
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "priceBracket", media: "image" },
          },
        },
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "body",
      title: "Contenu additionnel",
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
      name: "publishedAt",
      title: "Date de publication",
      type: "datetime",
      group: "content",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seo",
      title: "Référencement",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "occasion", media: "mainImage" },
  },
});
