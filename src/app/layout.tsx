import type { Metadata } from "next";
import { Inter, Fraunces, Anton, Oswald, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/shared/site-chrome";
import { SanityLive } from "@/sanity/lib/live";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Condensed face for clue text: fits far more of a long French definition per
// line than Inter, and matches the mots fléchés magazine look.
const condensed = Oswald({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Fallback for the display face: Anton covers glyphs our custom "Fléchés
// Display" font lacks (digits, punctuation). The custom face — a wide Art-Deco
// poster font derived from "Dylan Dog" with hand-built French accents — is
// declared via @font-face in globals.css and layered on top of this in
// --font-display. See .context/build-fleches-display-font.py.
const display = Anton({
  variable: "--font-anton",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

// Serif accent: Fraunces (italic) stands in for Lapo's body serif "Calendula
// Demi" — used for product-style descriptions and testimonials.
const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const handwritten = Patrick_Hand({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Les Flèches — Mots fléchés et mots croisés personnalisés",
    template: "%s · Les Flèches",
  },
  description:
    "Créez des mots fléchés et mots croisés personnalisés avec vos propres mots — une idée cadeau originale, imprimée et prête à offrir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${display.variable} ${serif.variable} ${handwritten.variable} ${condensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteChrome />
        {children}
        <SanityLive />
      </body>
    </html>
  );
}
