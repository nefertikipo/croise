import { loadBook } from "@/lib/books/serialize";
import { generateBackCoverPdf } from "@/lib/book-pdf/compose-back-cover";

/** GET the print-ready back cover PDF for a book. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const book = await loadBook(code);
    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    const pdf = await generateBackCoverPdf({ title: book.title, code: book.code, cover: book.coverConfig });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dos-${code}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Back cover PDF generation failed:", err);
    return Response.json({ error: "Echec de la generation du dos." }, { status: 500 });
  }
}
