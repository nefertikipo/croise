/**
 * Seed a filled photo page into a book so the browser flow can be checked.
 *   source .env.local; pnpm tsx scripts/test-photo-page.ts
 */

import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { ingestPhoto } from "@/lib/book-pdf/photo-ingest";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";

async function samplePhoto(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c7a7b"/><stop offset="1" stop-color="#c0392b"/></linearGradient></defs>
    <rect width="2400" height="3000" fill="url(#g)"/>
    <circle cx="1200" cy="1200" r="600" fill="#f2ece0" opacity="0.85"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const [book] = await db.select({ id: books.id, code: books.code }).from(books).limit(1);
  if (!book) throw new Error("no book");

  const layoutId = "hero";
  const photoCount = getPhotoLayout(layoutId).slots.filter((s) => s.kind !== "graphic").length;
  const { photoRef, preview } = await ingestPhoto(await samplePhoto());
  const photos = Array.from({ length: photoCount }, () => ({ photoRef, imageUrl: preview }));
  const config = { layout: "photo", photoLayout: layoutId, photos };

  const existing = await db.select({ position: bookPages.position }).from(bookPages).where(eq(bookPages.bookId, book.id));
  const position = existing.length ? Math.max(...existing.map((p) => p.position)) + 1 : 0;
  const [page] = await db
    .insert(bookPages)
    .values({ bookId: book.id, position, kind: "content", config })
    .returning({ id: bookPages.id });

  console.log(`CODE=${book.code}`);
  console.log(`PAGEID=${page.id}`);
  console.log(`layout=${layoutId}, ${photoCount} photos filled`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
