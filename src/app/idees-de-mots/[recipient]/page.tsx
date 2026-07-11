import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { absoluteUrl } from "@/lib/site";
import { WORD_IDEAS, getRecipientIdeas } from "@/lib/word-ideas";

type RouteProps = { params: Promise<{ recipient: string }> };

export function generateStaticParams() {
  return WORD_IDEAS.map((r) => ({ recipient: r.slug }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { recipient } = await params;
  const data = getRecipientIdeas(recipient);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: absoluteUrl(`/idees-de-mots/${data.slug}`) },
    openGraph: { title: data.title, description: data.description, type: "article" },
  };
}

export default async function WordIdeasRecipientPage({ params }: RouteProps) {
  const { recipient } = await params;
  const data = getRecipientIdeas(recipient);
  if (!data) notFound();

  const path = `/idees-de-mots/${data.slug}`;

  return (
    <main className="flex-1">
      <JsonLd
        data={articleJsonLd({ title: data.title, description: data.description, path })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Idées de mots", path: "/idees-de-mots" },
          { name: `Pour ${data.label}`, path },
        ])}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-brand">
          Idées de mots
        </p>
        <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{data.title}</h1>
        <p className="font-serif-accent mt-4 text-xl italic text-ink/70">{data.intro}</p>

        <div className="mt-10 space-y-8">
          {data.groups.map((group) => (
            <section key={group.theme} className="frame bg-paper p-6">
              <h2 className="text-2xl text-ink">{group.theme}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.ideas.map((idea) => (
                  <li
                    key={idea}
                    className="rounded-md border border-ink/15 bg-white px-3 py-1.5 text-[15px] text-ink/80"
                  >
                    {idea}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="frame mt-8 bg-gold/20 p-6">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-brand">
            Le message caché
          </h2>
          <p className="mt-2 text-lg leading-relaxed text-ink">
            Chaque grille cache un mot. Au fil des pages du livre, ils composent un message.
            Quelques idées : {data.hiddenMessages.join(", ")}.
          </p>
        </section>

        <div className="mt-10">
          <Link
            href="/fleche"
            className="btn-lapos inline-block rounded-md bg-brand px-7 py-3 text-base text-brand-foreground"
          >
            Composer ma grille
          </Link>
        </div>

        <nav className="mt-12 border-t border-ink/10 pt-6">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-ink/50">
            Pour d'autres personnes
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {WORD_IDEAS.filter((r) => r.slug !== data.slug).map((r) => (
              <Link
                key={r.slug}
                href={`/idees-de-mots/${r.slug}`}
                className="text-brand underline underline-offset-2"
              >
                Pour {r.label}
              </Link>
            ))}
          </div>
        </nav>
      </article>
    </main>
  );
}
