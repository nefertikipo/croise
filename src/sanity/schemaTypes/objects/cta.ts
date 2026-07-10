import { RocketIcon } from "@sanity/icons/Rocket";
import { defineField, defineType } from "sanity";

// Call-to-action button — reused in heroes and inside rich text.
export const cta = defineType({
  name: "cta",
  title: "Bouton d'action",
  type: "object",
  icon: RocketIcon,
  fields: [
    defineField({
      name: "label",
      title: "Texte du bouton",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "href",
      title: "Lien",
      description: "Interne (ex. /fleche) ou externe (https://…).",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "variant",
      title: "Style",
      type: "string",
      options: {
        list: [
          { title: "Principal (rouge)", value: "primary" },
          { title: "Secondaire (clair)", value: "secondary" },
        ],
        layout: "radio",
      },
      initialValue: "primary",
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "href" },
  },
});
