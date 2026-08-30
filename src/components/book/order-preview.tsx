"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  BOOK_MIN_GRIDS,
  BOOK_MIN_INTERIOR_PAGES,
  POD_PAGE_SIZE,
  SADDLE_MAX_INTERIOR_PAGES,
} from "@/lib/books/constants";
import { CARNET_PRICE_CENTS, formatEuros } from "@/lib/books/pricing";
import { cn } from "@/lib/utils";

/**
 * When "1", the CTA runs a real Stripe checkout; otherwise it captures a
 * waitlist email (the pre-launch behavior). Lets checkout ship dark and flip on
 * once Stripe keys + seller identity are in place.
 */
const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CARNET_CHECKOUT === "1";

interface OrderPreviewProps {
  code: string;
  title: string;
  gridCount: number;
  /** Final interior page count — must sit inside the printable window to order. */
  interiorPages: number;
  hasCoverPhoto: boolean;
  /** Signed-in viewer's email, used to register order intent without a form. */
  sessionEmail: string | null;
}

/**
 * Proof-before-ordering page: embeds the REAL print PDFs (what Lulu receives),
 * a readiness checklist, and the explicit "j'ai vérifié" confirmation.
 * Until checkout ships, the CTA records order intent via /api/leads.
 */
export function OrderPreview({ code, title, gridCount, interiorPages, hasCoverPhoto, sessionEmail }: OrderPreviewProps) {
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState(sessionEmail ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Proof = exactly the file sent to Lulu: B&W interior at the POD trim.
  const interiorUrl = `/api/books/${code}/book.pdf?size=${POD_PAGE_SIZE}&bw=1`;
  const coverUrl = `/api/books/${code}/cover.pdf`;
  const enoughGrids = gridCount >= BOOK_MIN_GRIDS;
  // HARD printable window: the printer binds 24–48 interior pages.
  const tooThin = interiorPages < BOOK_MIN_INTERIOR_PAGES;
  const tooThick = interiorPages > SADDLE_MAX_INTERIOR_PAGES;
  const printablePages = !tooThin && !tooThick;
  const canOrder = checked && printablePages && hasCoverPhoto;

  async function startCheckout() {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/books/${code}/checkout`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Impossible de démarrer le paiement. Réessayez.");
        setSending(false);
        return;
      }
      // Redirect to Stripe's hosted checkout; keep `sending` so the button stays
      // disabled through the navigation.
      window.location.href = data.url;
    } catch {
      toast.error("Impossible de démarrer le paiement. Vérifiez votre connexion.");
      setSending(false);
    }
  }

  async function registerIntent() {
    if (sending || sent) return;
    if (!email.trim()) {
      toast.error("Indiquez votre email pour être prévenue de l'ouverture des commandes.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: `commande-${code}` }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Impossible d'enregistrer votre demande. Réessayez.");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'enregistrer votre demande. Vérifiez votre connexion.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl uppercase">{title}</h1>
            <p className="font-serif-accent text-sm italic text-ink/75">
              Aperçu avant impression : exactement les fichiers envoyés à
              l&apos;imprimeur.
            </p>
          </div>
          <Link href={`/book/${code}`} className={buttonVariants({ variant: "outline" })}>
            ← Retour à l&apos;éditeur
          </Link>
        </div>

        {/* Readiness checklist */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={cn(
              "border px-2 py-1 font-bold uppercase tracking-wide",
              enoughGrids ? "border-ink bg-accent/40" : "border-destructive text-destructive",
            )}
          >
            {gridCount} grille{gridCount > 1 ? "s" : ""} / {BOOK_MIN_GRIDS}
          </span>
          <span
            className={cn(
              "border px-2 py-1 font-bold uppercase tracking-wide",
              printablePages ? "border-ink bg-accent/40" : "border-destructive text-destructive",
            )}
          >
            {interiorPages} pages
            {tooThin
              ? ` / ${BOOK_MIN_INTERIOR_PAGES} min`
              : tooThick
                ? ` / ${SADDLE_MAX_INTERIOR_PAGES} max`
                : " ✓"}
          </span>
          <span
            className={cn(
              "border px-2 py-1 font-bold uppercase tracking-wide",
              hasCoverPhoto ? "border-ink bg-accent/40" : "border-destructive text-destructive",
            )}
          >
            {hasCoverPhoto ? "Photo de couverture ✓" : "Photo de couverture manquante"}
          </span>
        </div>

        {/* Cover spread */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.2em]">Couverture</h2>
            <a href={coverUrl} target="_blank" rel="noreferrer" className="text-xs underline">
              Ouvrir en plein écran
            </a>
          </div>
          {hasCoverPhoto ? (
            <iframe
              src={coverUrl}
              title="Couverture (dos, tranche, face)"
              className="h-[320px] w-full border-2 border-ink bg-white"
            />
          ) : (
            <div className="border-2 border-dashed border-black/30 px-6 py-10 text-center text-sm text-muted-foreground">
              Ajoutez une photo de couverture dans l&apos;éditeur pour la voir ici.
            </div>
          )}
        </section>

        {/* Interior */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.2em]">
              Intérieur du carnet
            </h2>
            <a href={interiorUrl} target="_blank" rel="noreferrer" className="text-xs underline">
              Ouvrir en plein écran
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Les pages intérieures sont imprimées en{" "}
            <span className="font-semibold text-ink">noir &amp; blanc</span> (comme
            un magazine de jeux) ; seule la couverture est en couleur.
          </p>
          <iframe
            src={interiorUrl}
            title="Intérieur du carnet (grilles, index, solutions)"
            className="h-[75vh] w-full border-2 border-ink bg-white"
          />
          <p className="text-xs text-muted-foreground">
            Sur mobile, utilisez «&nbsp;Ouvrir en plein écran&nbsp;» pour feuilleter
            toutes les pages.
          </p>
        </section>

        {/* Proof + order intent */}
        <section className="space-y-4 border-2 border-ink bg-card p-5 shadow-[4px_4px_0_0] shadow-ink/80">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span>
              J&apos;ai vérifié chaque page de mon carnet (mots, indices, photos,
              dédicace). Le carnet sera imprimé exactement comme dans cet aperçu.
            </span>
          </label>

          {CHECKOUT_ENABLED ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!canOrder || sending} onClick={startCheckout}>
                {sending
                  ? "Redirection…"
                  : `Commander mon carnet — ${formatEuros(CARNET_PRICE_CENTS)}`}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tooThin
                  ? `Ajoutez des grilles : un carnet imprimé compte au moins ${BOOK_MIN_INTERIOR_PAGES} pages.`
                  : tooThick
                    ? `Retirez des pages : la reliure accepte au maximum ${SADDLE_MAX_INTERIOR_PAGES} pages.`
                    : "Paiement sécurisé via Stripe · livraison standard incluse, express en option."}
              </span>
            </div>
          ) : sent ? (
            <p className="text-sm font-semibold">
              Merci ! Les commandes ouvrent très bientôt : nous vous écrivons dès
              que votre carnet pourra partir à l&apos;impression.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {!sessionEmail && (
                <input
                  type="email"
                  placeholder="votre@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-none border-2 border-ink/20 bg-white px-3 py-2 text-sm"
                />
              )}
              <Button disabled={!canOrder || sending} onClick={registerIntent}>
                {sending ? "Un instant…" : "Commander mon carnet"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tooThin
                  ? `Ajoutez des grilles : un carnet imprimé compte au moins ${BOOK_MIN_INTERIOR_PAGES} pages.`
                  : tooThick
                    ? `Retirez des pages : la reliure accepte au maximum ${SADDLE_MAX_INTERIOR_PAGES} pages.`
                    : "Ouverture des commandes très prochainement."}
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
