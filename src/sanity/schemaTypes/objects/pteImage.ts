import { ImageIcon } from "@sanity/icons/Image";
import { defineField, defineType } from "sanity";

// Image block embedded inside rich text.
export const pteImage = defineType({
  name: "pteImage",
  title: "Image",
  type: "image",
  icon: ImageIcon,
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Texte alternatif",
      description: "Décrit l'image (accessibilité + SEO).",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Légende",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "caption", subtitle: "alt", media: "asset" },
  },
});
