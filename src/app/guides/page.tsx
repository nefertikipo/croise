import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/structured-data";
import { sanityFetch } from "@/sanity/lib/live";
import { GIFT_GUIDES_QUERY } from "@/sanity/lib/queries";
import type { GiftGuideGroup, GiftGuideListItem } from "@/types/sanity-content";

export const metadata: Metadata = {
  title: "Idées de cadeaux personnalisés : tous nos guides",
  description:
    "Tous nos guides d'idées de cadeaux personnalisés : pour qui (maman, papa, grands-parents, collègue…), pour quelle occasion (anniversaire, mariage, retraite) et pour chaque fête de l'année.",
  alternates: { canonical: absoluteUrl("/guides") },
};

// Revalidate so newly published/edited content appears without a redeploy.
export const revalidate = 60;

type Section = { id: string; title: string; group: GiftGuideGroup | null };

// Display order. Guides without a group fall into the last section.
const SECTIONS: Section[] = [
  { id: "fetes", title: "Fêtes de l'année", group: "fete" },
  { id: "pour-qui", title: "Pour qui", group: "destinataire" },
  { id: "occasions", title: "Pour quelle occasion", group: "occasion" },
  { id: "autres", title: "Autres idées", group: null },
];

const KNOWN_GROUPS = new Set<string>(["fete", "destinataire", "occasion"]);

// Numeric-aware so "Anniversaire 30 ans" sorts before "Anniversaire 40 ans".
const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const sortKey = (guide: GiftGuideListItem) => guide.occasion ?? guide.title;

function guidesFor(guides: GiftGuideListItem[], group: GiftGuideGroup | null) {
  return guides
    .filter((guide) =>
      group ? guide.group === group : !guide.group || !KNOWN_GROUPS.has(guide.group),
    )
    .sort((a, b) => collator.compare(sortKey(a), sortKey(b)));
}

export default async function GuidesIndexPage() {
  const { data } = await sanityFetch({ query: GIFT_GUIDES_QUERY });
  const guides = (data ?? []) as GiftGuideListItem[];

  const sections = SECTIONS.map((section) => ({
    ...section,
    guides: guidesFor(guides, section.group),
  })).filter((section) => section.guides.length > 0);

  return (
    <main className="flex-1">
      <JsonLd
        data={itemListJsonLd(
          guides.map((guide) => ({ name: guide.title, path: `/guides/${guide.slug}` })),
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />

      <header className="border-b-2 border-ink bg-brand text-brand-foreground">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="font-display text-xs uppercase tracking-[0.3em]">Guides cadeaux</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Idées de cadeaux personnalisés</h1>
          <p className="font-serif-accent mt-4 max-w-2xl text-lg italic">
            Pour qui, pour quelle occasion, pour quelle fête : des idées de cadeaux
            personnalisés triées par situation, avec les mots et souvenirs à y glisser.
          </p>
          {sections.length > 1 && (
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Rubriques">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-full border-2 border-brand-foreground px-3 py-1 text-sm hover:bg-brand-foreground hover:text-brand"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {sections.length === 0 ? (
          <p className="font-serif-accent text-lg italic text-ink/60">
            Aucun guide pour le moment, revenez bientôt.
          </p>
        ) : (
          <div className="space-y-14">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-3xl text-ink">{section.title}</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.guides.map((guide) => (
                    <Link
                      key={guide._id}
                      href={`/guides/${guide.slug}`}
                      className="frame group flex flex-col bg-paper p-5"
                    >
                      {guide.occasion && (
                        <span className="font-display text-xs uppercase tracking-[0.2em] text-brand">
                          {guide.occasion}
                        </span>
                      )}
                      <span className="mt-1 text-xl leading-snug text-ink group-hover:text-brand">
                        {guide.title}
                      </span>
                      {guide.intro && (
                        <p className="font-serif-accent mt-2 line-clamp-2 text-[15px] italic leading-snug text-ink/70">
                          {guide.intro}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
