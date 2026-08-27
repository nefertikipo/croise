import { ShuffledPhrase } from "@/components/shared/shuffled-phrase";

/**
 * The Lapo's-style FAQ / newsletter sections. Kept for reuse (landing pages,
 * campaigns) but intentionally NOT rendered on the homepage, which felt too
 * e-commerce-y with them. Import a section where it earns its place.
 */

const FAQ = [
  {
    q: "Est-ce vraiment gratuit ?",
    a: "Oui. La création et l'export PDF sont gratuits, sans inscription et sans filigrane.",
  },
  {
    q: "Comment mes mots entrent-ils dans la grille ?",
    a: "Vous listez vos mots, notre générateur les place automatiquement dans une grille dense de mots fléchés, avec des définitions.",
  },
  {
    q: "C'est quoi le mot caché ?",
    a: "Un message que vous choisissez, dissimulé dans certaines cases de la grille. Une fois la grille remplie, il apparaît.",
  },
  {
    q: "Puis-je en faire un carnet ?",
    a: "Oui, regroupez plusieurs grilles en un carnet paginé, avec les solutions à la fin, prêt à imprimer.",
  },
];


export function FaqSection() {
  return (
    <section className="border-b-2 border-ink bg-gold/40">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-4xl text-ink sm:text-5xl">
          Questions fréquentes
        </h2>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="frame group bg-paper p-4 [&_summary]:list-none"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-display text-sm uppercase tracking-wide text-ink">
                {item.q}
                <span className="text-brand transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="font-serif-accent mt-3 text-[15px] italic leading-snug text-ink/75">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsletterSection() {
  return (
    <section className="border-b-2 border-ink bg-brand text-brand-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center">
        <h2 className="text-4xl text-brand-foreground sm:text-5xl">
          Restez en contact
        </h2>
        <ShuffledPhrase text="Offrez un souvenir" />
        <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            placeholder="votre@email.fr"
            className="frame-tight flex-1 rounded-none bg-paper px-4 py-3 text-ink placeholder:text-ink/40 focus:outline-none"
          />
          <button
            type="submit"
            className="btn-lapos rounded-none bg-ink px-6 py-3 text-sm text-paper"
          >
            S&apos;inscrire
          </button>
        </form>
      </div>
    </section>
  );
}
