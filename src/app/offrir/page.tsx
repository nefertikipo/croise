"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    kicker: "Chaque mois",
    title: "Une grille fraîche",
    body: "Une nouvelle grille de mots fléchés personnalisée, livrée le premier de chaque mois.",
  },
  {
    kicker: "Vos souvenirs",
    title: "Toujours vos mots",
    body: "Prénoms, dates, clins d'œil : chaque grille puise dans vos mots et vos messages cachés.",
  },
  {
    kicker: "Prête à offrir",
    title: "Reliée en fin d'année",
    body: "Les douze grilles se regroupent en un joli livret — un cadeau qui dure toute l'année.",
  },
];

export default function OffrirPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex-1">
      {/* Intro */}
      <section className="border-b-2 border-ink bg-gold/25">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
            Bientôt disponible
          </p>
          <h1 className="mt-3 text-5xl text-ink sm:text-6xl">
            Offrir chaque mois
          </h1>
          <p className="font-serif-accent mx-auto mt-4 max-w-xl text-lg italic text-ink/80">
            Un abonnement-cadeau : une nouvelle grille personnalisée dans la
            boîte aux lettres de la personne que vous aimez, chaque mois de
            l&apos;année.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="frame flex flex-col bg-background p-6">
                <div className="font-display text-xs uppercase tracking-[0.2em] text-brand">
                  {s.kicker}
                </div>
                <h3 className="mt-2 text-2xl text-ink">{s.title}</h3>
                <p className="font-serif-accent mt-3 flex-1 text-[15px] italic leading-snug text-ink/75">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-b-2 border-ink bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center">
          <h2 className="text-4xl text-brand-foreground sm:text-5xl">
            Soyez prévenu·e au lancement
          </h2>
          {submitted ? (
            <p className="font-serif-accent text-lg italic text-brand-foreground">
              Merci ! On vous écrit dès que l&apos;abonnement ouvre. ♡
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSubmitted(true);
              }}
              className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="frame-tight flex-1 rounded-none bg-paper px-4 py-3 text-ink placeholder:text-ink/40 focus:outline-none"
              />
              <button
                type="submit"
                className="btn-lapos rounded-none bg-ink px-6 py-3 text-sm text-paper"
              >
                Prévenez-moi
              </button>
            </form>
          )}
          <Link
            href="/fleche"
            className="btn-lapos rounded-none bg-paper px-7 py-3 text-sm text-ink"
          >
            En attendant, créer une grille
          </Link>
        </div>
      </section>
    </main>
  );
}
