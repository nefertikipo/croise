import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { auth } from "@/lib/auth";

/** Delete a mots croisés grid the caller owns. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [grid] = await db
    .select({ id: americanCrosswords.id, ownerId: americanCrosswords.ownerId })
    .from(americanCrosswords)
    .where(eq(americanCrosswords.code, code))
    .limit(1);

  if (!grid) {
    return NextResponse.json({ error: "Grille introuvable" }, { status: 404 });
  }
  if (grid.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await db.delete(americanCrosswords).where(eq(americanCrosswords.id, grid.id));
  return NextResponse.json({ success: true });
}
