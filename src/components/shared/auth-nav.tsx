"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Nav auth state: sign-in link when logged out, account menu when logged in.
 * `variant="sheet"` renders inline full-width rows for the mobile menu (no
 * popover); `onNavigate` closes that sheet after a tap.
 */
export function AuthNav({
  variant = "bar",
  onNavigate,
}: {
  variant?: "bar" | "sheet";
  onNavigate?: () => void;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    setOpen(false);
    onNavigate?.();
    await signOut();
    router.push("/");
    router.refresh();
  }

  // Mobile sheet: inline rows matching the other menu links, no dropdown.
  if (variant === "sheet") {
    if (isPending) return null;
    const row =
      "border-b border-ink/10 py-3 text-left font-display text-base uppercase tracking-wide text-ink transition-colors hover:text-brand";
    if (!session) {
      return (
        <Link href="/connexion" onClick={onNavigate} className={row}>
          Se connecter
        </Link>
      );
    }
    const name = session.user.name?.trim() || session.user.email.split("@")[0];
    return (
      <>
        <span className="pt-3 font-display text-xs uppercase tracking-wide text-ink/50">
          {name}
        </span>
        <Link href="/mes-grilles" onClick={onNavigate} className={row}>
          Mes grilles
        </Link>
        <Link href="/mes-livres" onClick={onNavigate} className={row}>
          Mes livres
        </Link>
        <button onClick={handleSignOut} className={`${row} text-brand`}>
          Déconnexion
        </button>
      </>
    );
  }

  if (isPending) {
    return <span className="h-4 w-16 animate-pulse rounded bg-ink/10" />;
  }

  if (!session) {
    return (
      <Link
        href="/connexion"
        className="font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand"
      >
        Se connecter
      </Link>
    );
  }

  const label =
    session.user.name?.trim() || session.user.email.split("@")[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-display text-sm uppercase tracking-wide text-ink transition-colors hover:text-brand"
      >
        {label} ▾
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div className="absolute right-0 z-50 mt-2 w-44 border-2 border-ink bg-paper shadow-[4px_4px_0_0_var(--ink)]">
            <Link
              href="/mes-grilles"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-display text-xs uppercase tracking-wide text-ink hover:bg-ink/5"
            >
              Mes grilles
            </Link>
            <Link
              href="/mes-livres"
              onClick={() => setOpen(false)}
              className="block border-t-2 border-ink px-4 py-2.5 font-display text-xs uppercase tracking-wide text-ink hover:bg-ink/5"
            >
              Mes livres
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full border-t-2 border-ink px-4 py-2.5 text-left font-display text-xs uppercase tracking-wide text-brand hover:bg-brand/5"
            >
              Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  );
}
