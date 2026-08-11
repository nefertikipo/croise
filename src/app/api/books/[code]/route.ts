import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { loadBook } from "@/lib/books/serialize";
import { authorizeBookEdit } from "@/lib/books/authorize";
import {
  bookClueIdeasSchema,
  bookDedicationFontSchema,
  bookDedicationSchema,
  bookDedicationSignatureSchema,
  bookTitleSchema,
} from "@/lib/books/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const book = await loadBook(code);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    return NextResponse.json(book);
  } catch (error) {
    console.error("Book fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
  }
}

/**
 * Partial update: only the provided fields change; unknown fields are ignored
 * (zod strips them). Every field is bounded (shared schemas in
 * src/lib/books/validation.ts) so a book row can't be inflated arbitrarily.
 */
const patchSchema = z.object({
  title: bookTitleSchema.optional(),
  description: z.string().max(2000).nullable().optional(),
  dedicationText: bookDedicationSchema.nullable().optional(),
  dedicationFont: bookDedicationFontSchema.nullable().optional(),
  dedicationSignature: bookDedicationSignatureSchema.nullable().optional(),
  status: z.enum(["draft", "ready", "ordered"]).optional(),
  clueIdeas: bookClueIdeasSchema.optional(),
  coverConfig: z
    .record(z.string(), z.unknown())
    .refine((v) => JSON.stringify(v).length <= 50_000, {
      message: "coverConfig trop volumineux",
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Requête invalide : certains champs sont mal formés ou trop longs." },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.dedicationText !== undefined) updates.dedicationText = data.dedicationText;
    if (data.dedicationFont !== undefined) updates.dedicationFont = data.dedicationFont;
    if (data.dedicationSignature !== undefined) updates.dedicationSignature = data.dedicationSignature;
    if (data.coverConfig !== undefined) updates.coverConfig = data.coverConfig;
    if (data.clueIdeas !== undefined) updates.clueIdeas = data.clueIdeas;
    if (data.status !== undefined) updates.status = data.status;

    await db.update(books).set(updates).where(eq(books.id, authz.book.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book update error:", error);
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    // Anonymous books are deletable by anyone holding the code (the code is
    // their only credential); owned books only by their owner.
    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    // book_pages rows cascade on book delete; the grids themselves are kept.
    await db.delete(books).where(eq(books.id, authz.book.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book delete error:", error);
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
  }
}
