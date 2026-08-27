/**
 * One-off: price the current A5 saddle-stitch SKU against B5-ish trims.
 * Quote-only (calculatePrintJobCost) — never creates a print job.
 *
 *   pnpm tsx --env-file=.env.local scripts/lulu-size-compare.ts [pageCount] [qty]
 */
import { calculatePrintJobCost, luluBaseUrl } from "@/lib/lulu/client";

const SKUS: { label: string; id: string; trimMm: string }[] = [
  { label: "A5 (current)", id: "0583X0827.FC.PRE.SS.060UW444.GXX", trimMm: "148×210" },
  { label: "Royal", id: "0614X0921.FC.PRE.SS.060UW444.GXX", trimMm: "156×234" },
  { label: "Executive", id: "0700X1000.FC.PRE.SS.060UW444.GXX", trimMm: "178×254" },
  { label: "Crown Quarto", id: "0744X0968.FC.PRE.SS.060UW444.GXX", trimMm: "189×246" },
];

const pageCount = Number(process.argv[2] ?? "24");
const quantity = Number(process.argv[3] ?? "1");

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
  console.log(
    `Lulu API: ${luluBaseUrl()} · ${pageCount}p × ${quantity} · ship FR MAIL\n`,
  );
  for (const sku of SKUS) {
    process.stdout.write(`${sku.label.padEnd(16)} ${sku.trimMm.padEnd(9)} `);
    try {
      const q = (await calculatePrintJobCost({
        lineItems: [{ podPackageId: sku.id, pageCount, quantity }],
        shippingAddress: address,
        shippingOption: "MAIL",
      })) as {
        line_item_costs?: { total_cost_excl_tax?: string }[];
        shipping_cost?: { total_cost_excl_tax?: string };
        total_tax?: string;
        total_cost_incl_tax?: string;
        currency?: string;
      };
      const unit = q.line_item_costs?.[0]?.total_cost_excl_tax ?? "?";
      const ship = q.shipping_cost?.total_cost_excl_tax ?? "?";
      const tax = q.total_tax ?? "?";
      const total = q.total_cost_incl_tax ?? "?";
      const cur = q.currency ?? "";
      console.log(
        `print ${unit}  ship ${ship}  tax ${tax}  → total ${total} ${cur}`,
      );
    } catch (e) {
      console.log(`✗ ${(e as Error).message.split("\n")[0]}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
