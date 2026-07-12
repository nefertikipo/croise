# Monetization & fulfillment plan (SET UP LATER)

Decision notes for how Les Flèches takes payment and ships the physical/digital book.
Nothing here is built yet — this is the agreed direction to implement when we're ready.

## Decision: Stripe direct, NOT Shopify

The flagship is a **personalized, generated-per-order book** (custom grids, personalized
clues, a hidden message one-word-per-grid across the book). Every order produces a unique
PDF.

Shopify is built for **catalog SKUs** (fixed product + variants). Making it generate a
unique artifact per order means fighting the platform (line-item properties, draft orders,
custom app to attach the file). We already own the hard part — a Next.js app that generates
the product — so the clean architecture is:

**Stripe Checkout (in our Next.js app) → generate PDF → hand to a print API → ship.**

Stripe gives us payment, EU VAT (Stripe Tax), receipts, refunds, and discount codes. Full
control of personalization, better margins, no monthly Shopify fee or app-store duct tape.

**Revisit Shopify only if** we pivot to a few standardized SKUs (e.g. a fixed
"Saint-Valentin" / "anniversaire" book) with light personalization and want the
off-the-shelf storefront/marketing machinery.

## Print: Lulu vs Gelato

Product is a **book**, audience is **France-first**. That splits the call:

| | Lulu | Gelato |
|---|---|---|
| Book quality/binding | Purpose-built for books, real binding, flexible page counts | Books are one of many products; more photobook-ish, less book-native |
| API for per-order books | **Lulu Print API** designed for programmatic unique-per-order books | Has an API, sweet spot is standard products |
| EU/France shipping | Fewer hubs → longer/pricier to France | **Local EU production** → faster, cheaper, fewer customs headaches |
| Ecosystem | Lulu Direct (Shopify app) | Strong Shopify app, broad range |

**Call:** prototype fulfillment on **Lulu's Print API** (built for "unique book PDF per
order, print + drop-ship"). Book fidelity matters for a giftable product. **But price out
Gelato's book SKUs for France specifically** — Gelato's local EU production can beat Lulu on
shipping cost and delivery time, which matters for a last-minute gift.

## Discount codes (Stripe native — no third-party app needed)

- **Coupons** = the discount rule (% or fixed, one-time/recurring, expiry, max redemptions,
  product/currency restrictions).
- **Promotion codes** = the customer-facing code (`NOEL20`) mapping to a coupon. Per-code
  usage caps, first-time-customer-only, minimum order amount, active/inactive toggle.
- In Checkout: set `allow_promotion_codes: true` → Stripe shows the field, validates,
  applies. Or pre-apply via the `discounts` param (e.g. affiliate links that bake in a code).
- Watch: **one promo code per session** (no stacking OOTB); a 100% discount → €0 total, so
  trigger fulfillment off the `checkout.session.completed` webhook, not a payment event;
  decide whether codes discount shipping (coupon restrictions control this).

## Build order (when we start)

1. **PDF export first** — blocker for everything; nothing monetizes until the artifact
   exists. (Already the next TODO.)
2. **Sell the digital PDF** as the entry product — instant delivery, ~100% margin, zero
   fulfillment risk. Validates willingness-to-pay before we touch printing. Stripe Checkout
   + emailed download link.
3. **Add "get it printed & shipped" as an upsell** via Lulu (or Gelato) Print API. Charge
   print + ship + margin on top of the digital price.
4. Revisit Shopify only if we move to a standardized-catalog model.

Sequencing lets us charge money in weeks (digital) instead of after solving print logistics.

## Open question

Is physical the hero product, or is digital-PDF acceptable as the main thing? That answer
changes how much print-fulfillment complexity is worth taking on up front.
