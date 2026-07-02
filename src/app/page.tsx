import Link from "next/link";
import { PosterGrid } from "@/components/shared/poster-grid";
import { ShuffledPhrase } from "@/components/shared/shuffled-phrase";

const FEATURES = [
  { n: "01", title: "Vos mots", body: "Prénoms, surnoms, souvenirs, blagues internes — glissés dans la grille." },
  { n: "02", title: "Mot caché", body: "Un message secret dissimulé dans la grille, à déchiffrer case par case." },
  { n: "03", title: "Prêt à offrir", body: "Export PDF, solution au verso. Une grille unique ou un petit livre." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-14 pb-20 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-6xl sm:text-7xl leading-[0.85] text-ink">
              Des grilles
              <br />
              <span className="text-brand">à votre</span>
              <br />
              image.
            </h1>
            <p className="mx-auto max-w-sm text-lg text-muted-foreground lg:mx-0 text-balance">
              Créez des mots fléchés personnalisés avec vos propres mots. Un
              message caché, un vrai cadeau — imprimé, offert.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/fleche"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-ink bg-brand px-8 text-lg font-medium text-brand-foreground shadow-[3px_3px_0_0] shadow-ink transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Créer une grille
              </Link>
              <Link
                href="/fleche"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-ink bg-paper px-8 text-lg font-medium text-ink transition-colors hover:bg-accent"
              >
                Créer un livre
              </Link>
            </div>
            <p
              className="text-xl text-ink/70"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              gratuit · sans inscription · en français ♡
            </p>
          </div>

          {/* Signature crossword-cover grid */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rotate-1 transition-transform hover:rotate-0">
              <PosterGrid />
            </div>
          </div>
        </div>
      </section>

      {/* Features — numbered like crossword clues */}
      <section className="border-y-2 border-ink bg-secondary/50">
        <div className="mx-auto grid max-w-5xl gap-0 px-0 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`p-8 ${i < 2 ? "sm:border-r-2 sm:border-ink" : ""} border-b-2 border-ink sm:border-b-0`}
            >
              <div className="font-display text-4xl text-brand">{f.n}</div>
              <h3 className="mt-3 text-2xl text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing — shuffled cells + CTA */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <p className="mb-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Il y a de l&apos;amour dans chaque case
        </p>
        <ShuffledPhrase text="Offrez un souvenir" />
        <div className="mt-12">
          <Link
            href="/fleche"
            className="inline-flex h-14 items-center justify-center rounded-full border-2 border-ink bg-ink px-10 text-xl font-medium text-paper shadow-[3px_3px_0_0] shadow-brand transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Commencer ma grille
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span className="text-2xl text-ink" style={{ fontFamily: "var(--font-handwritten)" }}>
            <span className="text-brand">►</span> Les Flèches
          </span>
          <span style={{ fontFamily: "var(--font-handwritten)" }} className="text-base">
            fait avec ♡ en France
          </span>
        </div>
      </footer>
    </main>
  );
}
