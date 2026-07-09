import { BulbOutlineIcon } from "@sanity/icons/BulbOutline";
import { defineField, defineType } from "sanity";

// A short, self-contained highlight box. Great for GEO: AI answer engines love
// quotable, standalone statements (definitions, key takeaways, tips).
export const callout = defineType({
  name: "callout",
  title: "Encadré clé",
  type: "object",
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: "tone",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "À retenir", value: "key" },
          { title: "Astuce", value: "tip" },
          { title: "Bon à savoir", value: "info" },
        ],
        layout: "radio",
      },
      initialValue: "key",
    }),
    defineField({
      name: "text",
      title: "Texte",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "text", tone: "tone" },
    prepare({ title, tone }) {
      return { title: title ?? "Encadré", subtitle: `Encadré · ${tone ?? "key"}` };
    },
  },
});
