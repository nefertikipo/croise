import { notFound } from "next/navigation";
import { loadBook } from "@/lib/books/serialize";
import { BookEditor } from "@/components/book/book-editor";

export default async function BookPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const book = await loadBook(code);

  if (!book) notFound();

  return <BookEditor code={code} initialBook={book} />;
}
