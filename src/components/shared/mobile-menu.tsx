"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBookLink } from "@/components/shared/create-book-link";

const LINKS = [
  { href: "/fleche", label: "Créer" },
  { href: "/idees-de-mots", label: "Idées de mots" },
  { href: "/contribuer", label: "Contribuer" },
];

/**
 * Mobile-only nav: a hamburger toggle that drops a full-width sheet with the
 * links + CTAs. Desktop keeps the inline nav (this is hidden at sm+).
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-10 w-10 items-center justify-center border-2 border-ink text-ink"
      >
        <span className="relative block h-4 w-5">
          <span
            className={`absolute left-0 top-0 h-0.5 w-5 bg-ink transition-transform duration-200 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-ink transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute bottom-0 left-0 h-0.5 w-5 bg-ink transition-transform duration-200 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b-2 border-ink bg-paper shadow-lg">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink/10 py-3 font-display text-base uppercase tracking-wide text-ink transition-colors hover:text-brand"
              >
                {l.label}
              </Link>
            ))}
            <CreateBookLink className="border-b border-ink/10 py-3 text-left font-display text-base uppercase tracking-wide text-ink transition-colors hover:text-brand" />
            <Link
              href="/fleche"
              onClick={() => setOpen(false)}
              className="btn-lapos mt-3 rounded-none bg-ink px-4 py-3 text-center text-base text-paper"
            >
              Commencer
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
