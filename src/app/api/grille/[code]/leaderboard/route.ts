import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { gridCompletions } from "@/db/schema/grid-completions";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { ORIGINALES_THEME } from "@/lib/originales/constants";

const TOP_N = 20;

async function loadGrid(code: string) {
  const [grid] = await db
    .select({ id: crosswords.id, theme: crosswords.theme })
    .from(crosswords)
    .where(eq(crosswords.code, code))
    .limit(1);
  return grid;
}

/** Ranked clean solves + the signed-in user's own best, if any. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const grid = await loadGrid(code);
  if (!grid) return NextResponse.json({ error: "Grid not found" }, { status: 404 });

  const rows = await db
    .select({
      userId: gridCompletions.userId,
      name: user.name,
      timeMs: gridCompletions.timeMs,
      autocheck: gridCompletions.autocheck,
    })
    .from(gridCompletions)
    .innerJoin(user, eq(user.id, gridCompletions.userId))
    .where(
      and(
        eq(gridCompletions.crosswordId, grid.id),
        eq(gridCompletions.revealed, false),
      ),
    )
    .orderBy(asc(gridCompletions.timeMs))
    .limit(TOP_N);

  const session = await auth.api.getSession({ headers: request.headers });
  const meId = session?.user.id ?? null;
  const entries = rows.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    timeMs: r.timeMs,
    autocheck: r.autocheck,
    isMe: r.userId === meId,
  }));

  return NextResponse.json({ entries });
}

const submitSchema = z.object({
  timeMs: z.number().int().min(1000).max(24 * 60 * 60 * 1000),
  revealed: z.boolean().default(false),
  autocheck: z.boolean().default(false),
});

/** Record a completion (Originales grids only). Keeps each user's best result. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const grid = await loadGrid(code);
  if (!grid) return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  if (grid.theme !== ORIGINALES_THEME) {
    return NextResponse.json({ error: "Classement indisponible" }, { status: 403 });
  }

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { timeMs, revealed, autocheck } = parsed.data;
  const userId = session.user.id;

  const [existing] = await db
    .select({
      timeMs: gridCompletions.timeMs,
      revealed: gridCompletions.revealed,
    })
    .from(gridCompletions)
    .where(
      and(
        eq(gridCompletions.crosswordId, grid.id),
        eq(gridCompletions.userId, userId),
      ),
    )
    .limit(1);

  // Better = a clean solve beats a revealed one; otherwise the faster time wins.
  const isBetter =
    !existing ||
    (!revealed && existing.revealed) ||
    (revealed === existing.revealed && timeMs < existing.timeMs);

  if (!existing) {
    await db.insert(gridCompletions).values({
      crosswordId: grid.id,
      userId,
      timeMs,
      revealed,
      autocheck,
    });
  } else if (isBetter) {
    await db
      .update(gridCompletions)
      .set({ timeMs, revealed, autocheck, updatedAt: new Date() })
      .where(
        and(
          eq(gridCompletions.crosswordId, grid.id),
          eq(gridCompletions.userId, userId),
        ),
      );
  }

  return NextResponse.json({ ok: true, recorded: isBetter, improved: isBetter && !!existing });
}
