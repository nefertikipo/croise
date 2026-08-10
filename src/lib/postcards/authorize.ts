import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export type PostcardRecord = typeof postcards.$inferSelect;

export type PostcardAuthResult =
  | { ok: true; card: PostcardRecord }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Load a postcard by share code and decide whether this request may MUTATE it.
 * Same rule as books: an anonymous card (`ownerId === null`) is editable by
 * anyone holding the code; an owned card only by its owner's session. GET stays
 * public (share-by-code viewing).
 */
export async function authorizePostcardEdit(
  request: Request,
  code: string,
): Promise<PostcardAuthResult> {
  const [card] = await db.select().from(postcards).where(eq(postcards.code, code)).limit(1);
  if (!card) {
    return { ok: false, status: 404, error: "Carte introuvable" };
  }
  if (card.ownerId === null) {
    return { ok: true, card };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { ok: false, status: 401, error: "Non authentifié" };
  }
  if (session.user.id !== card.ownerId) {
    return { ok: false, status: 403, error: "Accès refusé" };
  }
  return { ok: true, card };
}
