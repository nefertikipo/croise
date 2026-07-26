/**
 * Concierge tool for Lulu print jobs — the manual half of the order flow.
 * Runs against the SANDBOX unless LULU_ENV=production is set.
 *
 * Usage (env from .env.local: pnpm tsx --env-file=.env.local ...):
 *
 *   # Exact cover dimensions Lulu expects for a book's page count
 *   pnpm tsx --env-file=.env.local scripts/lulu-order.ts dims BOOK-CODE
 *
 *   # Price a book shipped to France (unit cost + shipping + tax)
 *   pnpm tsx --env-file=.env.local scripts/lulu-order.ts cost BOOK-CODE
 *
 *   # Ask Lulu to preflight the interior PDF (file must be publicly reachable)
 *   pnpm tsx --env-file=.env.local scripts/lulu-order.ts validate BOOK-CODE
 *
 *   # Create a print job (sandbox by default; add --level MAIL etc.)
 *   pnpm tsx --env-file=.env.local scripts/lulu-order.ts order BOOK-CODE \
 *     --name "Louise Texier" --street1 "1 rue de..." --city Paris \
 *     --postcode 75001 --phone "+33600000000" --email louise@hexa.com
 */
import {
  calculatePrintJobCost,
  coverDimensions,
  createPrintJob,
  getInteriorValidation,
  luluBaseUrl,
  validateInterior,
  type LuluShippingAddress,
  type LuluShippingLevel,
} from "../src/lib/lulu/client";
import { bookSourceUrls, LULU_POD_PACKAGE_ID } from "../src/lib/lulu/product";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** The interior route reports its exact final page count in a header. */
async function fetchPageCount(interiorUrl: string): Promise<number> {
  const res = await fetch(interiorUrl);
  if (!res.ok) throw new Error(`Interior PDF unreachable (${res.status}): ${interiorUrl}`);
  const pages = res.headers.get("x-interior-pages");
  if (!pages) throw new Error("Missing X-Interior-Pages header on the interior route.");
  return Number(pages);
}

function testAddress(): LuluShippingAddress {
  return {
    name: arg("name", "Louise Texier")!,
    street1: arg("street1", "1 rue de Rivoli")!,
    city: arg("city", "Paris")!,
    postcode: arg("postcode", "75001")!,
    country_code: arg("country", "FR")!,
    phone_number: arg("phone", "+33600000000")!,
    email: arg("email", "louise@hexa.com"),
  };
}

async function main() {
  const [, , command, code] = process.argv;
  if (!command || !code) {
    console.log("Usage: lulu-order.ts <dims|cost|validate|order> BOOK-CODE [--options]");
    process.exit(1);
  }
  console.log(`Lulu API: ${luluBaseUrl()}  ·  SKU: ${LULU_POD_PACKAGE_ID}`);
  const { interiorUrl, coverUrl } = bookSourceUrls(code);
  // --pages overrides the header lookup (e.g. before the header ships to prod).
  const pagesArg = arg("pages");
  const pageCount = pagesArg ? Number(pagesArg) : await fetchPageCount(interiorUrl);
  console.log(`Book ${code}: ${pageCount} interior pages`);

  if (command === "dims") {
    const dims = await coverDimensions({
      podPackageId: LULU_POD_PACKAGE_ID,
      interiorPageCount: pageCount,
      unit: "mm",
    });
    console.log("Lulu expects the cover spread at:", dims);
    return;
  }

  if (command === "cost") {
    const quote = await calculatePrintJobCost({
      lineItems: [
        { podPackageId: LULU_POD_PACKAGE_ID, pageCount, quantity: Number(arg("quantity", "1")) },
      ],
      shippingAddress: testAddress(),
      shippingOption: (arg("level", "MAIL") as LuluShippingLevel) ?? "MAIL",
    });
    console.log(JSON.stringify(quote, null, 2));
    return;
  }

  if (command === "validate") {
    const v = await validateInterior({ sourceUrl: interiorUrl, podPackageId: LULU_POD_PACKAGE_ID });
    console.log("Validation started:", v);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const status = await getInteriorValidation(v.id);
      console.log(`  → ${status.status}`);
      if (status.status !== "VALIDATING" && status.status !== "NULL") {
        console.log(JSON.stringify(status, null, 2));
        break;
      }
    }
    return;
  }

  if (command === "order") {
    const job = await createPrintJob({
      externalId: code,
      contactEmail: arg("email", "louise@hexa.com")!,
      shippingLevel: (arg("level", "MAIL") as LuluShippingLevel) ?? "MAIL",
      shippingAddress: testAddress(),
      lineItems: [
        {
          title: arg("title", `Les flèches — ${code}`)!,
          podPackageId: LULU_POD_PACKAGE_ID,
          pageCount,
          quantity: Number(arg("quantity", "1")),
          interiorUrl,
          coverUrl,
        },
      ],
    });
    console.log("Print job created:", JSON.stringify(job, null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
