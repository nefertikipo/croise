import "server-only";
import {
  createPrintJob,
  type LuluShippingAddress,
  type LuluShippingLevel,
} from "@/lib/lulu/client";
import { bookSourceUrls, LULU_POD_PACKAGE_ID } from "@/lib/lulu/product";

/** The interior route reports its exact final page count in a response header.
 * Probe the SAME url Lulu will fetch: pagination depends on the trim, so a
 * count taken at another size can disagree with the printed file. */
async function fetchInteriorPageCount(interiorUrl: string): Promise<number> {
  const res = await fetch(interiorUrl);
  if (!res.ok) {
    throw new Error(`Interior PDF unreachable (${res.status}): ${interiorUrl}`);
  }
  const pages = res.headers.get("x-interior-pages");
  if (!pages) throw new Error("Missing X-Interior-Pages header on the interior route.");
  return Number(pages);
}

/**
 * Submit a paid carnet to Lulu for printing.
 *
 * Whether this is a real (produced) job or a harmless sandbox test is governed
 * entirely by LULU_ENV inside the Lulu client — this helper just submits. So a
 * paid order in Stripe test mode, or in prod before LULU_ENV=production is set,
 * lands as a sandbox job that is never actually printed. To truly go live you
 * need BOTH live Stripe keys AND LULU_ENV=production.
 *
 * Note: Lulu fetches the interior/cover PDFs from LULU_SOURCE_BASE (the public
 * site), so the book must be reachable at that URL — real fulfillment only works
 * once the book is deployed, not from localhost.
 */
export async function fulfillCarnetOrder(input: {
  code: string;
  title: string;
  email: string;
  shipping: LuluShippingAddress;
  shippingLevel?: LuluShippingLevel;
}): Promise<{ luluJobId: number }> {
  const { interiorUrl, coverUrl } = bookSourceUrls(input.code);
  const pageCount = await fetchInteriorPageCount(interiorUrl);
  const job = await createPrintJob({
    externalId: input.code,
    contactEmail: input.email,
    shippingLevel: input.shippingLevel ?? "MAIL",
    shippingAddress: input.shipping,
    lineItems: [
      {
        title: `Les flèches — ${input.title}`,
        podPackageId: LULU_POD_PACKAGE_ID,
        pageCount,
        quantity: 1,
        interiorUrl,
        coverUrl,
      },
    ],
  });
  return { luluJobId: job.id };
}
