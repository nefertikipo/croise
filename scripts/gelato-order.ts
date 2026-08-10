/**
 * Concierge tool for Gelato postcard orders — the manual half of the flow.
 * Creates DRAFTS unless GELATO_ENV=production is set (drafts are never produced).
 *
 * Usage (env from .env.local):
 *
 *   # Per-unit product price for France in EUR
 *   pnpm tsx --env-file=.env.local scripts/gelato-order.ts prices
 *
 *   # Create an order for a card, shipped to an address
 *   pnpm tsx --env-file=.env.local scripts/gelato-order.ts order CARD-CODE \
 *     --firstName Louise --lastName Texier --street1 "1 rue de Rivoli" \
 *     --city Paris --postcode 75001 --country FR --email louise@hexa.com \
 *     --phone "+33600000000" --quantity 1
 */
import {
  createOrder,
  getProductPrices,
  gelatoOrderType,
  type GelatoShippingAddress,
} from "../src/lib/gelato/client";
import {
  GELATO_POSTCARD_PRODUCT_UID,
  GELATO_POSTER_PRODUCT_UID,
  GELATO_CALENDAR_PRODUCT_UID,
  framedPosterProductUid,
  postcardSourceUrl,
  posterSourceUrl,
  calendarSourceUrl,
  type PosterFrameColor,
} from "../src/lib/gelato/product";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function address(): GelatoShippingAddress {
  return {
    firstName: arg("firstName", "Louise")!,
    lastName: arg("lastName", "Texier")!,
    addressLine1: arg("street1", "1 rue de Rivoli")!,
    addressLine2: arg("street2"),
    city: arg("city", "Paris")!,
    postCode: arg("postcode", "75001")!,
    state: arg("state"),
    country: arg("country", "FR")!,
    email: arg("email", "louise@hexa.com")!,
    phone: arg("phone", "+33600000000"),
  };
}

async function main() {
  const [, , command, code] = process.argv;

  // Product selector: --product card|poster|calendar (+ --frame black|white|natural|dark for posters).
  const product = arg("product", "card");
  const frame = arg("frame") as PosterFrameColor | undefined;
  const productUid =
    product === "poster"
      ? frame
        ? framedPosterProductUid(frame)
        : GELATO_POSTER_PRODUCT_UID
      : product === "calendar"
        ? GELATO_CALENDAR_PRODUCT_UID
        : GELATO_POSTCARD_PRODUCT_UID;
  const fileUrlFor =
    product === "poster" ? posterSourceUrl : product === "calendar" ? calendarSourceUrl : postcardSourceUrl;

  console.log(`Gelato order type: ${gelatoOrderType()}  ·  product: ${productUid}`);

  if (command === "prices") {
    const prices = await getProductPrices(productUid, {
      country: arg("country", "FR"),
      currency: arg("currency", "EUR"),
    });
    console.log(JSON.stringify(prices, null, 2));
    return;
  }

  if (command === "order") {
    if (!code) {
      console.error("Usage: gelato-order.ts order CODE [--product card|poster|calendar] [--options]");
      process.exit(1);
    }
    const order = await createOrder({
      orderReferenceId: code,
      currency: arg("currency", "EUR")!,
      items: [
        {
          itemReferenceId: code,
          productUid,
          fileUrl: fileUrlFor(code),
          quantity: Number(arg("quantity", "1")),
        },
      ],
      shippingAddress: address(),
    });
    console.log("Order created:", JSON.stringify(order, null, 2));
    return;
  }

  console.log("Usage: gelato-order.ts <prices|order> [CODE] [--product card|poster|calendar] [--options]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
