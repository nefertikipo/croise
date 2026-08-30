/**
 * One-off: list Lulu shipping options to mainland France for our saddle SKU.
 *   pnpm tsx --env-file=.env.local scripts/lulu-shipping.ts [pageCount] [qty]
 */
import { luluBaseUrl } from "@/lib/lulu/client";

const pageCount = Number(process.argv[2] ?? "32");
const quantity = Number(process.argv[3] ?? "1");
const SKU = "0744X0968.FC.PRE.SS.060UW444.GXX"; // Crown Quarto

async function token(): Promise<string> {
  const key = process.env.LULU_CLIENT_KEY!;
  const secret = process.env.LULU_CLIENT_SECRET!;
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
  return ((await res.json()) as { access_token: string }).access_token;
}

async function main() {
  const t = await token();
  const res = await fetch(`${luluBaseUrl()}/shipping-options/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({
      currency: "EUR",
      line_items: [{ pod_package_id: SKU, quantity, page_count: pageCount }],
      shipping_address: { country: "FR", state_code: "", city: "Paris", postcode: "75001" },
    }),
  });
  const data = (await res.json()) as {
    results?: {
      level: string;
      cost_excl_tax: string;
      total_days_min?: number;
      total_days_max?: number;
      traceable?: boolean;
    }[];
  };
  console.log(`Crown Quarto ${pageCount}p × ${quantity} → mainland FR (EUR)\n`);
  for (const o of data.results ?? []) {
    console.log(
      `${o.level.padEnd(14)} €${o.cost_excl_tax.padStart(6)}  ` +
        `${o.total_days_min ?? "?"}–${o.total_days_max ?? "?"} business days` +
        `${o.traceable ? "  (tracked)" : ""}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
