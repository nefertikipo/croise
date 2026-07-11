import { SearchIcon } from "@sanity/icons/Search";
import { defineField, defineType } from "sanity";

// Reusable SEO metadata. Every field is optional — GROQ falls back to the
// document's own title/excerpt so editors only fill this in to override.
export const seo = defineType({
  name: "seo",
  title: "Référencement (SEO)",
  type: "object",
  icon: SearchIcon,
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "title",
      title: "Titre méta",
      description:
        "Remplace le titre de la page dans les résultats de recherche (50–60 caractères).",
      type: "string",
      validation: (rule) => rule.max(70).warning("Idéalement moins de 60 caractères."),
    }),
    defineField({
      name: "description",
      title: "Description méta",
      description:
        "Résumé affiché sous le titre dans Google (120–160 caractères).",
      type: "text",
      rows: 3,
      validation: (rule) =>
        rule.max(180).warning("Idéalement moins de 160 caractères."),
    }),
    defineField({
      name: "image",
      title: "Image de partage (Open Graph)",
      description: "1200×630 px recommandé. Utilisée sur les réseaux sociaux.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "canonicalUrl",
      title: "URL canonique",
      description:
        "À renseigner uniquement si ce contenu existe ailleurs (évite le duplicate content).",
      type: "url",
    }),
    defineField({
      name: "noIndex",
      title: "Masquer des moteurs de recherche",
      type: "boolean",
      initialValue: false,
    }),
  ],
});
