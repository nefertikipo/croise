import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { eq } from "drizzle-orm";
import { loadPostcard } from "@/lib/postcards/serialize";
import { authorizePostcardEdit } from "@/lib/postcards/authorize";

/** GET the full postcard payload (front grid + personalization). Public by code. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const card = await loadPostcard(code);
    if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
    return NextResponse.json(card);
  } catch (error) {
    console.error("Postcard load error:", error);
    return NextResponse.json({ error: "Failed to load postcard" }, { status: 500 });
  }
}

const patchSchema = z.object({
  title: z.string().max(60).nullable().optional(),
  recipientName: z.string().max(60).nullable().optional(),
  message: z.string().max(600).nullable().optional(),
  messageFont: z.string().max(30).nullable().optional(),
  gridColor: z.string().max(20).nullable().optional(),
});

/** PATCH the card's personalization (title, recipient, message, fonts, colour). */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizePostcardEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    await db
      .update(postcards)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(postcards.id, authResult.card.id));

    const card = await loadPostcard(code);
    return NextResponse.json(card);
  } catch (error) {
    console.error("Postcard update error:", error);
    return NextResponse.json({ error: "Failed to update postcard" }, { status: 500 });
  }
}

/** DELETE the card. The generated crossword is left intact (it may be shared). */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizePostcardEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    await db.delete(postcards).where(eq(postcards.id, authResult.card.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Postcard delete error:", error);
    return NextResponse.json({ error: "Failed to delete postcard" }, { status: 500 });
  }
}
