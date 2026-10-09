import { NextResponse, after } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { sendOrderConfirmation } from "@/lib/billing/order-email";
import { submitOrderForPrinting, type OrderShipping } from "@/lib/billing/submit-order";
import type { LuluShippingLevel } from "@/lib/lulu/client";
import { CARNET_PRICE_CENTS } from "@/lib/books/pricing";

/** Lulu fetches PDFs + we hit our own interior route — give it room. */
export const maxDuration = 60;

/**
 * Stripe webhook. On `checkout.session.completed` (or
 * `checkout.session.async_payment_succeeded`) we record the paid order
 * (which assigns its sequential invoice number) and submit the print job to
 * Lulu. Everything is idempotent on the Stripe session id, so Stripe's retries
 * never double-charge, double-record, or double-print.
 *
 * Set STRIPE_WEBHOOK_SECRET from the endpoint's signing secret:
 * - Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 *   prints a whsec_… to put in .env.local.
 * - Production: create the endpoint in the Stripe dashboard for
 *   https://<domain>/api/stripe/webhook and copy its signing secret.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET manquant — webhook ignoré.");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch (err) {
    console.error("Signature Stripe invalide:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // Card payments arrive paid on `completed`; delayed methods (some wallets,
  // bank redirects) complete unpaid and confirm later via
  // `async_payment_succeeded`. Both run the same idempotent handler, which only
  // records an order once the session is actually paid.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      await handleCompleted(event.data.object as Stripe.Checkout.Session);
    } catch (err) {
      // Log and 500 so Stripe retries; the handler itself is idempotent.
      console.error(`Traitement ${event.type} échoué:`, err);
      return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

/** Stripe API-version drift: shipping lives in different places over time. */
type LooseSession = Stripe.Checkout.Session & {
  shipping_details?: {
    name?: string | null;
    address?: Stripe.Address | null;
    phone?: string | null;
  } | null;
  collected_information?: {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
  } | null;
};

async function handleCompleted(raw: Stripe.Checkout.Session): Promise<void> {
  // Re-retrieve so shipping + the chosen shipping rate are populated, regardless
  // of how much the event payload inlined.
  const session = (await getStripe().checkout.sessions.retrieve(raw.id, {
    expand: ["shipping_cost.shipping_rate"],
  })) as LooseSession;

  if (session.payment_status !== "paid") return;

  const bookCode = session.metadata?.bookCode;
  const bookTitle = session.metadata?.bookTitle ?? "Carnet";
  if (!bookCode) {
    console.error(`checkout ${session.id} sans metadata.bookCode — ignoré.`);
    return;
  }

  const cd = session.customer_details;
  const shipDetails =
    session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const address = shipDetails?.address ?? cd?.address ?? null;
  const name = shipDetails?.name ?? cd?.name ?? "";
  const phone = cd?.phone ?? null;
  const email = cd?.email ?? session.customer_email ?? "";

  // Which shipping speed did they pay for? The Lulu level rides in the chosen
  // rate's metadata; default to the slow/included MAIL if anything is missing.
  const rate = session.shipping_cost?.shipping_rate;
  const shippingLevel: LuluShippingLevel =
    typeof rate === "object" && rate?.metadata?.luluLevel === "EXPRESS"
      ? "EXPRESS"
      : "MAIL";

  const shipping: OrderShipping = { name, address, phone, email, shippingLevel };
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Insert only on payment → invoiceSeq stays gapless. Idempotent on session id.
  const [order] = await db
    .insert(orders)
    .values({
      bookCode,
      bookTitle,
      email,
      amount: session.amount_total ?? CARNET_PRICE_CENTS,
      currency: session.currency ?? "eur",
      stripeSessionId: session.id,
      stripePaymentIntent: paymentIntent,
      shipping,
      phone,
      status: "paid",
    })
    .onConflictDoNothing({ target: orders.stripeSessionId })
    .returning();

  // Conflict → another delivery of the same event already handled it.
  if (!order) return;

  // Print + emails run after the 200: Stripe's delivery never waits on PDF
  // rendering and the Lulu API. The outcome lands on the order row either way
  // (in_production / failed); one left at `paid` shows as stuck on
  // /admin/commandes, where it can be relaunched without re-charging.
  after(async () => {
    await submitOrderForPrinting(order);
    // Confirmation + invoice (best-effort — never fail over email).
    try {
      await sendOrderConfirmation(order);
    } catch (err) {
      console.error(`Email de confirmation échoué (commande ${order.id}):`, err);
    }
  });
}
