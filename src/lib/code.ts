import { nanoid } from "nanoid";

export function generateCrosswordCode(): string {
  const id = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `XWRD-${id}`;
}

export function generateBookCode(): string {
  const id = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `BOOK-${id}`;
}
