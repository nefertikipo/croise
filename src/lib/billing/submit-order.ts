import "server-only";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { fulfillCarnetOrder } from "@/lib/lulu/fulfill";
import { sendOperatorAlert } from "@/lib/billing/operator-alert";
import type { LuluShippingAddress, LuluShippingLevel } from "@/lib/lulu/client";

/** The `orders.shipping` snapshot, as written by the Stripe webhook. */
export interface OrderShipping {
  name: string;
  address: Stripe.Address | null;
  phone: string | null;
  email: string;
  shippingLevel: LuluShippingLevel;
}

type Order = typeof orders.$inferSelect;

function toLuluAddress(s: OrderShipping): LuluShippingAddress {
  if (!s.address) {
    throw new Error("Adresse de livraison absente de la commande.");
  }
  return {
    name: s.name,
    street1: s.address.line1 ?? "",
    street2: s.address.line2 ?? undefined,
    city: s.address.city ?? "",
    postcode: s.address.postal_code ?? "",
    country_code: s.address.country ?? "FR",
    state_code: s.address.state ?? undefined,
    phone_number: s.phone ?? "",
    email: s.email,
  };
}

/**
 * Submit a paid order to Lulu and record the outcome: `in_production` + job id
 * on success, `failed` + error on failure, with an operator email either way.
 * Shared by the Stripe webhook (first attempt) and the admin retry button, so
 * a failed order is re-printed from its frozen snapshot without re-charging.
 *
 * Callers own the "claim": only call this for an order nobody else is
 * submitting (fresh insert, or an atomic failed→paid flip).
 */
export async function submitOrderForPrinting(
  order: Order,
): Promise<{ ok: true; luluJobId: number } | { ok: false; error: string }> {
  const shipping = order.shipping as OrderShipping;
  try {
    const { luluJobId } = await fulfillCarnetOrder({
      orderId: order.id,
      code: order.bookCode,
      title: order.bookTitle,
      email: order.email,
      shipping: toLuluAddress(shipping),
      shippingLevel: shipping.shippingLevel,
    });
    await db
      .update(orders)
      .set({ status: "in_production", luluJobId, fulfillmentError: null, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    try {
      await sendOperatorAlert({
        subject: `Nouvelle commande — « ${order.bookTitle} »`,
        heading: "Commande envoyée à l'impression",
        lines: [
          `Carnet <strong>« ${order.bookTitle} »</strong> (${order.bookCode}) — commande #${order.id}.`,
          `Client : ${order.email} · livraison ${shipping.shippingLevel}.`,
          `Job Lulu <strong>#${luluJobId}</strong> soumis, statut in_production.`,
        ],
      });
    } catch (alertErr) {
      console.error(`Alerte nouvelle commande échouée (commande ${order.id}):`, alertErr);
    }
    return { ok: true, luluJobId };
  } catch (err) {
    console.error(`Fulfillment Lulu échoué (commande ${order.id}):`, err);
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(orders)
      .set({ status: "failed", fulfillmentError: message, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    try {
      await sendOperatorAlert({
        subject: `ACTION REQUISE — impression non lancée (commande #${order.id})`,
        heading: "Commande payée, impression échouée",
        lines: [
          `Le client a payé mais le job Lulu n'a PAS été créé.`,
          `Carnet <strong>« ${order.bookTitle} »</strong> (${order.bookCode}) — commande #${order.id} · client ${order.email}.`,
          `Erreur : <code>${message}</code>`,
          `À faire : corriger la cause puis « Relancer l'impression » sur /admin/commandes — le client ne doit pas être re-débité.`,
        ],
      });
    } catch (alertErr) {
      console.error(`Alerte échec fulfillment échouée (commande ${order.id}):`, alertErr);
    }
    return { ok: false, error: message };
  }
}

/**
 * A `paid` order the webhook should have moved on within seconds. Past this,
 * its background submission died (timeout, crash) and it needs a manual relaunch.
 */
export const ORDER_STUCK_AFTER_MS = 15 * 60 * 1000;
