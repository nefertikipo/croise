/**
 * Shipping tiers offered at carnet checkout.
 *
 * The €30 carnet price bundles STANDARD shipping (Lulu MAIL), so standard is a
 * €0 surcharge. Express is a paid upgrade whose surcharge is added to the total
 * by Stripe and whose pick is mapped to a faster Lulu shipping level at
 * fulfillment (see the webhook).
 *
 * `luluLevel` values are Lulu shipping levels (see LuluShippingLevel). EXPRESS
 * is confirmed available to France for our SKU (the Elise order shipped EXPRESS);
 * EXPEDITED did not return a FR quote, so avoid it.
 *
 * The express amountCents here is only a FALLBACK: at checkout the surcharge
 * is re-priced from a live Lulu quote for the destination country (see
 * lib/lulu/shipping-quote.ts), because real express cost spans €19 to €67
 * all-in depending on the country. These static entries still provide the
 * labels and delivery-day estimates.
 *
 * Keep this file free of server-only imports — it is shared by client and server.
 */
/** Countries we currently sell/ship the carnet to (Lulu prints for all of
 * these). Shared by the checkout route (Stripe allowed_countries) and the CGV
 * page so the legal text never drifts from what checkout actually allows.
 * ES and IT are excluded for now: Lulu requires a state/province on their
 * addresses but Stripe Checkout does not collect one there, so fulfillment
 * would fail after payment. Re-add once a postcode → province mapping exists
 * (verified against the live cost-calc API 2026-08-31). */
export const CARNET_ALLOWED_COUNTRIES = [
  "FR", "BE", "CH", "LU", "MC", "DE", "NL", "PT", "IE", "AT", "GB",
] as const;

export type CarnetCountry = (typeof CARNET_ALLOWED_COUNTRIES)[number];

export type CarnetShippingKey = "standard" | "express";

export interface CarnetShippingOption {
  key: CarnetShippingKey;
  label: string;
  /** Surcharge on top of the carnet price, in cents. */
  amountCents: number;
  /** Lulu shipping level this tier fulfills as. */
  luluLevel: "MAIL" | "EXPRESS";
  /** Business-day delivery estimate shown at checkout. */
  minDays: number;
  maxDays: number;
}

export const CARNET_SHIPPING_OPTIONS: CarnetShippingOption[] = [
  {
    key: "standard",
    label: "Livraison standard (incluse)",
    amountCents: 0,
    luluLevel: "MAIL",
    minDays: 5,
    maxDays: 12,
  },
  {
    key: "express",
    label: "Livraison express",
    amountCents: Number(process.env.CARNET_EXPRESS_SURCHARGE_CENTS ?? 1200),
    luluLevel: "EXPRESS",
    minDays: 2,
    maxDays: 4,
  },
];
