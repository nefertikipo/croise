import { loadBook } from "@/lib/books/serialize";
import { generateBookInteriorPdf, countInteriorPages, EmptyBookError, POD_MIN_INTERIOR_PAGES } from "@/lib/book-pdf/generate-book";
import { SADDLE_MAX_INTERIOR_PAGES } from "@/lib/books/constants";
import { resolvePageSize } from "@/lib/book-pdf/geometry";
import { MissingPhotoError } from "@/lib/book-pdf/photo-store";

/** PDF composition (photos at 300 DPI) can exceed the default duration. */
export const maxDuration = 60;

/** GET the print-ready interior PDF (dedication → spine → index → solutions) for a book. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const size = resolvePageSize(new URL(req.url).searchParams.get("size") ?? undefined);
    const book = await loadBook(code);
    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    const pageCount = countInteriorPages(book, size);
    if (pageCount < POD_MIN_INTERIOR_PAGES) {
      console.warn(`Book ${code}: interior is ${pageCount} pages, below the typical POD minimum of ${POD_MIN_INTERIOR_PAGES}.`);
    }
    if (pageCount > SADDLE_MAX_INTERIOR_PAGES) {
      console.warn(`Book ${code}: ${pageCount} pages exceeds the saddle-stitch ceiling of ${SADDLE_MAX_INTERIOR_PAGES} — needs perfect binding.`);
    }

    const pdf = await generateBookInteriorPdf(book, size);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="livre-${code}-${size}.pdf"`,
        "Cache-Control": "no-store",
        "X-Interior-Pages": String(pageCount),
      },
    });
  } catch (err) {
    if (err instanceof EmptyBookError) {
      return Response.json({ error: "Ajoutez au moins une grille." }, { status: 400 });
    }
    if (err instanceof MissingPhotoError) {
      return Response.json({ error: "Une photo du livre est introuvable. Veuillez la retélécharger." }, { status: 400 });
    }
    console.error("Book interior PDF generation failed:", err);
    return Response.json({ error: "Echec de la generation du livre." }, { status: 500 });
  }
}
