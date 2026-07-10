import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd } from "@/lib/seo/structured-data";

export type FaqItem = {
  _id?: string;
  question: string;
  answer?: string | null;
};

// Renders visible FAQ content AND the FAQPage structured data from the same
// source — the visible answers and the machine-readable ones can never drift.
export function FaqSection({
  faqs,
  title = "Questions fréquentes",
}: {
  faqs?: FaqItem[] | null;
  title?: string;
}) {
  const items = (faqs ?? []).filter((f) => f.question && f.answer);
  if (!items.length) return null;

  const jsonLd = faqPageJsonLd(items);

  return (
    <section className="mx-auto mt-16 max-w-3xl">
      <h2 className="text-3xl text-ink sm:text-4xl">{title}</h2>
      <dl className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
        {items.map((faq, index) => (
          <div key={faq._id ?? index} className="py-5">
            <dt className="text-xl text-ink">{faq.question}</dt>
            <dd className="mt-2 text-lg leading-relaxed text-ink/75">{faq.answer}</dd>
          </div>
        ))}
      </dl>
      {jsonLd && <JsonLd data={jsonLd} />}
    </section>
  );
}
