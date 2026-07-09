import { defineArrayMember, defineType } from "sanity";

// The rich-text body used by articles, gift guides and landing pages.
export const blockContent = defineType({
  name: "blockContent",
  title: "Contenu",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraphe", value: "normal" },
        { title: "Titre H2", value: "h2" },
        { title: "Titre H3", value: "h3" },
        { title: "Citation", value: "blockquote" },
      ],
      lists: [
        { title: "Puces", value: "bullet" },
        { title: "Numérotée", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Gras", value: "strong" },
          { title: "Italique", value: "em" },
        ],
        annotations: [
          {
            name: "link",
            title: "Lien",
            type: "object",
            fields: [
              {
                name: "href",
                title: "URL",
                type: "string",
                validation: (rule) => rule.required(),
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({ type: "pteImage" }),
    defineArrayMember({ type: "callout" }),
    defineArrayMember({ type: "cta" }),
  ],
});
