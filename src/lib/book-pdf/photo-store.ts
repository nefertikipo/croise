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

/** Persist original bytes and return a ref (a Blob URL, or `local:<name>`). */
export async function putOriginal(bytes: Buffer, ext = "jpg"): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`book-photos/${name}`, bytes, { access: "public", contentType });
    return url;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, name), bytes);
  return `${LOCAL_PREFIX}${name}`;
}

/** Resolve a ref produced by putOriginal() back to the original bytes. */
export async function getOriginal(ref: string): Promise<Buffer> {
  if (ref.startsWith(LOCAL_PREFIX)) {
    return readFile(join(LOCAL_DIR, ref.slice(LOCAL_PREFIX.length)));
  }
  const res = await fetch(ref);
  if (!res.ok) throw new Error(`Failed to fetch original (${res.status}): ${ref}`);
  return Buffer.from(await res.arrayBuffer());
}
