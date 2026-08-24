import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { gridCompletions } from "@/db/schema/grid-completions";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { ORIGINALES_THEME } from "@/lib/originales/constants";

const TOP_N = 20;
const MAX_USERNAME = 24;

async function loadGrid(code: string) {
  const [grid] = await db
    .select({ id: crosswords.id, theme: crosswords.theme })
    .from(crosswords)
    .where(eq(crosswords.code, code))
    .limit(1);
  return grid;
}

/** Purity rank: a pure solve outranks an autochecked one, which outranks a
 * revealed one. Ties break on time. Used to keep each user's *best* row. */
function purityRank(revealed: boolean, autocheck: boolean): number {
  if (revealed) return 0;
  if (autocheck) return 1;
  return 2;
}

function cleanUsername(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, MAX_USERNAME);
  return trimmed.length > 0 ? trimmed : null;
}

/** The pure ranked board (no reveals, no autocheck) + whether a row is the caller's. */
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
      // Player-chosen name wins; fall back to the account name.
      name: sql<string>`coalesce(${gridCompletions.username}, ${user.name})`,
      timeMs: gridCompletions.timeMs,
    })
    .from(gridCompletions)
    .innerJoin(user, eq(user.id, gridCompletions.userId))
    .where(
      and(
        eq(gridCompletions.crosswordId, grid.id),
        eq(gridCompletions.revealed, false),
        eq(gridCompletions.autocheck, false),
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
    isMe: r.userId === meId,
  }));

  return NextResponse.json({ entries });
}

const submitSchema = z.object({
  timeMs: z.number().int().min(1000).max(24 * 60 * 60 * 1000),
  revealed: z.boolean().default(false),
  autocheck: z.boolean().default(false),
  username: z.string().max(80).optional(),
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
  const username = cleanUsername(parsed.data.username);
  const userId = session.user.id;

  const [existing] = await db
    .select({
      timeMs: gridCompletions.timeMs,
      revealed: gridCompletions.revealed,
      autocheck: gridCompletions.autocheck,
    })
    .from(gridCompletions)
    .where(
      and(
        eq(gridCompletions.crosswordId, grid.id),
        eq(gridCompletions.userId, userId),
      ),
    )
    .limit(1);

  const isBetter =
    !existing ||
    purityRank(revealed, autocheck) > purityRank(existing.revealed, existing.autocheck) ||
    (purityRank(revealed, autocheck) === purityRank(existing.revealed, existing.autocheck) &&
      timeMs < existing.timeMs);

  if (!existing) {
    await db.insert(gridCompletions).values({
      crosswordId: grid.id,
      userId,
      username,
      timeMs,
      revealed,
      autocheck,
    });
  } else {
    // Always refresh the display name if one was supplied; only overwrite the
    // time/flags when this solve is genuinely better.
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (username !== null) set.username = username;
    if (isBetter) {
      set.timeMs = timeMs;
      set.revealed = revealed;
      set.autocheck = autocheck;
    }
    await db
      .update(gridCompletions)
      .set(set)
      .where(
        and(
          eq(gridCompletions.crosswordId, grid.id),
          eq(gridCompletions.userId, userId),
        ),
      );
  }

  return NextResponse.json({ ok: true, recorded: isBetter });
}

const renameSchema = z.object({ username: z.string().max(80) });

/** Update just the caller's display name on this grid's board. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const grid = await loadGrid(code);
  if (!grid) return NextResponse.json({ error: "Grid not found" }, { status: 404 });

  const parsed = renameSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  await db
    .update(gridCompletions)
    .set({ username: cleanUsername(parsed.data.username), updatedAt: new Date() })
    .where(
      and(
        eq(gridCompletions.crosswordId, grid.id),
        eq(gridCompletions.userId, session.user.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
