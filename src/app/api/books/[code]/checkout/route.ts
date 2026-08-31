import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadBook } from "@/lib/books/serialize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import {
  BOOK_MIN_GRIDS,
  BOOK_MIN_INTERIOR_PAGES,
  SADDLE_MAX_INTERIOR_PAGES,
  POD_TRIM,
} from "@/lib/books/constants";
import { getStripe, isStripeConfigured, isStripeLiveMode } from "@/lib/stripe/client";
import { isLuluProductionConfigured } from "@/lib/lulu/client";
import { getSeller, assertSellerConfigured } from "@/lib/billing/seller";
import { CARNET_CURRENCY, CARNET_PRICE_CENTS } from "@/lib/books/pricing";
import { CARNET_ALLOWED_COUNTRIES, type CarnetCountry } from "@/lib/books/shipping";
import { quoteCarnetShippingOptions } from "@/lib/lulu/shipping-quote";
import { SITE_URL } from "@/lib/site";

/**
 * Start a paid checkout for a carnet: validates the book is print-ready, then
 * creates a Stripe Checkout Session (Stripe collects the shipping address +
 * phone Lulu needs) and returns its hosted-page URL. The order row and the Lulu
 * print job are created later, by the `checkout.session.completed` webhook —
 * never here — so an abandoned checkout leaves no order and no charge.
 *
 * The client sends the destination country up front (Stripe only collects the
 * address later, inside checkout, after shipping options are fixed): express
 * cost varies wildly by country, so the session's shipping options are quoted
 * live from Lulu for that country and the address form is locked to it.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as { country?: string };
  const country: CarnetCountry = (CARNET_ALLOWED_COUNTRIES as readonly string[]).includes(
    body.country ?? "",
  )
    ? (body.country as CarnetCountry)
    : "FR";

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Le paiement n'est pas encore configuré." },
      { status: 503 },
    );
  }

  // Never take real money unless the order can complete legally and physically:
  // a live charge with a sandbox Lulu config would look successful and never
  // ship a book, and a live sale without seller identity issues a non-compliant
  // invoice. Test mode stays unrestricted.
  if (isStripeLiveMode()) {
    const blockers: string[] = [];
    if (!isLuluProductionConfigured()) {
      blockers.push("Lulu hors production (LULU_ENV/LULU_CLIENT_KEY/LULU_CLIENT_SECRET)");
    }
    try {
      assertSellerConfigured(getSeller());
    } catch (err) {
      blockers.push(err instanceof Error ? err.message : String(err));
    }
    if (blockers.length > 0) {
      console.error(`Checkout live refusé : ${blockers.join(" · ")}`);
      return NextResponse.json(
        { error: "Le paiement est temporairement indisponible." },
        { status: 503 },
      );
    }
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

  // Live per-country shipping tiers: standard is bundled in the price, express
  // is the real Lulu delta for this destination (standard-only on quote failure).
  const shippingOptions = await quoteCarnetShippingOptions(country, interiorPages);

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
              description: `${gridCount} grilles · ${interiorPages} pages · format ${POD_TRIM.w} × ${POD_TRIM.h} mm · impression + livraison incluses`,
            },
          },
        },
      ],
      // Lulu needs a full shipping address + phone; let Stripe collect both.
      // Locked to the pre-selected country: the shipping prices quoted above
      // are only valid there.
      shipping_address_collection: { allowed_countries: [country] },
      phone_number_collection: { enabled: true },
      // Standard (included) vs express (surcharge). The chosen tier's Lulu level
      // travels in the rate's metadata so the webhook fulfills at the right speed.
      shipping_options: shippingOptions.map((opt) => ({
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
