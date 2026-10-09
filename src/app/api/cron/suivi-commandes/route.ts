import { NextResponse } from "next/server";
import { eq, isNotNull, and } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { getPrintJob } from "@/lib/lulu/client";
import { sendEmail, emailShell } from "@/lib/email";
import { sendOperatorAlert } from "@/lib/billing/operator-alert";

// A batch of Lulu API calls + emails needs room.
export const maxDuration = 60;

const BATCH_LIMIT = 50;

/** Lulu normally charges within minutes; still UNPAID after this → alert. */
const UNPAID_ALERT_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * Order-tracking cron: polls Lulu for every order still `in_production` and
 * closes the loop the confirmation email promises ("vous recevrez le suivi dès
 * l'expédition"). SHIPPED → status `shipped`, tracking stored, customer emailed
 * (once — only in_production orders are polled). REJECTED/CANCELED → status
 * `failed` + operator alert. UNPAID for over 2h → operator alert each run. Scheduled in vercel.json.
 */
export async function GET(request: Request) {
  // Fail closed, same contract as the other crons: no CRON_SECRET, no run.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Tracking disabled (CRON_SECRET unset)" },
      { status: 403 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const open = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, "in_production"), isNotNull(orders.luluJobId)))
    .limit(BATCH_LIMIT);

  let shipped = 0;
  let failed = 0;
  let unpaid = 0;
  let errors = 0;

  for (const order of open) {
    try {
      const job = await getPrintJob(order.luluJobId!);
      const statusName = job.status?.name?.toUpperCase() ?? "";

      // DELIVERED follows SHIPPED, sometimes within a day (express): a twice-
      // daily poll can skip SHIPPED entirely, so both close the order.
      if (statusName === "SHIPPED" || statusName === "DELIVERED") {
        const items = job.line_items ?? [];
        const trackingUrls = items
          .flatMap((li) => li.tracking_urls ?? [])
          .filter(Boolean);
        const trackingId = items.find((li) => li.tracking_id)?.tracking_id ?? null;
        await db
          .update(orders)
          .set({
            status: "shipped",
            tracking: { trackingId, trackingUrls },
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        await sendShippedEmail(order.email, order.bookTitle, trackingUrls);
        shipped++;
      } else if (statusName === "REJECTED" || statusName === "CANCELED") {
        const message = job.status?.message ?? statusName;
        await db
          .update(orders)
          .set({ status: "failed", fulfillmentError: message, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        await sendOperatorAlert({
          subject: `ACTION REQUISE — job Lulu ${statusName} (commande #${order.id})`,
          heading: "Impression interrompue",
          lines: [
            `Le job Lulu <strong>#${order.luluJobId}</strong> est passé en ${statusName} après paiement.`,
            `Carnet « ${order.bookTitle} » (${order.bookCode}) · client ${order.email}.`,
            `Message Lulu : <code>${message}</code>`,
            `À faire : corriger puis relancer l'impression, ou rembourser le client.`,
          ],
        });
        failed++;
      } else if (
        statusName === "UNPAID" &&
        Date.now() - order.updatedAt.getTime() > UNPAID_ALERT_AFTER_MS
      ) {
        // An unpaid job just waits, unprinted (no card on the Lulu account, or
        // the charge failed). Nag every run until it is paid.
        await sendOperatorAlert({
          subject: `ACTION REQUISE — job Lulu impayé (commande #${order.id})`,
          heading: "Impression en attente de paiement Lulu",
          lines: [
            `Le job Lulu <strong>#${order.luluJobId}</strong> est toujours UNPAID : Lulu attend le paiement de l'impression.`,
            `Carnet « ${order.bookTitle} » (${order.bookCode}) · client ${order.email}.`,
            `À faire : régler le job (et enregistrer une carte) sur le compte Lulu — rien ne s'imprime d'ici là.`,
          ],
        });
        unpaid++;
      }
      // Any other status (production, payment in progress): nothing to do yet.
    } catch (err) {
      // One bad order must not stall the rest of the batch; retried next run.
      console.error(`Suivi commande ${order.id} (job ${order.luluJobId}) échoué:`, err);
      errors++;
    }
  }

  return NextResponse.json({ polled: open.length, shipped, failed, unpaid, errors });
}

async function sendShippedEmail(
  to: string,
  bookTitle: string,
  trackingUrls: string[],
): Promise<void> {
  const trackingBlock = trackingUrls.length
    ? `<p>Suivez votre colis ici :</p>
       <p>${trackingUrls
         .map((u) => `<a href="${u}" style="color:#c0392b">${u}</a>`)
         .join("<br/>")}</p>`
    : `<p>Votre transporteur n'a pas fourni de lien de suivi ; le carnet arrive
       dans les délais annoncés à la commande.</p>`;
  await sendEmail({
    to,
    subject: `Votre carnet « ${bookTitle} » est en route`,
    html: emailShell({
      heading: "En route !",
      bodyHtml: `
        <p>Bonne nouvelle : votre carnet <strong>« ${bookTitle} »</strong> est
        imprimé et vient d'être expédié.</p>
        ${trackingBlock}
        <p>Bonne réception, et bonnes grilles !</p>`,
      cta: trackingUrls[0]
        ? { label: "Suivre mon colis", url: trackingUrls[0] }
        : undefined,
    }),
  });
}
