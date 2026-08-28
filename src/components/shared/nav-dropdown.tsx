"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type NavLink = { href: string; label: string; soon?: boolean };

/** Product entry points, grouped under the "Nos produits" dropdown. */
export const PRODUCT_LINKS: NavLink[] = [
  { href: "/livre/nouveau", label: "Carnet" },
  { href: "/carte/nouveau", label: "Carte", soon: true },
  { href: "/calendrier/nouveau", label: "Calendrier", soon: true },
];

/** Secondary links, folded into a single "Communauté" dropdown. */
export const MORE_LINKS: NavLink[] = [
  { href: "/idees-de-mots", label: "Idées de mots" },
  { href: "/contribuer", label: "Contribuer" },
];

/**
 * Desktop nav dropdown: groups a set of nav links under a single trigger so the
 * bar stays uncrowded. Opens on hover or click, closes on outside-click /
 * Escape. Reused for "Nos produits" and "Communauté".
 */
export function NavDropdown({ label, links }: { label: string; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand"
      >
        {label}
        <span
          className={`text-[0.6em] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 min-w-44 -translate-x-1/2 border-2 border-ink bg-paper shadow-lg"
        >
          {links.map((l) =>
            l.soon ? (
              <span
                key={l.href}
                role="menuitem"
                aria-disabled
                className="flex cursor-default items-center justify-between gap-2 border-b border-ink/10 px-4 py-2.5 font-display text-sm uppercase tracking-wide text-ink/40 last:border-b-0"
              >
                {l.label}
                <span className="text-[10px] tracking-[0.15em] text-ink/40">
                  Bientôt
                </span>
              </span>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block border-b border-ink/10 px-4 py-2.5 font-display text-sm uppercase tracking-wide text-ink transition-colors last:border-b-0 hover:bg-ink hover:text-paper"
              >
                {l.label}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
