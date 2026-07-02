import type { Metadata } from "next";
import { Inter, Patrick_Hand, Anton } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/shared/nav";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const handwritten = Patrick_Hand({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: "400",
});

const heading = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Les Fleches - Mots fleches personnalises",
  description: "Creez des grilles de mots fleches personnalisees avec vos propres mots. Exportez en PDF pret a imprimer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${handwritten.variable} ${heading.variable} h-full antialiased bg-background text-foreground`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
