import { customAlphabet } from "nanoid";

/**
 * Unambiguous uppercase alphanumerics — no O/0 and no I/1, since these codes
 * get printed in books, read aloud and retyped. 32 symbols × length 8 ≈ 1.1e12
 * combinations. (The previous scheme uppercased nanoid output and mapped -/_
 * to X, which folded entropy; existing shorter codes remain valid — this only
 * affects newly generated ones.)
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const generateCode = customAlphabet(CODE_ALPHABET, CODE_LENGTH);

export function generateCrosswordCode(): string {
  return `XWRD-${generateCode()}`;
}

export function generateBookCode(): string {
  return `BOOK-${generateCode()}`;
}

export function generatePostcardCode(): string {
  return `CARD-${generateCode()}`;
}

export function generateCalendarCode(): string {
  return `CAL-${generateCode()}`;
}

/** True when a Postgres write failed on a unique constraint (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Run an insert that writes a freshly generated share code, retrying on a
 * unique-constraint collision. The attempt callback must generate a NEW code
 * on each invocation. Collisions are astronomically rare but free to handle.
 */
export async function retryOnUniqueViolation<T>(
  attempt: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
