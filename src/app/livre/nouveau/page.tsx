import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CreationWizard } from "@/components/book/creation-wizard";

export const metadata = {
  title: "Créer un livre - Les Flèches",
};

// Session-gated; never cache.
export const dynamic = "force-dynamic";

/**
 * Guided book-creation wizard: recipient → personal words → hidden message →
 * difficulty, then the book is created and its grids auto-generate in the
 * editor. Book creation is account-only, so anonymous visitors sign in first
 * and come straight back.
 */
export default async function NewBookPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion?redirect=/livre/nouveau");

  return <CreationWizard />;
}
