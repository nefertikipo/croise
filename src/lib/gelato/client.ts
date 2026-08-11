/**
 * Minimal Gelato API client (server-side only) for the postcard product.
 *
 * Auth is a single API key sent as the `X-API-KEY` header (get it from the
 * Gelato dashboard → API Keys). Unlike Lulu there is no separate sandbox host:
 * a "test" order is a real POST with `orderType: "draft"` — drafts are never
 * produced or charged. We send `orderType: "order"` only when GELATO_ENV is
 * "production"; otherwise every order is a draft.
 *
 * Docs: https://dashboard.gelato.com/docs/ (order v4, product v3).
 * Env:
 * - GELATO_API_KEY — required.
 * - GELATO_ENV — "production" to place real (produced) orders; anything else
 *   (or unset) creates drafts.
 */

const ORDER_BASE = "https://order.gelatoapis.com";
const PRODUCT_BASE = "https://product.gelatoapis.com";

function apiKey(): string {
  const key = process.env.GELATO_API_KEY;
  if (!key) {
    throw new Error(
      "GELATO_API_KEY manquant. Créez une clé sur dashboard.gelato.com → API Keys.",
    );
  }
  return key;
}

/** Draft unless explicitly in production, so nothing is produced by accident. */
export function gelatoOrderType(): "order" | "draft" {
  return process.env.GELATO_ENV === "production" ? "order" : "draft";
}

async function gelatoFetch<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey(),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gelato ${init?.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// --- Types (per the public API docs) ----------------------------------------

export interface GelatoShippingAddress {
  firstName: string;
  lastName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postCode: string;
  state?: string;
  country: string; // ISO 3166-1 alpha-2, e.g. "FR"
  email: string;
  phone?: string;
}

export interface GelatoLineItemInput {
  itemReferenceId: string;
  productUid: string;
  /** Print files by area; a single multi-page card PDF is sent as "default". */
  fileUrl: string;
  quantity: number;
}

export interface GelatoOrderInput {
  orderReferenceId: string;
  customerReferenceId?: string;
  currency: string; // e.g. "EUR"
  items: GelatoLineItemInput[];
  shippingAddress: GelatoShippingAddress;
}

// --- API calls --------------------------------------------------------------

/**
 * Create an order. Defaults to draft unless GELATO_ENV=production; callers that
 * have not yet collected payment MUST pass `orderType: "draft"` explicitly so a
 * production env can never charge/produce a card before checkout exists.
 */
export function createOrder(
  input: GelatoOrderInput,
  orderType: "order" | "draft" = gelatoOrderType(),
): Promise<{ id: string; orderReferenceId: string; fulfillmentStatus?: string }> {
  return gelatoFetch(ORDER_BASE, "/v4/orders", {
    method: "POST",
    body: JSON.stringify({
      orderType,
      orderReferenceId: input.orderReferenceId,
      customerReferenceId: input.customerReferenceId ?? input.orderReferenceId,
      currency: input.currency,
      items: input.items.map((it) => ({
        itemReferenceId: it.itemReferenceId,
        productUid: it.productUid,
        files: [{ type: "default", url: it.fileUrl }],
        quantity: it.quantity,
      })),
      shippingAddress: input.shippingAddress,
    }),
  });
}

export function getOrder(orderId: string): Promise<unknown> {
  return gelatoFetch(ORDER_BASE, `/v4/orders/${orderId}`);
}

/** Product price rows (per-unit) for a product UID, filtered by market. */
export function getProductPrices(
  productUid: string,
  opts: { country?: string; currency?: string; pageCount?: number } = {},
): Promise<unknown> {
  const q = new URLSearchParams();
  if (opts.country) q.set("country", opts.country);
  if (opts.currency) q.set("currency", opts.currency);
  if (opts.pageCount) q.set("pageCount", String(opts.pageCount));
  const qs = q.toString();
  return gelatoFetch(PRODUCT_BASE, `/v3/products/${productUid}/prices${qs ? `?${qs}` : ""}`);
}
