/**
 * The seller's legal identity, as it must appear on a compliant French invoice.
 *
 * A micro-entreprise is an *entreprise individuelle*: the seller is the person.
 * French law requires every invoice to carry the seller's legal name, address,
 * SIRET, a unique sequential invoice number, and — while under the franchise en
 * base de TVA — the mention "TVA non applicable, art. 293 B du CGI".
 *
 * These come from env so real identity/SIRET never live in the repo. They are
 * REQUIRED before issuing a real (live-mode) invoice; `assertSellerConfigured`
 * fails loudly if any are missing.
 */
export interface SellerIdentity {
  legalName: string;
  siret: string;
  addressLines: string[];
  email: string;
  /** Legal VAT mention printed on every invoice. */
  vatMention: string;
}

export function getSeller(): SellerIdentity {
  return {
    legalName: process.env.SELLER_LEGAL_NAME ?? "",
    siret: process.env.SELLER_SIRET ?? "",
    // Comma-separated in env, e.g. "12 rue de X, 75001 Paris, France".
    addressLines: (process.env.SELLER_ADDRESS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    email: process.env.SELLER_EMAIL ?? "bonjour@lesfleches.com",
    vatMention:
      process.env.SELLER_VAT_MENTION ?? "TVA non applicable, art. 293 B du CGI",
  };
}

/** Throws if seller identity is incomplete — call before issuing an invoice. */
export function assertSellerConfigured(s: SellerIdentity): void {
  const missing: string[] = [];
  if (!s.legalName) missing.push("SELLER_LEGAL_NAME");
  if (!s.siret) missing.push("SELLER_SIRET");
  if (s.addressLines.length === 0) missing.push("SELLER_ADDRESS");
  if (missing.length > 0) {
    throw new Error(
      `Identité vendeur incomplète pour la facture : ${missing.join(", ")} manquant(s).`,
    );
  }
}

/** "FL-2026-0001" — the customer-facing invoice number from a sequential id. */
export function formatInvoiceNumber(seq: number, year: number): string {
  return `FL-${year}-${String(seq).padStart(4, "0")}`;
}
