import type { ReactNode } from "react";

/**
 * Shared shell for the legal pages (mentions légales, CGV, confidentialité):
 * the vintage-editorial header band plus a readable prose column. Content is
 * plain server-rendered HTML so these pages stay static and indexable.
 */
export function LegalShell({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  /** Human-readable "dernière mise à jour" date, e.g. "31 août 2026". */
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="flex-1">
      <section className="border-b-2 border-ink bg-gold/25">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
            {kicker}
          </p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="font-serif-accent mt-3 text-sm italic text-ink/70">
            Dernière mise à jour : {updated}
          </p>
        </div>
      </section>
      <section className="bg-paper">
        <div className="prose-legal mx-auto max-w-3xl space-y-8 px-4 py-12 text-[15px] leading-relaxed text-ink">
          {children}
        </div>
      </section>
    </main>
  );
}

/** A titled section of a legal page. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brand">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
