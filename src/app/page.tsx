import Link from "next/link";
import { HeroCarousel } from "@/components/shared/hero-carousel";
import { CreateBookLink } from "@/components/shared/create-book-link";
import { WORD_IDEAS } from "@/lib/word-ideas";
import { cn } from "@/lib/utils";

// The things you can make with Les Flèches. Only the free generator and the
// carnet are live today; the printed formats are marked "bientôt" and stay
// non-clickable until their order flow ships.
type Product = {
  kicker: string;
  title: string;
  body: string;
  cta?: string;
  href?: string;
  book?: boolean;
  grille?: boolean;
  soon?: boolean;
};

const PRODUCTS: Product[] = [
  {
    kicker: "Gratuit",
    title: "Une grille",
    body: "Générez une grille de mots fléchés à vos mots, prête à imprimer, en quelques secondes.",
    cta: "Générer une grille",
    href: "/fleche",
    grille: true,
  },
  {
    kicker: "À feuilleter",
    title: "Un carnet",
    body: "Plusieurs grilles reliées en un carnet paginé, avec les solutions à la fin.",
    cta: "Créer un carnet",
    href: "/fleche",
    book: true,
  },
  {
    kicker: "À poster",
    title: "Une carte",
    body: "Une grille personnalisée sur une carte postale A6, votre message au dos, prête à envoyer.",
    soon: true,
  },
  {
    kicker: "À encadrer",
    title: "Un poster",
    body: "Une grille unique imprimée en grand format, à encadrer et à offrir.",
    soon: true,
  },
  {
    kicker: "Toute l'année",
    title: "Un calendrier",
    body: "Douze grilles, une par mois, sur un calendrier mural A3 relié spirale.",
    soon: true,
  },
  {
    kicker: "Chaque mois",
    title: "Un abonnement",
    body: "Une nouvelle grille personnalisée dans la boîte aux lettres, chaque mois de l'année.",
    soon: true,
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* ── Hero: photo recomposed as a shuffled crossword grid ── */}
      <section className="border-b-2 border-ink">
        <div className="relative h-[88vw] min-h-0 w-full overflow-hidden bg-ink sm:h-[62vh] sm:min-h-[460px]">
          <HeroCarousel className="absolute inset-0" />
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
              Des mots fléchés à vos mots, avec un message caché. Un cadeau à
              imprimer et à offrir.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/fleche"
                className="btn-lapos rounded-none bg-brand px-8 py-3.5 text-base text-brand-foreground"
              >
                Générer une grille gratuitement
              </Link>
              <CreateBookLink className="btn-lapos rounded-none bg-paper px-7 py-3 text-base text-ink">
                Créer un carnet de grilles
              </CreateBookLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you can make: poster / book / monthly gift ── */}
      <section className="border-b-2 border-ink bg-brand text-brand-foreground">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-4xl text-brand-foreground sm:text-5xl">
            Ce que vous pouvez créer
          </h2>
          <p className="font-serif-accent mx-auto mt-3 max-w-md text-center text-lg italic text-brand-foreground/80">
            La grille et le carnet sont là. Les formats imprimés arrivent.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div
                key={p.title}
                className={cn(
                  "frame relative flex flex-col bg-paper p-6 text-ink",
                  p.soon && "opacity-65",
                )}
              >
                {p.soon ? (
                  <span className="absolute right-3 top-3 border border-ink/20 bg-gold/50 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.15em] text-ink/70">
                    Bientôt
                  </span>
                ) : null}
                <div className="font-display text-xs uppercase tracking-[0.2em] text-brand">
                  {p.kicker}
                </div>
                <h3 className="mt-2 text-3xl text-ink">{p.title}</h3>
                <p className="font-serif-accent mt-3 flex-1 text-[15px] italic leading-snug text-ink/75">
                  {p.body}
                </p>
                {p.book ? (
                  <CreateBookLink className="btn-lapos mt-6 rounded-none bg-sun px-4 py-2.5 text-sm text-ink">
                    {p.cta}
                  </CreateBookLink>
                ) : p.grille ? (
                  <Link
                    href={p.href ?? "/fleche"}
                    className="btn-lapos mt-6 rounded-none bg-brand px-4 py-2.5 text-sm text-brand-foreground"
                  >
                    {p.cta}
                  </Link>
                ) : (
                  <span className="mt-6 inline-block select-none rounded-none border-2 border-ink/20 px-4 py-2.5 text-center font-display text-xs uppercase tracking-wide text-ink/45">
                    Bientôt disponible
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Word-idea inspiration: solve the blank-page problem ── */}
      <section className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
              Inspiration
            </p>
            <h2 className="mt-3 text-4xl text-ink sm:text-5xl">Quels mots choisir ?</h2>
            <p className="font-serif-accent mx-auto mt-4 max-w-2xl text-lg italic text-ink/70">
              Le plus dur, c&apos;est la page blanche. Trouvez les mots à glisser dans votre
              grille selon la personne à qui vous l&apos;offrez.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORD_IDEAS.map((r) => (
              <Link
                key={r.slug}
                href={`/idees-de-mots/${r.slug}`}
                className="frame group bg-paper p-5 text-center text-ink"
              >
                <h3 className="text-2xl group-hover:text-brand">Pour {r.label}</h3>
                <span className="font-display mt-3 inline-block text-xs uppercase tracking-[0.2em] text-brand">
                  Voir les idées
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/idees-de-mots"
              className="font-serif-accent text-lg italic text-ink/70 underline underline-offset-4 hover:text-brand"
            >
              Toutes les idées de mots
            </Link>
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
