/**
 * Minimal Lulu Print API client (server-side only).
 *
 * Auth is OAuth2 client-credentials (OpenID Connect): POST the client key +
 * secret as HTTP Basic to the token endpoint, then Bearer the access_token.
 * Docs: https://api.lulu.com/docs/ — OpenAPI: /api-docs/openapi-specs/openapi_public.yml
 *
 * Env:
 * - LULU_CLIENT_KEY / LULU_CLIENT_SECRET — from the API Keys page
 *   (production: developers.lulu.com, sandbox: developers.sandbox.lulu.com —
 *   separate accounts, separate keys).
 * - LULU_ENV — "production" to hit the live API; anything else (or unset)
 *   uses the sandbox. Sandbox print jobs are never actually printed.
 */

const SANDBOX_BASE = "https://api.sandbox.lulu.com";
const PRODUCTION_BASE = "https://api.lulu.com";

export function luluBaseUrl(): string {
  return process.env.LULU_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const key = process.env.LULU_CLIENT_KEY;
  const secret = process.env.LULU_CLIENT_SECRET;
  if (!key || !secret) {
    throw new Error(
      "LULU_CLIENT_KEY / LULU_CLIENT_SECRET manquants. Créez des clés sur developers.sandbox.lulu.com (ou developers.lulu.com en production).",
    );
  }
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `${luluBaseUrl()}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    },
  );
  if (!res.ok) {
    throw new Error(`Lulu auth failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function luluFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${luluBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Lulu ${init?.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as T;
}

// --- Types (fields per the public OpenAPI spec) ------------------------------

export interface LuluShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  postcode: string;
  country_code: string; // ISO 3166-2, e.g. "FR"
  state_code?: string;
  phone_number: string; // required by Lulu
  email?: string;
}

/** Lulu shipping quality levels, slowest/cheapest first. */
export type LuluShippingLevel =
  | "MAIL"
  | "PRIORITY_MAIL"
  | "GROUND_HD"
  | "GROUND_BUS"
  | "GROUND"
  | "EXPEDITED"
  | "EXPRESS";

export interface LuluLineItemInput {
  title: string;
  podPackageId: string;
  pageCount: number;
  quantity: number;
  coverUrl: string; // publicly reachable PDF url
  interiorUrl: string; // publicly reachable PDF url
  externalId?: string;
}

// --- API calls ---------------------------------------------------------------

/** Product + shipping + tax quote without creating a print job. */
export function calculatePrintJobCost(input: {
  lineItems: { podPackageId: string; pageCount: number; quantity: number }[];
  shippingAddress: LuluShippingAddress;
  shippingOption: LuluShippingLevel;
}): Promise<unknown> {
  return luluFetch("/print-job-cost-calculations/", {
    method: "POST",
    body: JSON.stringify({
      line_items: input.lineItems.map((li) => ({
        pod_package_id: li.podPackageId,
        page_count: li.pageCount,
        quantity: li.quantity,
      })),
      shipping_address: input.shippingAddress,
      shipping_option: input.shippingOption,
    }),
  });
}

/** Exact cover-spread dimensions Lulu expects for a SKU + page count. */
export function coverDimensions(input: {
  podPackageId: string;
  interiorPageCount: number;
  unit?: "pt" | "mm" | "inch";
}): Promise<{ width: string; height: string; unit: string }> {
  return luluFetch("/cover-dimensions/", {
    method: "POST",
    body: JSON.stringify({
      pod_package_id: input.podPackageId,
      interior_page_count: input.interiorPageCount,
      unit: input.unit ?? "mm",
    }),
  });
}

/** Server-side preflight of an interior PDF (async on Lulu's side). */
export function validateInterior(input: {
  sourceUrl: string;
  podPackageId?: string;
}): Promise<{ id: number; status: string }> {
  return luluFetch("/validate-interior/", {
    method: "POST",
    body: JSON.stringify({
      source_url: input.sourceUrl,
      ...(input.podPackageId ? { pod_package_id: input.podPackageId } : {}),
    }),
  });
}

export function getInteriorValidation(id: number): Promise<{ id: number; status: string; errors?: unknown }> {
  return luluFetch(`/validate-interior/${id}/`);
}

/** Create a real print job (on sandbox: test-only, never printed). */
export function createPrintJob(input: {
  externalId: string;
  contactEmail: string;
  shippingLevel: LuluShippingLevel;
  shippingAddress: LuluShippingAddress;
  lineItems: LuluLineItemInput[];
}): Promise<{ id: number; status: unknown }> {
  return luluFetch("/print-jobs/", {
    method: "POST",
    body: JSON.stringify({
      external_id: input.externalId,
      contact_email: input.contactEmail,
      shipping_level: input.shippingLevel,
      shipping_address: input.shippingAddress,
      line_items: input.lineItems.map((li) => ({
        title: li.title,
        pod_package_id: li.podPackageId,
        page_count: li.pageCount,
        quantity: li.quantity,
        cover: { source_url: li.coverUrl },
        interior: { source_url: li.interiorUrl },
        ...(li.externalId ? { external_id: li.externalId } : {}),
      })),
    }),
  });
}

export function getPrintJob(id: number): Promise<unknown> {
  return luluFetch(`/print-jobs/${id}/`);
}

export function getPrintJobStatus(id: number): Promise<unknown> {
  return luluFetch(`/print-jobs/${id}/status/`);
}
