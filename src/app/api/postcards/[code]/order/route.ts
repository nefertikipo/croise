import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { eq } from "drizzle-orm";
import { authorizePostcardEdit } from "@/lib/postcards/authorize";
import { loadPostcard } from "@/lib/postcards/serialize";
import { createOrder, type GelatoShippingAddress } from "@/lib/gelato/client";
import { GELATO_POSTCARD_PRODUCT_UID, postcardSourceUrl } from "@/lib/gelato/product";

/** Placing a Gelato order fetches the print file and can be slow under load. */
export const maxDuration = 60;

const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  addressLine1: z.string().trim().min(1).max(120),
  addressLine2: z.string().trim().max(120).optional(),
  postCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  // ISO 3166-1 alpha-2 (e.g. "FR"). Defaults to France, our only market for now.
  country: z.string().trim().length(2).toUpperCase().default("FR"),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
});

const orderSchema = z.object({
  delivery: z.enum(["self", "direct"]),
  quantity: z.number().int().min(1).max(50).default(1),
  address: addressSchema,
});

/**
 * Place a fulfilment order for a card. For "direct" the address is the
 * recipient's (Gelato mails straight to them); for "self" it's the buyer's (they
 * receive the card and post it by hand).
 *
 * PAYMENT IS NOT WIRED YET: this always creates a Gelato *draft* (never charged
 * or produced) so the end-to-end flow can be exercised safely. Switching to a
 * real "order" must be gated behind a completed payment.
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizePostcardEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = orderSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Adresse invalide." }, { status: 400 });
    }
    const { delivery, quantity, address } = parsed.data;

    // A card can only be ordered once it has a generated grid to print.
    const card = await loadPostcard(code);
    if (!card?.grid) {
      return NextResponse.json({ error: "Générez d'abord la grille de la carte." }, { status: 400 });
    }

    const shippingAddress: GelatoShippingAddress = {
      firstName: address.firstName,
      lastName: address.lastName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      postCode: address.postCode,
      state: address.state,
      country: address.country,
      email: address.email,
      phone: address.phone,
    };

    // Gelato requires GELATO_API_KEY. If it's absent (local dev), record the
    // intent without hitting Gelato so the flow still completes end-to-end.
    if (!process.env.GELATO_API_KEY) {
      await db
        .update(postcards)
        .set({ status: "order_pending", updatedAt: new Date() })
        .where(eq(postcards.id, authResult.card.id));
      console.warn(`[postcards] order for ${code} recorded without Gelato (no GELATO_API_KEY).`);
      return NextResponse.json({ ok: true, gelato: "unconfigured", delivery });
    }

    const order = await createOrder(
      {
        orderReferenceId: `carte-${code}-${Date.now()}`,
        customerReferenceId: authResult.card.ownerId ?? `anon-${code}`,
        currency: "EUR",
        items: [
          {
            itemReferenceId: `${code}-card`,
            productUid: GELATO_POSTCARD_PRODUCT_UID,
            fileUrl: postcardSourceUrl(code, delivery),
            quantity,
          },
        ],
        shippingAddress,
      },
      // Always a draft until checkout/payment exists — never charge here.
      "draft",
    );

    await db
      .update(postcards)
      .set({ status: "order_pending", updatedAt: new Date() })
      .where(eq(postcards.id, authResult.card.id));

    return NextResponse.json({ ok: true, gelato: "draft", orderId: order.id, delivery });
  } catch (error) {
    console.error("Postcard order error:", error);
    return NextResponse.json({ error: "La commande a échoué. Réessayez." }, { status: 502 });
  }
}
