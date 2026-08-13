/**
 * Stamp a grid into the "Les Fléchés Originales" collection.
 *   set -a; source .env.local; set +a
 *   CODE=XWRD-TJCJEPAD pnpm tsx scripts/mark-originale.ts
 */
import "dotenv/config";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { eq } from "drizzle-orm";
import { ORIGINALES_THEME } from "@/lib/originales/constants";

const CODE = process.env.CODE || "XWRD-TJCJEPAD";

async function main() {
  const res = await db
    .update(crosswords)
    .set({ theme: ORIGINALES_THEME, status: "ready" })
    .where(eq(crosswords.code, CODE))
    .returning({ code: crosswords.code, title: crosswords.title, theme: crosswords.theme });
  if (res.length === 0) throw new Error(`No crossword with code ${CODE}`);
  console.log(`Marked ${res[0].code} (${res[0].title}) → theme='${res[0].theme}'`);
}

main().catch((e) => { console.error(e); process.exit(1); });
