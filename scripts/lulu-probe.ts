/**
 * One-off: probe whether specific Lulu SKUs exist + price them (quote-only).
 *   pnpm tsx --env-file=.env.local scripts/lulu-probe.ts [pageCount]
 */
import { calculatePrintJobCost, luluBaseUrl } from "@/lib/lulu/client";

const pageCount = Number(process.argv[2] ?? "32");

// [Trim].[Ink].[Quality].[Binding].[Paper].[Finish]
const CANDIDATES: { label: string; id: string }[] = [
  { label: "A5   colour PRE SS", id: "0583X0827.FC.PRE.SS.060UW444.GXX" },
  { label: "A5   B&W    STD SS", id: "0583X0827.BW.STD.SS.060UW444.GXX" },
  { label: "Crown colour PRE SS", id: "0744X0968.FC.PRE.SS.060UW444.GXX" },
  { label: "Crown B&W   STD SS", id: "0744X0968.BW.STD.SS.060UW444.GXX" },
  { label: "A4   colour PRE SS", id: "0827X1169.FC.PRE.SS.060UW444.GXX" },
  { label: "A4   B&W    STD SS", id: "0827X1169.BW.STD.SS.060UW444.GXX" },
  { label: "A4   B&W    PRE SS", id: "0827X1169.BW.PRE.SS.060UW444.GXX" },
  { label: "A4   colour PRE PB", id: "0827X1169.FC.PRE.PB.060UW444.GXX" },
  { label: "A4   B&W    STD PB", id: "0827X1169.BW.STD.PB.060UW444.GXX" },
];

const address = {
  name: "Louise Texier",
  street1: "1 rue de Rivoli",
  city: "Paris",
  postcode: "75001",
  country_code: "FR",
  phone_number: "+33600000000",
  email: "louise@hexa.com",
};

async function main() {
  console.log(`Lulu ${luluBaseUrl()} · ${pageCount}p × 1 · ship FR MAIL\n`);
  for (const c of CANDIDATES) {
    process.stdout.write(`${c.label.padEnd(20)} ${c.id.padEnd(34)} `);
    try {
      const q = (await calculatePrintJobCost({
        lineItems: [{ podPackageId: c.id, pageCount, quantity: 1 }],
        shippingAddress: address,
        shippingOption: "MAIL",
      })) as {
        line_item_costs?: { total_cost_excl_tax?: string }[];
        total_cost_incl_tax?: string;
      };
      const unit = q.line_item_costs?.[0]?.total_cost_excl_tax ?? "?";
      console.log(`✓ print €${unit}  total €${q.total_cost_incl_tax ?? "?"}`);
    } catch (e) {
      const msg = (e as Error).message;
      const short = msg.includes("400") ? "unavailable (400)" : msg.split("\n")[0];
      console.log(`✗ ${short}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
