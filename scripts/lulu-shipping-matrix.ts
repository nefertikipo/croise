/**
 * One-off: quote the real Lulu cost (print + shipping) for the carnet SKU
 * across every country we sell to, at MAIL and EXPRESS, thin and thick books.
 * Used to sanity-check the flat €30 price and tune the express surcharge.
 *   LULU_ENV=production LULU_CLIENT_KEY=… LULU_CLIENT_SECRET=… \
 *     pnpm tsx scripts/lulu-shipping-matrix.ts
 */
import { calculatePrintJobCost, luluBaseUrl, type LuluShippingLevel } from "@/lib/lulu/client";
import { LULU_POD_PACKAGE_ID } from "@/lib/lulu/product";
import { CARNET_ALLOWED_COUNTRIES } from "@/lib/books/shipping";

const PAGE_COUNTS = [28, 48];
const LEVELS: LuluShippingLevel[] = ["MAIL", "EXPRESS"];

/** A plausible big-city address per country (Lulu needs a full address to quote). */
const ADDRESSES: Record<string, { street1: string; city: string; postcode: string; state_code?: string }> = {
  FR: { street1: "1 rue de Rivoli", city: "Paris", postcode: "75001" },
  BE: { street1: "Rue de la Loi 16", city: "Bruxelles", postcode: "1000" },
  CH: { street1: "Bahnhofstrasse 1", city: "Zürich", postcode: "8001" },
  LU: { street1: "1 Rue du Fossé", city: "Luxembourg", postcode: "1536" },
  MC: { street1: "1 Avenue de la Costa", city: "Monaco", postcode: "98000" },
  DE: { street1: "Unter den Linden 1", city: "Berlin", postcode: "10117" },
  ES: { street1: "Gran Vía 1", city: "Madrid", postcode: "28013" },
  IT: { street1: "Via del Corso 1", city: "Roma", postcode: "00186" },
  NL: { street1: "Dam 1", city: "Amsterdam", postcode: "1012 JS" },
  PT: { street1: "Praça do Comércio 1", city: "Lisboa", postcode: "1100-148" },
  IE: { street1: "1 O'Connell Street", city: "Dublin", postcode: "D01 F5P2" },
  AT: { street1: "Stephansplatz 1", city: "Wien", postcode: "1010" },
  GB: { street1: "1 Regent Street", city: "London", postcode: "SW1Y 4NR" },
};

interface Quote {
  line_item_costs?: { total_cost_excl_tax?: string }[];
  shipping_cost?: { total_cost_excl_tax?: string; total_cost_incl_tax?: string };
  total_cost_incl_tax?: string;
}

async function main() {
  console.log(`Lulu ${luluBaseUrl()} · SKU ${LULU_POD_PACKAGE_ID}\n`);
  console.log("country  pages  level    print   ship    TOTAL");
  for (const country of CARNET_ALLOWED_COUNTRIES) {
    const addr = ADDRESSES[country];
    if (!addr) continue;
    for (const pageCount of PAGE_COUNTS) {
      for (const level of LEVELS) {
        const label = `${country.padEnd(8)}${String(pageCount).padEnd(7)}${level.padEnd(8)}`;
        try {
          const q = (await calculatePrintJobCost({
            lineItems: [{ podPackageId: LULU_POD_PACKAGE_ID, pageCount, quantity: 1 }],
            shippingAddress: {
              name: "Test Devis",
              ...addr,
              country_code: country,
              phone_number: "+33600000000",
              email: "devis@lesfleches.com",
            },
            shippingOption: level,
          })) as Quote;
          const print = q.line_item_costs?.[0]?.total_cost_excl_tax ?? "?";
          const ship = q.shipping_cost?.total_cost_incl_tax ?? q.shipping_cost?.total_cost_excl_tax ?? "?";
          console.log(`${label} €${print}\t€${ship}\t€${q.total_cost_incl_tax ?? "?"}`);
        } catch (e) {
          const msg = (e as Error).message.split("\n")[0];
          console.log(`${label} ✗ ${msg.slice(0, 90)}`);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
