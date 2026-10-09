import "server-only";
import {
  createPrintJob,
  type LuluShippingAddress,
  type LuluShippingLevel,
} from "@/lib/lulu/client";
import { bookSourceUrls, LULU_POD_PACKAGE_ID } from "@/lib/lulu/product";

interface PrintFiles {
  interiorUrl: string;
  coverUrl: string;
  pageCount: number;
}

async function fetchPdf(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Print PDF unreachable (${res.status}): ${url}`);
  return res;
}

/** The interior route reports its exact final page count in a response header.
 * Probe the SAME url Lulu would fetch: pagination depends on the trim, so a
 * count taken at another size can disagree with the printed file. */
function interiorPageCount(res: Response): number {
  const pages = res.headers.get("x-interior-pages");
  if (!pages) throw new Error("Missing X-Interior-Pages header on the interior route.");
  return Number(pages);
}

/**
 * Freeze an order's print files in Blob storage, once, at its first submission.
 *
 * The live book URLs keep following the book: a customer editing or deleting
 * it after paying, or a retry days later, would otherwise print something other
 * than what was paid for. Snapshots live under `carnet-orders/<orderId>/` with
 * a random suffix (public store, unguessable URLs); a retry finds and reuses
 * them, so it prints the paid-for version. The page count rides in the interior
 * file name because Lulu needs it with the job.
 *
 * Without a Blob token (local dev) the live URLs are used directly.
 */
async function resolvePrintFiles(orderId: string, code: string): Promise<PrintFiles> {
  const live = bookSourceUrls(code);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ...live, pageCount: interiorPageCount(await fetchPdf(live.interiorUrl)) };
  }

  const { list, put } = await import("@vercel/blob");
  const prefix = `carnet-orders/${orderId}/`;
  const { blobs } = await list({ prefix });
  const interior = blobs.find((b) => b.pathname.startsWith(`${prefix}interior-`));
  const cover = blobs.find((b) => b.pathname.startsWith(`${prefix}cover`));
  const frozenPages = interior?.pathname.match(/interior-(\d+)p/)?.[1];
  if (interior && cover && frozenPages) {
    return { interiorUrl: interior.url, coverUrl: cover.url, pageCount: Number(frozenPages) };
  }

  const [interiorRes, coverRes] = await Promise.all([
    fetchPdf(live.interiorUrl),
    fetchPdf(live.coverUrl),
  ]);
  const pageCount = interiorPageCount(interiorRes);
  const opts = { access: "public", contentType: "application/pdf", addRandomSuffix: true } as const;
  const [interiorBlob, coverBlob] = await Promise.all([
    put(`${prefix}interior-${pageCount}p.pdf`, Buffer.from(await interiorRes.arrayBuffer()), opts),
    put(`${prefix}cover.pdf`, Buffer.from(await coverRes.arrayBuffer()), opts),
  ]);
  return { interiorUrl: interiorBlob.url, coverUrl: coverBlob.url, pageCount };
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
 * Note: the first snapshot renders the PDFs from LULU_SOURCE_BASE (the public
 * site), so the book must be reachable at that URL — real fulfillment only
 * works once the book is deployed, not from localhost.
 */
export async function fulfillCarnetOrder(input: {
  orderId: string;
  code: string;
  title: string;
  email: string;
  shipping: LuluShippingAddress;
  shippingLevel?: LuluShippingLevel;
}): Promise<{ luluJobId: number }> {
  const { interiorUrl, coverUrl, pageCount } = await resolvePrintFiles(input.orderId, input.code);
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
