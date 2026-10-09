import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Operator access. ADMIN_EMAILS is a comma-separated allowlist of account
 * emails (e.g. "louisetexier65@gmail.com"); anyone signed in with one of them
 * is an admin. Unset → nobody is, so /admin fails closed on a fresh deploy.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().has(email!.toLowerCase());
}

/** The signed-in admin's email, or null for visitors and regular users. */
export async function getAdminEmail(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? null;
  return isAdminEmail(email) ? email : null;
}
