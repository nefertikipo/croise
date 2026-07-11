import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

/** From address; must be on a domain verified in Resend. */
const FROM = process.env.EMAIL_FROM || "Les Flèches <bonjour@lesfleches.com>";

const resend = apiKey ? new Resend(apiKey) : null;

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional email via Resend. No-ops with a logged error when
 * RESEND_API_KEY is unset, so local dev without a key doesn't crash.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  if (!resend) {
    console.error(
      `Email not sent (RESEND_API_KEY unset): "${subject}" → ${to}`,
    );
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("Resend send error:", error);
    throw new Error(error.message);
  }
}

/**
 * Wrap body content in the vintage-editorial email shell (cream paper, ink
 * frame, red display heading) so all our emails look on-brand.
 */
export function emailShell(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const { heading, bodyHtml, cta, footer } = opts;
  const button = cta
    ? `<tr><td style="padding:8px 0 4px">
         <a href="${cta.url}" style="display:inline-block;background:#1a1a1a;color:#f5efe0;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-weight:700;font-size:14px;padding:12px 22px;border:2px solid #1a1a1a">${cta.label}</a>
       </td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#efe7d4;padding:24px;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#f5efe0;border:2px solid #1a1a1a">
      <tr><td style="background:#c0392b;color:#f5efe0;padding:10px 20px;text-transform:uppercase;letter-spacing:3px;font-size:12px;text-align:center;font-weight:700">Les Flèches</td></tr>
      <tr><td style="padding:28px 28px 8px">
        <h1 style="margin:0 0 12px;color:#c0392b;text-transform:uppercase;letter-spacing:1px;font-size:26px">${heading}</h1>
        <div style="font-size:16px;line-height:1.6">${bodyHtml}</div>
      </td></tr>
      <tr><td style="padding:8px 28px 28px"><table role="presentation" cellpadding="0" cellspacing="0">${button}</table></td></tr>
      <tr><td style="padding:14px 28px;border-top:1px solid rgba(0,0,0,.15);font-size:12px;color:rgba(0,0,0,.55)">${footer ?? "Les Flèches — mots fléchés personnalisés à imprimer et offrir."}</td></tr>
    </table>
  </body></html>`;
}
