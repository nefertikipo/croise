import { loadBook } from "@/lib/books/serialize";
import { generateCoverSpreadPdf, MissingCoverPhotoError } from "@/lib/book-pdf/generate-cover";
import { countInteriorPages, EmptyBookError } from "@/lib/book-pdf/generate-book";
import { MissingPhotoError } from "@/lib/book-pdf/photo-store";
import { bookAuthors } from "@/lib/books/authors";

/** PDF composition (photo at 300 DPI) can exceed the default duration. */
export const maxDuration = 60;

/** GET the print-ready wraparound cover spread (back + spine + front) for a book. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const book = await loadBook(code);
    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    // The spine width derives from the final interior page count (A5 = the book).
    const interiorPageCount = countInteriorPages(book, "a5");
    const pdf = await generateCoverSpreadPdf({
      title: book.title,
      cover: book.coverConfig,
      interiorPageCount,
      authors: bookAuthors(book.clueIdeas),
    });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cover-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof EmptyBookError) {
      return Response.json({ error: "Ajoutez au moins une grille." }, { status: 400 });
    }
    if (err instanceof MissingCoverPhotoError) {
      return Response.json({ error: "Ajoutez une photo de couverture." }, { status: 400 });
    }
    if (err instanceof MissingPhotoError) {
      return Response.json({ error: "Une photo du carnet est introuvable. Veuillez la retélécharger." }, { status: 400 });
    }
    console.error("Cover PDF generation failed:", err);
    return Response.json({ error: "Echec de la generation de la couverture." }, { status: 500 });
  }
}
