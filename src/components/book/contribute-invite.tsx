"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { rememberDraft } from "@/lib/books/draft-storage";

interface ContributeInviteProps {
  code: string;
  initialEnabled: boolean;
  /** True when the viewer owns this book. Inviting needs ownership so the share
   * code can't hand edit rights to everyone — anonymous makers sign in first. */
  owned: boolean;
}

/**
 * Owner control for the "invite friends to add clues" feature. Opening
 * contributions flips `books.contributionsEnabled` on; the share link then lets
 * anyone add clues via /participer/[code], which land straight in this book's
 * clue-idea list below (credited to their author). The owner can close
 * contributions again at any time.
 */
export function ContributeInvite({ code, initialEnabled, owned }: ContributeInviteProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/participer/${code}` : "";

  async function setContributions(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionsEnabled: next }),
      });
      if (!res.ok) {
        toast.error("Impossible de modifier les contributions. Réessayez.");
        return;
      }
      setEnabled(next);
    } catch {
      toast.error("Connexion perdue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible — sélectionnez le lien à la main.");
    }
  }

  return (
    <div className="mb-4 border-2 border-ink bg-accent/30 p-4 shadow-[3px_3px_0_0] shadow-ink/60">
      <h4 className="font-heading text-lg uppercase">Écrire à plusieurs</h4>
      {!owned ? (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-ink/75">
            Invitez la famille et les amis à ajouter leurs propres indices —
            chacun sera crédité dans la dédicace. Créez d&apos;abord un compte
            gratuit : vous seule pourrez modifier le carnet, vos proches ne font
            qu&apos;ajouter des idées.
          </p>
          <Link
            href={`/connexion?redirect=/book/${code}`}
            onClick={() => rememberDraft(code)}
            className="inline-block rounded-none border-2 border-ink bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5"
          >
            Créer un compte pour inviter
          </Link>
        </div>
      ) : enabled ? (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-ink/75">
            Partagez ce lien avec vos proches. Leurs indices arrivent
            automatiquement dans la liste ci-dessous — vous gardez la main pour les
            modifier ou les retirer.
          </p>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-none border-2 border-ink/30 bg-white px-2 py-1.5 font-mono text-xs"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-none border-2 border-ink bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[2px_2px_0_0] shadow-ink/60"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setContributions(false)}
            disabled={busy}
            className="text-xs text-ink/60 underline hover:text-destructive disabled:opacity-50"
          >
            Fermer les contributions
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-ink/75">
            Vous n&apos;êtes pas obligée de tout écrire seule. Invitez la famille et
            les amis à ajouter leurs propres indices — chacun sera crédité dans la
            dédicace.
          </p>
          <button
            type="button"
            onClick={() => setContributions(true)}
            disabled={busy}
            className="rounded-none border-2 border-ink bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? "Un instant…" : "Inviter des proches à participer"}
          </button>
        </div>
      )}
    </div>
  );
}
