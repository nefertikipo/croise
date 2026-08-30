import "server-only";
import Stripe from "stripe";

/**
 * Stripe SDK singleton (server-side only).
 *
 * Env:
 * - STRIPE_SECRET_KEY — sk_test_… while building, sk_live_… in production.
 * - STRIPE_WEBHOOK_SECRET — whsec_… from the webhook endpoint (see webhook route).
 *
 * `getStripe()` throws a clear error when the key is missing rather than
 * constructing a broken client, so a mis-provisioned deploy fails loudly.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant. Ajoutez la clé secrète Stripe (sk_test_… en dev, sk_live_… en production) aux variables d'environnement.",
    );
  }
  // Pin nothing: let the SDK use the account's default API version so the
  // TypeScript types and the live account never drift apart on upgrade.
  cached = new Stripe(key);
  return cached;
}

/** True when a Stripe secret key is configured — used to gate the checkout UI. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
