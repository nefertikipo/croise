import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadBook } from "@/lib/books/serialize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import {
  BOOK_MIN_GRIDS,
  BOOK_MIN_INTERIOR_PAGES,
  SADDLE_MAX_INTERIOR_PAGES,
} from "@/lib/books/constants";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { CARNET_CURRENCY, CARNET_PRICE_CENTS } from "@/lib/books/pricing";
import { CARNET_SHIPPING_OPTIONS } from "@/lib/books/shipping";
import { SITE_URL } from "@/lib/site";

/** Countries we currently sell/ship the carnet to (Lulu prints for all of these). */
const ALLOWED_COUNTRIES = [
  "FR", "BE", "CH", "LU", "MC", "DE", "ES", "IT", "NL", "PT", "IE", "AT", "GB",
] as const;

/**
 * Start a paid checkout for a carnet: validates the book is print-ready, then
 * creates a Stripe Checkout Session (Stripe collects the shipping address +
 * phone Lulu needs) and returns its hosted-page URL. The order row and the Lulu
 * print job are created later, by the `checkout.session.completed` webhook —
 * never here — so an abandoned checkout leaves no order and no charge.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Le paiement n'est pas encore configuré." },
      { status: 503 },
    );
  }

  const book = await loadBook(code);
  if (!book) {
    return NextResponse.json({ error: "Carnet introuvable." }, { status: 404 });
  }

  // Re-check print readiness server-side — never trust the client to gate a charge.
  const gridCount = book.pages.filter((p) => p.kind === "grid").length;
  const interiorPages = interiorPageCountForCapacity(book);
  const hasCoverPhoto = Boolean(book.coverConfig?.design?.photoRef);
  if (
    gridCount < BOOK_MIN_GRIDS ||
    interiorPages < BOOK_MIN_INTERIOR_PAGES ||
    interiorPages > SADDLE_MAX_INTERIOR_PAGES ||
    !hasCoverPhoto
  ) {
    return NextResponse.json(
      { error: "Ce carnet n'est pas encore prêt à être imprimé." },
      { status: 400 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CARNET_CURRENCY,
            unit_amount: CARNET_PRICE_CENTS,
            product_data: {
              name: `Carnet de mots fléchés — ${book.title}`,
              description: `${gridCount} grilles · ${interiorPages} pages · format A5 · impression + livraison incluses`,
            },
          },
        },
      ],
      // Lulu needs a full shipping address + phone; let Stripe collect both.
      shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
      phone_number_collection: { enabled: true },
      // Standard (included) vs express (surcharge). The chosen tier's Lulu level
      // travels in the rate's metadata so the webhook fulfills at the right speed.
      shipping_options: CARNET_SHIPPING_OPTIONS.map((opt) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: opt.label,
          fixed_amount: { amount: opt.amountCents, currency: CARNET_CURRENCY },
          delivery_estimate: {
            minimum: { unit: "business_day", value: opt.minDays },
            maximum: { unit: "business_day", value: opt.maxDays },
          },
          metadata: { luluLevel: opt.luluLevel },
        },
      })),
      billing_address_collection: "auto",
      customer_email: session?.user?.email ?? undefined,
      // The webhook reads this to know which book to print.
      metadata: { bookCode: code, bookTitle: book.title },
      success_url: `${SITE_URL}/book/${code}/commande/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/book/${code}/apercu`,
    });

    if (!checkout.url) {
      throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
    }
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Stripe checkout creation failed:", err);
    return NextResponse.json(
      { error: "Impossible de démarrer le paiement. Réessayez." },
      { status: 500 },
    );
  }
}
