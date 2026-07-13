import { loadBook } from "@/lib/books/serialize";
import { generateCoverPdf, MissingCoverPhotoError } from "@/lib/book-pdf/generate-cover";

/** GET the print-ready cover PDF for a book. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const book = await loadBook(code);
    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    const pdf = await generateCoverPdf({ title: book.title, cover: book.coverConfig });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cover-${code}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof MissingCoverPhotoError) {
      return Response.json({ error: "Ajoutez une photo de couverture." }, { status: 400 });
    }
    console.error("Cover PDF generation failed:", err);
    return Response.json({ error: "Echec de la generation de la couverture." }, { status: 500 });
  }
}
