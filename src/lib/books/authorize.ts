import { db } from "@/db";
import { books } from "@/db/schema/books";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export type BookRecord = typeof books.$inferSelect;

export type BookAuthResult =
  | { ok: true; book: BookRecord }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Load a book by share code and decide whether this request may MUTATE it.
 *
 * Rule: an anonymous book (`ownerId === null`) is editable by anyone holding
 * the code — the code is its only credential. An owned book is editable only
 * by its owner's Better Auth session. GET routes stay public (share-by-code
 * viewing is intended); apply this to every mutating book route.
 */
export async function authorizeBookEdit(
  request: Request,
  code: string,
): Promise<BookAuthResult> {
  const [book] = await db.select().from(books).where(eq(books.code, code)).limit(1);
  if (!book) {
    return { ok: false, status: 404, error: "Carnet introuvable" };
  }
  if (book.ownerId === null) {
    return { ok: true, book };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { ok: false, status: 401, error: "Non authentifié" };
  }
  if (session.user.id !== book.ownerId) {
    return { ok: false, status: 403, error: "Accès refusé" };
  }
  return { ok: true, book };
}

/**
 * Statement bumping `books.updatedAt` — await it directly or include it in a
 * `db.batch`. Every mutation of a book's content must touch this timestamp:
 * the abandoned-book reminder cron keys on `updatedAt`, so a stale value
 * would email actively-editing users.
 */
export function touchBookStatement(bookId: string) {
  return db.update(books).set({ updatedAt: new Date() }).where(eq(books.id, bookId));
}
