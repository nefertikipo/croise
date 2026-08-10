import { notFound } from "next/navigation";
import { loadCalendar } from "@/lib/calendars/serialize";
import { CalendarCreator } from "@/components/calendar/calendar-creator";

export const metadata = {
  title: "Mon calendrier de mots fléchés",
};

export const dynamic = "force-dynamic";

export default async function CalendrierPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const calendar = await loadCalendar(code);
  if (!calendar) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">Le calendrier</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-brand">
          {calendar.title?.trim() || "Mon calendrier"} {calendar.year}
        </h1>
        <p className="mt-2 font-serif text-sm italic text-ink/70">Code : {calendar.code}</p>
      </header>
      <CalendarCreator initialCalendar={calendar} />
    </main>
  );
}
