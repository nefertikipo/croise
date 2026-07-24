import { loadBook } from "@/lib/books/serialize";
import { generateBookInteriorPdf, EmptyBookError } from "@/lib/book-pdf/generate-book";
import { resolvePageSize } from "@/lib/book-pdf/geometry";

/** GET the print-ready interior PDF (grids → index → solutions) for a book. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const size = resolvePageSize(new URL(req.url).searchParams.get("size") ?? undefined);
    const book = await loadBook(code);
    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    const pdf = await generateBookInteriorPdf(book, size);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="livre-${code}-${size}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof EmptyBookError) {
      return Response.json({ error: "Ajoutez au moins une grille." }, { status: 400 });
    }
    console.error("Book interior PDF generation failed:", err);
    return Response.json({ error: "Echec de la generation du livre." }, { status: 500 });
  }
}
