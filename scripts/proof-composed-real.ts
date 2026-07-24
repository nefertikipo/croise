/** Render composed templates with REAL photos (not gray boxes) to judge the
 * actual look. pnpm tsx scripts/proof-composed-real.ts */

import { writeFile } from "node:fs/promises";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { composePhotoPage, type PhotoFill } from "@/lib/book-pdf/compose-photo-page";

const SEED = process.env.SEED ?? "croise";

async function dl(seed: number): Promise<Buffer> {
  const res = await fetch(`https://picsum.photos/seed/${SEED}${seed}/900/900`);
  if (!res.ok) throw new Error(`fetch ${seed}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function render(id: string) {
  const layout = getPhotoLayout(id);
  const n = layout.slots.filter((s) => s.kind !== "graphic").length;
  const photos: PhotoFill[] = [];
  for (let i = 0; i < n; i++) photos.push({ photo: await dl(i + 1) });
  const pdf = await composePhotoPage(layout, { photos });
  await writeFile(`.context/real-${id}.pdf`, Buffer.from(pdf));
  console.log(`✓ ${id} (${n} real photos)`);
}

async function main() {
  for (const id of ["hermes"]) await render(id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
