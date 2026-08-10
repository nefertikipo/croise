import { PostcardCreator } from "@/components/postcard/postcard-creator";

export const metadata = {
  title: "Créer une carte de mots fléchés",
  description:
    "Une grille de mots fléchés personnalisée imprimée sur une carte postale A6, avec votre message au dos. Prête à offrir.",
};

export default function NouvelleCartePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">La carte</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-brand">
          Une carte rien que pour elle·lui
        </h1>
        <p className="mt-2 max-w-2xl font-serif text-sm italic text-ink/70">
          Une grille de mots fléchés personnalisée sur une carte postale A6, votre message au
          dos. Imprimée et envoyée par la poste.
        </p>
      </header>
      <PostcardCreator />
    </main>
  );
}
