import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { formatEuros } from "@/lib/books/pricing";
import { formatInvoiceNumber, getSeller, assertSellerConfigured } from "@/lib/billing/seller";
import { ORDER_STUCK_AFTER_MS, type OrderShipping } from "@/lib/billing/submit-order";
import { isStripeConfigured, isStripeLiveMode } from "@/lib/stripe/client";
import { isLuluProductionConfigured } from "@/lib/lulu/client";
import { RetryFulfillmentButton } from "@/components/admin/retry-fulfillment-button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Commandes - Admin Les Flèches",
};

const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Payée", className: "border-ink/40" },
  stuck: { label: "Bloquée", className: "border-destructive bg-destructive/10 text-destructive" },
  in_production: { label: "En impression", className: "border-ink bg-accent/40" },
  shipped: { label: "Expédiée", className: "border-ink bg-ink text-paper" },
  failed: { label: "Échec", className: "border-destructive bg-destructive/10 text-destructive" },
};

function sellerComplete(): boolean {
  try {
    assertSellerConfigured(getSeller());
    return true;
  } catch {
    return false;
  }
}

/** Go-live checklist, from the running deployment's own env (booleans only). */
function readinessChecks(): { label: string; ok: boolean; hint: string }[] {
  return [
    {
      label: "Stripe en mode live",
      ok: isStripeConfigured() && isStripeLiveMode(),
      hint: "STRIPE_SECRET_KEY doit être une clé sk_live_.",
    },
    {
      label: "Webhook Stripe",
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hint: "STRIPE_WEBHOOK_SECRET (endpoint /api/stripe/webhook, événement checkout.session.completed).",
    },
    {
      label: "Lulu en production",
      ok: isLuluProductionConfigured(),
      hint: "LULU_ENV=production + LULU_CLIENT_KEY / LULU_CLIENT_SECRET.",
    },
    {
      label: "Identité vendeur (factures)",
      ok: sellerComplete(),
      hint: "SELLER_LEGAL_NAME, SELLER_SIRET, SELLER_ADDRESS.",
    },
    {
      label: "Alertes opérateur",
      ok: Boolean(process.env.OPERATOR_EMAIL),
      hint: "OPERATOR_EMAIL : une boîte qui reçoit vraiment (sinon les alertes partent vers SELLER_EMAIL).",
    },
    {
      label: "Emails (Resend)",
      ok: Boolean(process.env.RESEND_API_KEY),
      hint: "RESEND_API_KEY.",
    },
    {
      label: "Suivi des colis (cron)",
      ok: Boolean(process.env.CRON_SECRET),
      hint: "CRON_SECRET.",
    },
    {
      label: "Bouton de commande public",
      ok: process.env.NEXT_PUBLIC_CARNET_CHECKOUT === "1",
      hint: "NEXT_PUBLIC_CARNET_CHECKOUT=1 puis redéployer (variable lue au build). Les admins voient déjà le vrai bouton.",
    },
  ];
}

/** Latest orders, tagged live/test and with stuck `paid` orders surfaced. */
async function loadOrders() {
  const list = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
  const stuckBefore = Date.now() - ORDER_STUCK_AFTER_MS;
  return list.map((o) => {
    const live = o.stripeSessionId.startsWith("cs_live_");
    const stuck = o.status === "paid" && o.updatedAt.getTime() < stuckBefore;
    return { ...o, live, statusKey: stuck ? "stuck" : o.status };
  });
}

export default async function AdminOrdersPage() {
  const rows = await loadOrders();
  const checks = readinessChecks();
  const liveRows = rows.filter((r) => r.live);
  const revenue = liveRows.reduce((sum, r) => sum + r.amount, 0);
  const needsAction = rows.filter((r) => r.statusKey === "failed" || r.statusKey === "stuck");

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand">Commandes</h1>
        <p className="mt-1 font-serif text-sm italic text-ink/70">
          {liveRows.length} commande{liveRows.length > 1 ? "s" : ""} réelle
          {liveRows.length > 1 ? "s" : ""} · {formatEuros(revenue)} encaissés
          {needsAction.length > 0 && (
            <span className="font-bold not-italic text-destructive">
              {" "}
              · {needsAction.length} à traiter
            </span>
          )}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-sm uppercase tracking-[0.2em]">Prêt à vendre ?</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className={cn(
                "border-2 px-3 py-2 text-sm",
                c.ok ? "border-ink/20" : "border-destructive bg-destructive/5",
              )}
            >
              <span className="font-bold">{c.ok ? "✓" : "✗"} {c.label}</span>
              {!c.ok && <p className="mt-0.5 text-xs text-ink/70">{c.hint}</p>}
            </li>
          ))}
        </ul>
      </section>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center font-serif italic text-ink/70">
          Aucune commande pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-ink bg-paper text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Facture</th>
                <th className="px-3 py-2">Carnet</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Montant</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Lulu</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const shipping = o.shipping as OrderShipping;
                const status = STATUS[o.statusKey] ?? { label: o.status, className: "border-ink/40" };
                const trackingUrls =
                  (o.tracking as { trackingUrls?: string[] } | null)?.trackingUrls ?? [];
                const stripeUrl = o.stripePaymentIntent
                  ? `https://dashboard.stripe.com/${o.live ? "" : "test/"}payments/${o.stripePaymentIntent}`
                  : null;
                return (
                  <tr key={o.id} className="border-b border-ink/15 align-top last:border-0">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs">
                        {formatInvoiceNumber(o.invoiceSeq, o.createdAt.getFullYear())}
                      </div>
                      <div className="text-xs text-ink/60">
                        {o.createdAt.toLocaleString("fr-FR", {
                          timeZone: "Europe/Paris",
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                      {!o.live && (
                        <span className="mt-1 inline-block border border-ink/40 px-1 text-[10px] uppercase">
                          Test
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/book/${o.bookCode}/apercu`} className="font-semibold underline">
                        {o.bookTitle}
                      </Link>
                      <div className="font-mono text-xs text-ink/60">{o.bookCode}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{shipping.name}</div>
                      <div className="text-xs text-ink/60">{o.email}</div>
                      <div className="text-xs text-ink/60">
                        {[shipping.address?.postal_code, shipping.address?.city, shipping.address?.country]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div>{formatEuros(o.amount)}</div>
                      <div className="text-xs text-ink/60">{shipping.shippingLevel}</div>
                      {stripeUrl && (
                        <a href={stripeUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                          Stripe
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("border px-2 py-0.5 text-xs font-bold uppercase", status.className)}>
                        {status.label}
                      </span>
                      {o.fulfillmentError && (
                        <p className="mt-1 max-w-xs text-xs text-destructive">{o.fulfillmentError}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {o.luluJobId ? `#${o.luluJobId}` : "—"}
                      {trackingUrls.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="block underline">
                          Suivi
                        </a>
                      ))}
                    </td>
                    <td className="px-3 py-3">
                      {(o.statusKey === "failed" || o.statusKey === "stuck") && (
                        <RetryFulfillmentButton orderId={o.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
