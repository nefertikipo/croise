import "server-only";
import { sendEmail, emailShell } from "@/lib/email";
import { getSeller } from "@/lib/billing/seller";

/**
 * Notify the operator (seller email) about an order event. There is no admin
 * orders view yet, so these emails ARE the ops dashboard: every paid order
 * sends one, and a fulfillment failure sends an action-required alert —
 * otherwise a `failed` order would sit invisible in the database.
 *
 * Best-effort by design: callers must never fail a webhook over this.
 */
export async function sendOperatorAlert(opts: {
  subject: string;
  heading: string;
  lines: string[];
}): Promise<void> {
  const html = emailShell({
    heading: opts.heading,
    bodyHtml: opts.lines
      .map((l) => `<p style="margin:0 0 8px">${l}</p>`)
      .join(""),
    footer: "Alerte interne Les Flèches — non envoyée aux clients.",
  });
  await sendEmail({ to: getSeller().email, subject: opts.subject, html });
}
