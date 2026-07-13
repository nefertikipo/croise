import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl } from "@/lib/site";
import { WORD_IDEAS } from "@/lib/word-ideas";

export const metadata: Metadata = {
  title: "Idées de mots : quels mots mettre dans un mot fléché personnalisé",
  description:
    "En panne d'inspiration ? Des idées de mots à glisser dans votre grille personnalisée, selon la personne à qui vous l'offrez.",
  alternates: { canonical: absoluteUrl("/idees-de-mots") },
};

export default function WordIdeasHubPage() {
  return (
    <main className="flex-1">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
            Inspiration
          </p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
            Quels mots mettre dans votre grille ?
          </h1>
          <p className="font-serif-accent mt-4 max-w-2xl text-xl italic text-ink/70">
            Le plus dur, c'est la page blanche. Choisissez la personne à qui vous offrez la
            grille et laissez-vous inspirer.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2">
          {WORD_IDEAS.map((r) => (
            <Link
              key={r.slug}
              href={`/idees-de-mots/${r.slug}`}
              className="frame group flex flex-col bg-paper p-6"
            >
              <h2 className="text-2xl text-ink group-hover:text-brand">
                Pour {r.label}
              </h2>
              <p className="font-serif-accent mt-2 flex-1 text-[15px] italic leading-snug text-ink/70">
                {r.intro}
              </p>
              <span className="btn-lapos mt-6 self-start rounded-md bg-sun px-4 py-2 text-sm text-ink">
                Voir les idées
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
