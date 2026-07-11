import { NextResponse } from "next/server";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { user } from "@/db/schema/auth";
import { sendEmail, emailShell } from "@/lib/email";

// Give Vercel room to send a batch of emails.
export const maxDuration = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.BETTER_AUTH_URL ||
  "https://lesfleches.com";

// A book counts as "abandoned" when it's still a draft, owned, untouched for a
// few days, and not so old it's clearly forgotten. Reminded at most once.
const STALE_AFTER_DAYS = 3;
const MAX_AGE_DAYS = 30;
const BATCH_LIMIT = 100;

export async function GET(request: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when the env var
  // is set; reject anything else so the endpoint can't be triggered publicly.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const staleBefore = new Date(now - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const notOlderThan = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      code: books.code,
      title: books.title,
      email: user.email,
      name: user.name,
    })
    .from(books)
    .innerJoin(user, eq(books.ownerId, user.id))
    .where(
      and(
        eq(books.status, "draft"),
        isNull(books.reminderSentAt),
        lt(books.updatedAt, staleBefore),
        gt(books.updatedAt, notOlderThan),
      ),
    )
    .limit(BATCH_LIMIT);

  let sent = 0;
  const failed: string[] = [];

  for (const book of candidates) {
    const firstName = book.name?.trim().split(" ")[0];
    const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
    try {
      await sendEmail({
        to: book.email,
        subject: "Votre livre de mots fléchés vous attend",
        html: emailShell({
          heading: "On termine votre livre ?",
          bodyHtml: `<p>${greeting}</p><p>Vous avez commencé le livre <strong>${book.title}</strong> mais ne l'avez pas encore terminé. Il vous attend, exactement là où vous l'avez laissé.</p>`,
          cta: { label: "Reprendre mon livre", url: `${SITE_URL}/book/${book.code}` },
          footer:
            "Vous recevez cet e-mail car vous avez commencé un livre sur Les Flèches.",
        }),
      });
      await db
        .update(books)
        .set({ reminderSentAt: new Date() })
        .where(eq(books.code, book.code));
      sent++;
    } catch (err) {
      console.error(`Reminder failed for book ${book.code}:`, err);
      failed.push(book.code);
    }
  }

  return NextResponse.json({
    candidates: candidates.length,
    sent,
    failed: failed.length,
  });
}
