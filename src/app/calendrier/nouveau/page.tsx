import { CalendarCreator } from "@/components/calendar/calendar-creator";

export const metadata = {
  title: "Créer un calendrier de mots fléchés",
  description:
    "Un calendrier mural A3 : douze grilles de mots fléchés personnalisées, une par mois, à offrir pour toute l'année.",
};

export default function NouveauCalendrierPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">Le calendrier</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-brand">
          Douze mois, douze grilles
        </h1>
        <p className="mt-2 max-w-2xl font-serif text-sm italic text-ink/70">
          Un calendrier mural A3 relié spirale : une grille de mots fléchés à résoudre chaque mois,
          personnalisée avec vos mots. Un cadeau pour toute l&apos;année.
        </p>
      </header>
      <CalendarCreator />
    </main>
  );
}
