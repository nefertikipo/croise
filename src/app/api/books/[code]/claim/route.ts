import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { auth } from "@/lib/auth";

/**
 * Claim an anonymous draft carnet for the signed-in user — the hinge of the
 * deferred-auth flow. A book made without an account (ownerId null) is adopted
 * here once the maker signs in (from the save nudge, the invite button, or
 * checkout), after which editing is locked to them.
 *
 * First-claimer-wins on a still-anonymous book; a book already owned by someone
 * else is refused. The client only calls this for drafts it created (tracked in
 * localStorage), so a shared anonymous link isn't silently stolen by a viewer.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [book] = await db
    .select({ id: books.id, ownerId: books.ownerId })
    .from(books)
    .where(eq(books.code, code))
    .limit(1);
  if (!book) {
    return NextResponse.json({ error: "Carnet introuvable" }, { status: 404 });
  }
  if (book.ownerId === session.user.id) {
    return NextResponse.json({ ok: true, alreadyOwner: true });
  }
  if (book.ownerId !== null) {
    return NextResponse.json(
      { error: "Ce carnet appartient déjà à quelqu'un d'autre." },
      { status: 403 },
    );
  }

  // Atomic: only claim if still anonymous, so two concurrent claims can't race.
  const claimed = await db
    .update(books)
    .set({ ownerId: session.user.id })
    .where(and(eq(books.id, book.id), isNull(books.ownerId)))
    .returning({ id: books.id });

  if (claimed.length === 0) {
    return NextResponse.json(
      { error: "Ce carnet vient d'être réclamé." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
