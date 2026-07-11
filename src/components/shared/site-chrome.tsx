"use client";

import { usePathname } from "next/navigation";

import { Nav } from "@/components/shared/nav";

// The embedded Sanity Studio at /studio is a full-screen app and must not carry
// the marketing navigation. Everything else gets the site nav.
export function SiteChrome() {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return null;
  return <Nav />;
}
