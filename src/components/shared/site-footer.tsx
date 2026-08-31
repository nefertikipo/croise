"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
];

// Same exclusion as SiteChrome: the embedded Sanity Studio is a full-screen
// app and must not carry the marketing footer.
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return null;

  return (
    <footer className="border-t-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-ink/70">
        <p className="font-display uppercase tracking-[0.2em] text-ink">
          Les Flèches
        </p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink hover:underline">
              {l.label}
            </Link>
          ))}
          <a href="mailto:bonjour@lesfleches.com" className="hover:text-ink hover:underline">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
