import Link from "next/link";
import { PortableText, type PortableTextComponents } from "next-sanity";
import type { PortableTextBlock } from "sanity";

import { SanityImage, type SanityImageValue } from "@/components/sanity/sanity-image";

type CalloutValue = { tone?: "key" | "tip" | "info"; text?: string };
type CtaValue = { label?: string; href?: string; variant?: "primary" | "secondary" };
type LinkMark = { href?: string };

const CALLOUT_LABELS: Record<NonNullable<CalloutValue["tone"]>, string> = {
  key: "À retenir",
  tip: "Astuce",
  info: "Bon à savoir",
};

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="my-4 text-lg leading-relaxed text-ink/85">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-12 mb-4 text-3xl text-ink sm:text-4xl">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 text-2xl text-ink">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-brand pl-4 font-serif-accent text-xl italic text-ink/75">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 text-lg text-ink/85">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 text-lg text-ink/85">{children}</ol>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = (value as LinkMark)?.href ?? "#";
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return (
          <Link href={href} className="text-brand underline underline-offset-2">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          rel="noreferrer noopener"
          target="_blank"
          className="text-brand underline underline-offset-2"
        >
          {children}
        </a>
      );
    },
  },
  types: {
    pteImage: ({ value }) => {
      const image = value as SanityImageValue & { caption?: string };
      return (
        <figure className="my-8">
          <SanityImage value={image} alt={image.alt} className="w-full rounded-md" />
          {image.caption && (
            <figcaption className="mt-2 text-center font-serif-accent text-sm italic text-ink/60">
              {image.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    callout: ({ value }) => {
      const { tone = "key", text } = value as CalloutValue;
      return (
        <aside className="frame my-8 bg-gold/20 p-6">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-brand">
            {CALLOUT_LABELS[tone]}
          </p>
          <p className="mt-2 text-lg leading-relaxed text-ink">{text}</p>
        </aside>
      );
    },
    cta: ({ value }) => {
      const { label, href = "#", variant = "primary" } = value as CtaValue;
      return (
        <div className="my-8">
          <Link
            href={href}
            className={`btn-lapos inline-block rounded-md px-7 py-3 text-base ${
              variant === "primary"
                ? "bg-brand text-brand-foreground"
                : "bg-paper text-ink"
            }`}
          >
            {label}
          </Link>
        </div>
      );
    },
  },
};

export function PortableTextBody({ value }: { value?: PortableTextBlock[] | null }) {
  if (!value?.length) return null;
  return <PortableText value={value} components={components} />;
}
