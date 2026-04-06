import Link from "next/link";
import { GridBackground } from "@/components/shared/grid-background";

export default function Home() {
  return (
    <GridBackground>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 min-h-screen">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          {/* Logo / Title */}
          <div className="space-y-3">
            <h1
              className="text-6xl sm:text-8xl tracking-tight uppercase"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              Les Fleches
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Creez des grilles de mots fleches personnalisees.
              Glissez vos propres mots, imprimez, offrez.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/fleche"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-medium px-8 h-12 hover:bg-primary/80 transition-colors"
            >
              Creer une grille
            </Link>
            <Link
              href="/fleche"
              className="inline-flex items-center justify-center rounded-lg border border-primary/20 text-lg font-medium px-8 h-12 hover:bg-muted transition-colors"
            >
              Creer un livre
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 text-left max-w-xl mx-auto">
            <div className="space-y-1">
              <div className="font-bold text-xl">Vos mots</div>
              <div className="text-sm text-muted-foreground">
                Prenoms, surnoms, souvenirs, blagues internes
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-xl">Mot cache</div>
              <div className="text-sm text-muted-foreground">
                Un mot secret dissimule dans la grille
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-xl">Pret a imprimer</div>
              <div className="text-sm text-muted-foreground">
                PDF avec solution au verso, format livre
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="pt-8 space-y-6 max-w-lg mx-auto text-left">
            <h2 className="text-2xl font-bold text-center">Comment ca marche</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <div className="font-medium">Ajoutez vos mots personnalises</div>
                  <div className="text-sm text-muted-foreground">Noms, lieux, dates, tout ce qui compte pour vous</div>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <div className="font-medium">La grille se genere autour de vos mots</div>
                  <div className="text-sm text-muted-foreground">Notre moteur remplit le reste avec de vrais indices de mots fleches</div>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <div className="font-medium">Imprimez ou creez un livre entier</div>
                  <div className="text-sm text-muted-foreground">PDF pret a offrir, solution au verso de chaque grille</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </GridBackground>
  );
}
