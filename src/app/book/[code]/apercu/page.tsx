import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadBook } from "@/lib/books/serialize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import { OrderPreview } from "@/components/book/order-preview";

/**
 * "Aperçu avant commande": the exact print files (cover spread + interior),
 * rendered for proofing before ordering. Doubles as the customer's explicit
 * "j'ai vérifié mon livre" step, which the future checkout will require.
 */
export default async function BookPreviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const book = await loadBook(code);
  if (!book) notFound();

  const gridCount = book.pages.filter((p) => p.kind === "grid").length;
  // Nothing to proof without grids — back to the editor.
  if (gridCount === 0) redirect(`/book/${code}`);

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <OrderPreview
      code={code}
      title={book.title}
      gridCount={gridCount}
      interiorPages={interiorPageCountForCapacity(book)}
      hasCoverPhoto={Boolean(book.coverConfig?.design?.photoRef)}
      sessionEmail={session?.user?.email ?? null}
    />
  );
}
