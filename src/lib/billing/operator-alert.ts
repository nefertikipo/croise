import "server-only";
import { sendEmail, emailShell } from "@/lib/email";
import { getSeller } from "@/lib/billing/seller";

/**
 * Notify the operator about an order event: every paid order sends one, and a
 * fulfillment failure sends an action-required alert (the full list lives on
 * /admin/commandes). Goes to OPERATOR_EMAIL when set, else the public seller
 * address — set it to an inbox that actually receives mail.
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
  await sendEmail({
    to: process.env.OPERATOR_EMAIL || getSeller().email,
    subject: opts.subject,
    html,
  });
}
