import type { StructureResolver } from "sanity/structure";

// Custom Studio structure: groups content and pins Site settings as a singleton.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenu")
    .items([
      S.listItem()
        .title("Paramètres du site")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("seoLandingPage").title("Pages SEO"),
      S.documentTypeListItem("article").title("Articles"),
      S.documentTypeListItem("giftGuide").title("Guides cadeaux"),
      S.documentTypeListItem("faq").title("Questions fréquentes"),
      S.divider(),
      S.documentTypeListItem("author").title("Auteurs"),
      S.documentTypeListItem("category").title("Catégories"),
    ]);
