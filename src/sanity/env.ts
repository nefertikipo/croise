export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-02-01";

/**
 * Sanity is OPTIONAL in local dev. If the project isn't configured the app
 * still boots (marketing/CMS pages just won't fetch content) — layout.tsx uses
 * `sanityEnabled` to skip <SanityLive />. Production always sets both env vars.
 * The placeholders keep @sanity/client from throwing at import time when the
 * vars are absent.
 */
export const sanityEnabled = Boolean(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET,
);

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "dev-placeholder";

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
