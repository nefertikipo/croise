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
 * ⚠️ The express surcharge is a RETAIL figure to tune against a live Lulu
 * express quote (express costs materially more than MAIL). Override via
 * CARNET_EXPRESS_SURCHARGE_CENTS without a deploy.
 *
 * Keep this file free of server-only imports — it is shared by client and server.
 */
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
