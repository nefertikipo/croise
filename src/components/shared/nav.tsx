import Link from "next/link";
import { CreateBookLink } from "@/components/shared/create-book-link";

const LINKS = [
  { href: "/fleche", label: "Créer" },
  { href: "/contribuer", label: "Contribuer" },
  { href: "/admin/label", label: "Scorer" },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-ink bg-paper/85 backdrop-blur-md print:hidden">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 px-4 h-14">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border-2 border-ink bg-brand text-brand-foreground text-sm font-bold transition-transform group-hover:-rotate-6">
            ►
          </span>
          <span
            className="text-2xl leading-none text-ink"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Les Flèches
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {l.label}
            </Link>
          ))}
          <CreateBookLink />
          <Link
            href="/fleche"
            className="ml-2 inline-flex items-center rounded-full border-2 border-ink bg-ink px-4 py-1.5 font-medium text-paper shadow-[2px_2px_0_0] shadow-brand transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Commencer
          </Link>
        </div>
      </div>
    </nav>
  );
}
