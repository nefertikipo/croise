/**
 * Retail pricing for the carnet (the personalized crossword book).
 *
 * Single source of truth for what the customer pays. The €30 price bundles
 * printing + shipping (see the print-economics analysis); there is no separate
 * shipping line at checkout.
 *
 * VAT: as a French micro-entrepreneur under the *franchise en base de TVA*, we
 * charge NO VAT. The price is the price; invoices carry the legal mention
 * "TVA non applicable, art. 293 B du CGI" (see lib/billing/seller.ts). If/when
 * the business crosses the franchise threshold and registers for VAT, revisit
 * this file and enable Stripe Tax on the checkout session.
 *
 * Keep this file free of server-only imports — it is shared by client and
 * server (the order preview shows the price, the checkout route charges it).
 */

/** Currency for all charges (ISO 4217, lowercase for Stripe). */
export const CARNET_CURRENCY = "eur" as const;

/**
 * Carnet price in the currency's minor unit (cents). Overridable via env so the
 * price can be tuned without a deploy; defaults to €30.00.
 */
export const CARNET_PRICE_CENTS = Number(process.env.CARNET_PRICE_CENTS ?? 3000);

/** €30.00 → "30,00 €" (French formatting) for display. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
