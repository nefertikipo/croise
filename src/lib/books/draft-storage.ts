/**
 * Client-side record of carnets this device created anonymously (deferred auth).
 *
 * Only the device that made a draft — or that explicitly chose "save / sign in"
 * on it — remembers its code. The editor auto-claims a draft on sign-in ONLY
 * when its code is in this list, so a shared anonymous link opened by someone
 * else is never silently claimed out from under the maker.
 *
 * Codes are forgotten once claimed (they're then owned and listed in /mes-livres).
 */
const KEY = "lesfleches-draft-carnets";
const MAX = 50;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function write(codes: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes.slice(-MAX)));
  } catch {
    /* storage unavailable / full — best effort */
  }
}

/** Remember a freshly-created (or about-to-be-saved) anonymous draft. */
export function rememberDraft(code: string): void {
  const codes = read();
  if (!codes.includes(code)) write([...codes, code]);
}

/** True if this device created/owns-locally the given draft code. */
export function isKnownDraft(code: string): boolean {
  return read().includes(code);
}

/** Drop a draft once it's been claimed into an account. */
export function forgetDraft(code: string): void {
  write(read().filter((c) => c !== code));
}
