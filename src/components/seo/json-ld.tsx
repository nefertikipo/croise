import type { Thing, WithContext } from "schema-dts";

// Renders a JSON-LD <script>. Kept tiny and reusable across page types.
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
