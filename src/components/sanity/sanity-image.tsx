import Image from "next/image";

import { urlFor } from "@/sanity/lib/image";

export type SanityImageValue = {
  asset?: { _ref?: string };
  _ref?: string;
  alt?: string;
};

// Sanity encodes the original pixel dimensions in the asset ref
// (image-<hash>-1200x800-jpg), so we can feed next/image a correct aspect ratio
// without a separate metadata fetch.
function parseDimensions(ref?: string): { width: number; height: number } | null {
  if (!ref) return null;
  const match = ref.match(/-(\d+)x(\d+)-/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

type SanityImageProps = {
  value?: SanityImageValue | null;
  alt?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** Target render width in px (defaults to the source width, capped at 1600). */
  width?: number;
};

export function SanityImage({
  value,
  alt,
  sizes = "(max-width: 768px) 100vw, 768px",
  className,
  priority,
  width,
}: SanityImageProps) {
  const ref = value?.asset?._ref ?? value?._ref;
  const dimensions = parseDimensions(ref);
  if (!value || !dimensions) return null;

  const targetWidth = Math.min(width ?? dimensions.width, 1600);
  const targetHeight = Math.round((dimensions.height / dimensions.width) * targetWidth);

  return (
    <Image
      src={urlFor(value).width(targetWidth).height(targetHeight).fit("max").url()}
      alt={alt ?? value.alt ?? ""}
      width={targetWidth}
      height={targetHeight}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
