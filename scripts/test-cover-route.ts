/**
 * Attach an uploaded photoRef to a real book's cover config so the
 * /api/books/[code]/cover.pdf route can be tested end to end.
 *   TEST_PHOTO_REF=local:... pnpm tsx scripts/test-cover-route.ts
 */

import { db } from "@/db";
import { books } from "@/db/schema/books";
import { eq } from "drizzle-orm";

async function main() {
  const photoRef = process.env.TEST_PHOTO_REF;
  if (!photoRef) throw new Error("TEST_PHOTO_REF env var required");

  const [book] = await db.select({ id: books.id, code: books.code, title: books.title }).from(books).limit(1);
  if (!book) {
    console.log("NO_BOOK");
    return;
  }

  const coverConfig = { coverTemplate: "solid-color-a5", coverColor: "bleu", design: { photoRef } };
  await db.update(books).set({ coverConfig, updatedAt: new Date() }).where(eq(books.id, book.id));
  console.log(`CODE=${book.code}`);
  console.log(`TITLE=${book.title}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
