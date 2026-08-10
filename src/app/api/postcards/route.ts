import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { generatePostcardCode, retryOnUniqueViolation } from "@/lib/code";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

const requestSchema = z.object({
  title: z.string().max(60).optional(),
  recipientName: z.string().max(60).optional(),
  message: z.string().max(600).optional(),
  messageFont: z.string().max(30).optional(),
  gridColor: z.string().max(20).optional(),
});

/** List the signed-in user's cards. Anonymous callers get an empty list. */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const ownerId = session?.user.id ?? null;
    if (!ownerId) return NextResponse.json({ postcards: [] });

    const rows = await db
      .select({
        code: postcards.code,
        title: postcards.title,
        recipientName: postcards.recipientName,
        status: postcards.status,
        hasGrid: postcards.crosswordId,
      })
      .from(postcards)
      .where(eq(postcards.ownerId, ownerId))
      .orderBy(desc(postcards.createdAt));

    return NextResponse.json({
      postcards: rows.map((r) => ({
        code: r.code,
        title: r.title,
        recipientName: r.recipientName,
        status: r.status,
        hasGrid: r.hasGrid !== null,
      })),
    });
  } catch (error) {
    console.error("Postcard list error:", error);
    return NextResponse.json({ error: "Failed to list postcards" }, { status: 500 });
  }
}

/** Create a draft card. Anonymous is allowed (editable by code, like a grid). */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const ownerId = session?.user.id ?? null;

    const body = await request.json().catch(() => ({}));
    const result = requestSchema.safeParse(body ?? {});
    if (!result.success) {
      return NextResponse.json(
        { error: "Requête invalide : certains champs sont mal formés ou trop longs." },
        { status: 400 },
      );
    }
    const parsed = result.data;

    const id = crypto.randomUUID();
    const code = await retryOnUniqueViolation(async () => {
      const freshCode = generatePostcardCode();
      await db.insert(postcards).values({
        id,
        code: freshCode,
        ownerId,
        title: parsed.title,
        recipientName: parsed.recipientName,
        message: parsed.message,
        messageFont: parsed.messageFont,
        gridColor: parsed.gridColor,
        status: "draft",
      });
      return freshCode;
    });

    return NextResponse.json({ id, code });
  } catch (error) {
    console.error("Postcard creation error:", error);
    return NextResponse.json({ error: "Failed to create postcard" }, { status: 500 });
  }
}
