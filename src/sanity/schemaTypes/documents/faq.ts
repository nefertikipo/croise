import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { defineField, defineType } from "sanity";

// Reusable question/answer. Referenced by pages, articles and guides to build
// FAQPage structured data — one of the strongest GEO levers (AI engines quote
// clear Q&A pairs directly).
export const faq = defineType({
  name: "faq",
  title: "Question fréquente",
  type: "document",
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: "question",
      title: "Question",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "answer",
      title: "Réponse",
      description:
        "Réponse claire et autonome (2–4 phrases). Elle peut être citée telle quelle par les moteurs de recherche et les IA.",
      type: "blockContent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Catégorie",
      type: "reference",
      to: [{ type: "category" }],
    }),
  ],
  preview: {
    select: { title: "question" },
  },
});
