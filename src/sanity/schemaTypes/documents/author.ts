import { UserIcon } from "@sanity/icons/User";
import { defineField, defineType } from "sanity";

// Authors provide E-E-A-T signals (authorship, expertise) that both Google and
// AI answer engines use to weigh trustworthiness.
export const author = defineType({
  name: "author",
  title: "Auteur",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Nom",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Rôle / expertise",
      description: "Ex. « Créatrice de jeux de lettres ».",
      type: "string",
    }),
    defineField({
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Biographie",
      type: "text",
      rows: 4,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "image" },
  },
});
