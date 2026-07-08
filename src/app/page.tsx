import Link from "next/link";
import { ShuffledImage } from "@/components/shared/shuffled-image";
import { CreateBookLink } from "@/components/shared/create-book-link";

// The three things you can make/offer with Les Flèches.
const PRODUCTS = [
  {
    kicker: "À encadrer",
    title: "Un poster",
    body: "Une grille unique, imprimée grand format — à encadrer, à accrocher, à offrir.",
    cta: "Créer un poster",
    href: "/fleche?intent=poster",
  },
    {
    kicker: "À feuilleter",
    title: "Un livre",
    body: "Plusieurs grilles reliées en un petit livret paginé, avec les solutions à la fin.",
    cta: "Créer un livre",
    href: "/fleche",
    book: true,
  },
  {
    kicker: "Toute l'année",
    title: "Chaque mois",
    body: "Offrez une nouvelle grille personnalisée, livrée fraîche chaque mois de l'année.",
    cta: "Offrir un abonnement",
    href: "/offrir",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* ── Hero: photo recomposed as a shuffled crossword grid ── */}
      <section className="border-b-2 border-ink">
        <div className="relative h-[62vh] min-h-[460px] w-full overflow-hidden bg-ink">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <ShuffledImage
              src="/demo-car.png"
              cols={14}
              rows={13}
              intensity={0.3}
              seed={11}
              gap={2}
              className="w-full !bg-ink"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/15 to-ink/35" />
          <div className="absolute inset-x-0 top-0 px-4 pt-10 text-center sm:pt-14">
            <h1 className="mx-auto max-w-4xl text-5xl leading-[0.9] text-paper drop-shadow-[0_2px_0_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl">
              Des grilles <span className="text-brand-foreground">à</span>{" "}
              <span className="text-sun">votre</span> image.
            </h1>
            <p className="mt-4 font-display text-xs uppercase tracking-[0.3em] text-paper/90 sm:text-sm">
              Gratuit · Sans inscription · En français
            </p>
          </div>
        </div>
        {/* CTA strip directly under the photo */}
        <div className="bg-paper">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
            <p className="font-serif-accent max-w-md text-center text-lg italic text-ink/80 sm:text-left">
              Créez des mots fléchés personnalisés avec vos propres mots — un
              message caché, un vrai cadeau, imprimé et offert.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/fleche"
                className="btn-lapos rounded-none bg-brand px-7 py-3 text-base text-brand-foreground"
              >
                Créer une grille
              </Link>
              <CreateBookLink className="btn-lapos rounded-none bg-paper px-7 py-3 text-base text-ink">
                Créer un livre
              </CreateBookLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you can make: poster / book / monthly gift ── */}
      <section className="border-b-2 border-ink bg-brand text-brand-foreground">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-4xl text-brand-foreground sm:text-5xl">
            Trois façons d&apos;offrir
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div key={p.title} className="frame flex flex-col bg-paper p-6 text-ink">
                <div className="font-display text-xs uppercase tracking-[0.2em] text-brand">
                  {p.kicker}
                </div>
                <h3 className="mt-2 text-3xl text-ink">{p.title}</h3>
                <p className="font-serif-accent mt-3 flex-1 text-[15px] italic leading-snug text-ink/75">
                  {p.body}
                </p>
                {"book" in p && p.book ? (
                  <CreateBookLink className="btn-lapos mt-6 rounded-none bg-sun px-4 py-2.5 text-sm text-ink">
                    {p.cta}
                  </CreateBookLink>
                ) : (
                  <Link
                    href={p.href}
                    className="btn-lapos mt-6 rounded-none bg-sun px-4 py-2.5 text-sm text-ink"
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing band ── */}
      <section className="relative border-b-2 border-ink bg-gold/30">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--ink) 1px, transparent 1px), linear-gradient(to bottom, var(--ink) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-ink/60">
            Il y a de l&apos;amour dans chaque case
          </p>
          <Link
            href="/fleche"
            className="btn-lapos rounded-none bg-brand px-9 py-4 text-lg text-brand-foreground"
          >
            Commencer ma grille
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-paper">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row">
          <span className="font-display text-2xl uppercase tracking-wide text-brand">
            <span className="text-brand">►</span> Les Flèches
          </span>
          <span className="font-serif-accent text-base italic text-ink/70">
            fait avec ♡ en France
          </span>
        </div>
      </footer>
    </main>
  );
}
