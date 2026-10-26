import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { checkRateLimit } from "@vercel/firewall";

/**
 * Must match the Rate limit ID of the `@vercel/firewall` rule in the
 * lesfleches Vercel Firewall. The rule holds the actual limit (requests per
 * window); this code only picks the bucket key.
 */
const RATE_LIMIT_ID = "fleche-generate";

/**
 * Gate for the public grid generation endpoints. Each call costs seconds of
 * CPU, and in Oct 2026 a Python script hit the open endpoint ~10k times a day
 * to harvest grids and clues. Returns a response to send back when the caller
 * is refused, or null to proceed.
 *
 * - BotID rejects callers that didn't come from a real browser session on our
 *   pages (protected paths are declared in src/instrumentation-client.ts).
 * - The rate limit buckets signed-in users by account and everyone else by IP.
 *   It fails open: a firewall hiccup shouldn't block real users from generating.
 */
export async function guardGenerate(
  request: Request,
  userId: string | null,
): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const { rateLimited } = await checkRateLimit(RATE_LIMIT_ID, {
      request,
      rateLimitKey: userId ? `user:${userId}` : undefined,
      timeout: 1500,
    });
    if (rateLimited) {
      return NextResponse.json(
        { error: "Trop de grilles generees. Reessayez dans un moment." },
        { status: 429 },
      );
    }
  } catch (err) {
    console.warn("[guard-generate] rate limit check failed, allowing:", err);
  }

  return null;
}
