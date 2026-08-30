"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import type { PosterData } from "@/types/poster";

/** 50×70 cm poster preview + order intent (checkout not built yet → lead). */
export function PosterOrder({ poster }: { poster: PosterData }) {
  const [email, setEmail] = useState("");

  async function handleOrder() {
    if (!email.trim()) {
      toast.error("Indiquez votre email");
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: `poster-commande:${poster.code}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Email invalide");
      toast.success("Merci ! Nous vous recontactons pour finaliser votre poster.");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  // Scale the fixed-70px-cell grid to a framed 50×70 preview.
  const faceW = 360;
  const faceH = faceW * (700 / 500);
  const natural = poster.width * 70;
  const scale = (faceW - 48) / natural;

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div
        className="frame mx-auto flex flex-col bg-[#fff6ec] p-6"
        style={{ width: faceW, height: faceH }}
      >
        <div className="border-b-2 border-ink pb-2">
          <span className="font-display text-lg uppercase tracking-wide text-ink">
            {poster.title?.trim() || "Mots fléchés"}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center pt-4">
          <div style={{ width: faceW - 48, height: poster.height * 70 * scale, overflow: "hidden" }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: natural }}>
              <FlecheGrid
                cells={poster.cells}
                width={poster.width}
                height={poster.height}
                interactive={false}
              />
            </div>
          </div>
        </div>
        <p className="text-center font-condensed text-[10px] uppercase tracking-wide text-ink/40">
          Les Flèches · {poster.code}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="frame bg-background p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide text-ink">Le poster</h2>
          <p className="mt-2 font-serif text-sm italic text-ink/70">
            Votre grille {poster.width}×{poster.height} imprimée en 50 × 70 cm sur papier d&apos;art,
            prête à encadrer. Bientôt disponible : laissez votre email pour être prévenu·e.
          </p>
          <a
            href={`/api/posters/${poster.code}/poster.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-display text-sm uppercase tracking-wide text-brand underline"
          >
            Télécharger l&apos;aperçu PDF
          </a>
          <div className="mt-5 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="flex-1 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
            />
            <Button onClick={handleOrder} className="btn-lapos rounded-none bg-ink text-paper">
              Me prévenir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
