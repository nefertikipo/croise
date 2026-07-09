// Canonical site metadata used for absolute URLs (sitemap, JSON-LD, Open Graph).
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const SITE_URL = rawSiteUrl.replace(/\/$/, "");
export const SITE_NAME = "Les Flèches";
export const SITE_TAGLINE = "Mots fléchés et mots croisés personnalisés";
export const SITE_DESCRIPTION =
  "Créez des mots fléchés et mots croisés personnalisés avec vos propres mots — une idée cadeau originale, imprimée et prête à offrir.";

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
