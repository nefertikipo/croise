import Link from "next/link";
import { CreateBookLink } from "@/components/shared/create-book-link";

const LINKS = [
  { href: "/fleche", label: "Créer" },
  { href: "/idees-de-mots", label: "Idées de mots" },
  { href: "/guides", label: "Idées cadeaux" },
  { href: "/contribuer", label: "Contribuer" },
];

export function Nav() {
  return (
    <div className="sticky top-0 z-50 print:hidden">
      {/* Announcement bar — Lapo's red ticker */}
      <div className="bg-brand text-brand-foreground">
        <p className="mx-auto max-w-5xl px-4 py-1.5 text-center font-display text-xs uppercase tracking-[0.2em]">
          Gratuit · Sans inscription · 100% en français ✦ Prêt à imprimer
        </p>
      </div>

      <nav className="border-b-2 border-ink bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-6 px-4">
          <Link href="/" className="group flex items-center gap-1.5">
            <span className="text-brand transition-transform group-hover:-rotate-6">
              ►
            </span>
            <span className="font-display text-2xl uppercase leading-none tracking-wide text-brand">
              Les&nbsp;Flèches
            </span>
          </Link>

          <div className="hidden items-center gap-6 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand"
              >
                {l.label}
              </Link>
            ))}
            <CreateBookLink />
          </div>

          <Link
            href="/fleche"
            className="btn-lapos rounded-none bg-ink px-4 py-2 text-sm text-paper"
          >
            Commencer
          </Link>
        </div>
      </nav>
    </div>
  );
}
