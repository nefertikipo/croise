/**
 * Storage for full-resolution book photos.
 *
 * The customer's original photo is what the print engine needs at 300 DPI, so
 * it lives OUTSIDE the database: Vercel Blob in production (when
 * BLOB_READ_WRITE_TOKEN is set), local disk in dev so the flow runs with no
 * cloud setup. Only a short `ref` string is persisted in the book config; the
 * PDF engine resolves it back to bytes via getOriginal().
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LOCAL_DIR = join(process.cwd(), ".uploads");
const LOCAL_PREFIX = "local:";

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Thrown when a stored photo can no longer be resolved (deleted Blob, wiped
 * local dir…). A user-fixable state: re-upload the photo. */
export class MissingPhotoError extends Error {
  constructor(ref: string) {
    super(`Stored photo not found: ${ref}`);
    this.name = "MissingPhotoError";
  }
}

/** Persist original bytes and return a ref (a Blob URL, or `local:<name>`). */
export async function putOriginal(bytes: Buffer, ext = "jpg"): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`book-photos/${name}`, bytes, { access: "public", contentType });
    return url;
  }

  // On Vercel, the local-disk fallback would "succeed" into an ephemeral
  // filesystem and silently break at print time — fail loudly at store time.
  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set in production; refusing to store the photo on ephemeral disk.");
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, name), bytes);
  return `${LOCAL_PREFIX}${name}`;
}

/** Resolve a ref produced by putOriginal() back to the original bytes. */
export async function getOriginal(ref: string): Promise<Buffer> {
  if (ref.startsWith(LOCAL_PREFIX)) {
    try {
      return await readFile(join(LOCAL_DIR, ref.slice(LOCAL_PREFIX.length)));
    } catch {
      throw new MissingPhotoError(ref);
    }
  }
  const res = await fetch(ref);
  if (res.status === 404 || res.status === 410 || res.status === 403) throw new MissingPhotoError(ref);
  if (!res.ok) throw new Error(`Failed to fetch original (${res.status}): ${ref}`);
  return Buffer.from(await res.arrayBuffer());
}
