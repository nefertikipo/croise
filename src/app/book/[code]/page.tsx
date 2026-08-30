import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { loadBook } from "@/lib/books/serialize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import { BookEditor } from "@/components/book/book-editor";

export default async function BookPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const book = await loadBook(code);

  if (!book) notFound();

  const [row] = await db
    .select({ ownerId: books.ownerId })
    .from(books)
    .where(eq(books.code, code))
    .limit(1);
  const ownerId = row?.ownerId ?? null;

  const session = await auth.api.getSession({ headers: await headers() });

  // A book with an owner is only editable by that owner; anyone else who has
  // the link (via "Partager") gets a read-only view. Ownerless (anonymous)
  // books stay editable by whoever holds the link.
  const readOnly = ownerId !== null && session?.user?.id !== ownerId;
  // Deferred auth: anonymous + not signed in → nudge to save (moment 1).
  const showSigninNudge = ownerId === null && !session;
  // Anonymous + signed in → the editor auto-claims it (if this device made it).
  const claimable = ownerId === null && !!session;
  // Owned by the signed-in viewer → safe to open contributions (moment 2).
  const owned = ownerId !== null && session?.user?.id === ownerId;

  return (
    <BookEditor
      code={code}
      initialBook={book}
      initialInteriorPages={interiorPageCountForCapacity(book)}
      readOnly={readOnly}
      showSigninNudge={showSigninNudge}
      claimable={claimable}
      owned={owned}
    />
  );
}
