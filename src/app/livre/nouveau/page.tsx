import { CreationWizard } from "@/components/book/creation-wizard";

export const metadata = {
  title: "Créer un carnet - Les Flèches",
};

/**
 * Guided book-creation wizard: recipient → personal words → hidden message →
 * difficulty, then the book is created and its grids auto-generate in the
 * editor. Deferred auth — anyone can build a carnet anonymously and sign in
 * later (to save, invite, or order); no login wall at the front.
 */
export default function NewBookPage() {
  return <CreationWizard />;
}
