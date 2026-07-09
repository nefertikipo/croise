import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema/leads";

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(60).optional(),
});

/** Capture a waitlist email (e.g. the monthly-gift launch list on /offrir). */
export async function POST(request: Request) {
  try {
    const { email, source } = schema.parse(await request.json());
    await db
      .insert(leads)
      .values({ email: email.trim().toLowerCase(), source: source ?? null })
      .onConflictDoNothing({ target: leads.email });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
}
