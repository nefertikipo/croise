import { defineLive } from "next-sanity/live";

import { apiVersion } from "@/sanity/env";
import { client } from "@/sanity/lib/client";

// Live Content API: server-side fetches revalidate automatically when content
// is published in the Studio — no webhooks needed. We only pass a server token
// (no browserToken) so the read token is never exposed to the client.
export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: false,
});
