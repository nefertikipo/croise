"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

/** Nav auth state: sign-in link when logged out, account menu when logged in. */
export function AuthNav() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

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
