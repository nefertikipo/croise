import { NextResponse } from "next/server";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { generateBookCode } from "@/lib/code";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || "Mon livre de mots fleches";

    const code = generateBookCode();

    const [book] = await db
      .insert(books)
      .values({
        code,
        title,
        language: "fr",
        status: "draft",
      })
      .returning({ id: books.id, code: books.code });

    return NextResponse.json({ id: book.id, code: book.code });
  } catch (error) {
    console.error("Book creation error:", error);
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}
