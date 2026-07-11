import { CogIcon } from "@sanity/icons/Cog";
import { defineField, defineType } from "sanity";

// Singleton: global fallbacks used for Organization JSON-LD and default social
// sharing metadata.
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Paramètres du site",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "organizationName",
      title: "Nom de l'organisation",
      type: "string",
      initialValue: "Les Flèches",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description par défaut",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
    }),
    defineField({
      name: "defaultOgImage",
      title: "Image de partage par défaut",
      description: "1200×630 px. Utilisée quand une page n'a pas d'image dédiée.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "socialLinks",
      title: "Réseaux sociaux",
      type: "array",
      of: [{ type: "url" }],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Paramètres du site" };
    },
  },
});
