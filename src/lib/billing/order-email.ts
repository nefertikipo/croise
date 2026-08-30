import "server-only";
import { sendEmail, emailShell } from "@/lib/email";
import { formatEuros } from "@/lib/books/pricing";
import {
  getSeller,
  assertSellerConfigured,
  formatInvoiceNumber,
} from "@/lib/billing/seller";

interface OrderForEmail {
  bookTitle: string;
  email: string;
  amount: number;
  invoiceSeq: number;
  shipping: unknown;
  createdAt: Date;
}

interface ShippingSnapshot {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

function shippingLines(shipping: unknown): string[] {
  const s = shipping as ShippingSnapshot | null;
  if (!s) return [];
  const a = s.address;
  return [
    s.name,
    a?.line1,
    a?.line2,
    [a?.postal_code, a?.city].filter(Boolean).join(" "),
    a?.country,
  ].filter((l): l is string => Boolean(l && l.trim()));
}

/**
 * Confirm a paid order and issue the invoice, in one on-brand email.
 *
 * When the seller identity (SELLER_LEGAL_NAME/SIRET/ADDRESS) is configured, the
 * email doubles as a legally-compliant French invoice: sequential number,
 * seller identity, buyer, line item, total, and the franchise-en-base VAT
 * mention. When it is not (e.g. local test mode), it degrades to a plain
 * confirmation and logs a warning — so testing never crashes on missing SIRET.
 */
export async function sendOrderConfirmation(order: OrderForEmail): Promise<void> {
  const seller = getSeller();
  const year = order.createdAt.getFullYear();
  const invoiceNumber = formatInvoiceNumber(order.invoiceSeq, year);
  const dateStr = order.createdAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const ship = shippingLines(order.shipping);

  let sellerBlock = "";
  let legalInvoice = false;
  try {
    assertSellerConfigured(seller);
    legalInvoice = true;
    sellerBlock = `
      <p style="margin:16px 0 4px;font-size:13px;color:rgba(0,0,0,.6)">Vendeur</p>
      <p style="margin:0;font-size:14px">
        <strong>${seller.legalName}</strong><br/>
        ${seller.addressLines.join("<br/>")}<br/>
        SIRET ${seller.siret}
      </p>`;
  } catch {
    console.error(
      `Facture émise sans identité vendeur complète (commande ${invoiceNumber}). Renseignez SELLER_LEGAL_NAME / SELLER_SIRET / SELLER_ADDRESS.`,
    );
  }

  const shippingBlock = ship.length
    ? `<p style="margin:16px 0 4px;font-size:13px;color:rgba(0,0,0,.6)">Livraison</p>
       <p style="margin:0;font-size:14px">${ship.join("<br/>")}</p>`
    : "";

  const bodyHtml = `
    <p>Merci ! Votre carnet <strong>« ${order.bookTitle} »</strong> est confirmé et
    part à l'impression. Vous recevrez un email avec le suivi dès qu'il est expédié.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:20px 0;border-collapse:collapse;font-size:14px">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,.12)">
          Carnet de mots fléchés — ${order.bookTitle}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,.12);text-align:right;white-space:nowrap">
          ${formatEuros(order.amount)}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-weight:700">Total payé</td>
        <td style="padding:10px 0;text-align:right;font-weight:700">${formatEuros(order.amount)}</td>
      </tr>
    </table>

    <p style="font-size:12px;color:rgba(0,0,0,.6);margin:0 0 16px">${seller.vatMention}</p>

    ${sellerBlock}
    ${shippingBlock}

    <p style="margin-top:20px;font-size:13px;color:rgba(0,0,0,.6)">
      ${legalInvoice ? "Facture" : "Récapitulatif"} n° ${invoiceNumber} · ${dateStr}
    </p>`;

  await sendEmail({
    to: order.email,
    subject: `Votre carnet est confirmé — facture ${invoiceNumber}`,
    html: emailShell({
      heading: "Commande confirmée",
      bodyHtml,
      footer: `Facture ${invoiceNumber} · Les Flèches · ${seller.vatMention}`,
    }),
  });
}
