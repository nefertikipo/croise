"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { PostcardPreview } from "@/components/postcard/postcard-card";
import { DEDICATION_FONTS } from "@/lib/books/dedication-fonts";
import { POSTCARD_GRID_WIDTH, POSTCARD_GRID_HEIGHT } from "@/lib/postcard-pdf/geometry";
import type { PostcardData } from "@/types/postcard";

interface CustomClue {
  answer: string;
  clue: string;
}

/**
 * Message fonts offered on a card. "hand" (Manuscrite / PatrickHand) is excluded
 * because public/fonts/PatrickHand-Regular.ttf is corrupt — most lowercase
 * glyphs are missing, so it renders "Mamie" as "M". (Same bug hits the book's
 * dedication picker; fix by replacing that TTF, then re-add "hand" here.)
 */
const MESSAGE_FONTS = DEDICATION_FONTS.filter((f) => f.key !== "hand");

/** A few on-brand accent colours for the grid's clue cells. */
const ACCENT_SWATCHES = [
  { hex: "#007cb8", label: "Bleu" },
  { hex: "#c1432f", label: "Rouge" },
  { hex: "#1f9d76", label: "Vert" },
  { hex: "#b8860b", label: "Or" },
  { hex: "#7a4fb0", label: "Violet" },
];

/**
 * The full "carte" creation flow: personalize the front title + back message,
 * seed a few custom words, generate the grid, preview both faces, and record an
 * order intent. Anonymous-friendly — the card is editable by its share code.
 */
export function PostcardCreator({ initialCard }: { initialCard?: PostcardData }) {
  const [card, setCard] = useState<PostcardData | null>(initialCard ?? null);
  const [title, setTitle] = useState(initialCard?.title ?? "");
  const [recipientName, setRecipientName] = useState(initialCard?.recipientName ?? "");
  const [message, setMessage] = useState(initialCard?.message ?? "");
  const [messageFont, setMessageFont] = useState(initialCard?.messageFont ?? MESSAGE_FONTS[0].key);
  const [gridColor, setGridColor] = useState(initialCard?.gridColor ?? ACCENT_SWATCHES[0].hex);
  const [customClues, setCustomClues] = useState<CustomClue[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const code = card?.code;

  // Live preview merges the current form fields with the (already generated) grid.
  const previewCard: PostcardData = {
    id: card?.id ?? "preview",
    code: code ?? "CARD-XXXXXXXX",
    title: title || null,
    recipientName: recipientName || null,
    message: message || null,
    messageFont,
    gridColor,
    status: card?.status ?? "draft",
    grid: card?.grid ?? null,
  };

  const fields = () => ({
    title: title || undefined,
    recipientName: recipientName || undefined,
    message: message || undefined,
    messageFont,
    gridColor,
  });

  /** Create the card if it doesn't exist yet, else persist the latest text. */
  async function ensureCard(): Promise<string> {
    if (!code) {
      const res = await fetch("/api/postcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Création impossible");
      const created = (await res.json()) as { code: string };
      return created.code;
    }
    const res = await fetch(`/api/postcards/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields()),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Mise à jour impossible");
    setCard((await res.json()) as PostcardData);
    return code;
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const validClues = customClues.filter((c) => c.answer.trim() && c.clue.trim());
      const cardCode = await ensureCard();
      const res = await fetch(`/api/postcards/${cardCode}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customClues: validClues }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Génération impossible");
      setCard((await res.json()) as PostcardData);
      toast.success(card?.grid ? "Nouvelle grille générée" : "Votre carte est prête !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveText() {
    setLoading(true);
    try {
      await ensureCard();
      toast.success("Texte enregistré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrder() {
    if (!email.trim()) {
      toast.error("Indiquez votre email");
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: `carte-commande:${code ?? "draft"}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Email invalide");
      toast.success("Merci ! Nous vous recontactons pour finaliser l'envoi.");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
      {/* Form */}
      <div className="flex flex-col gap-6">
        <div className="frame bg-background p-5">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink">Le recto</h2>
          <p className="mt-1 font-serif text-sm italic text-ink/60">
            Le titre et la grille de mots fléchés {POSTCARD_GRID_WIDTH}×{POSTCARD_GRID_HEIGHT}.
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/70">
            Titre
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Joyeux anniversaire"
            className="mt-1 w-full rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
          />

          <div className="mt-4">
            <span className="block text-xs font-bold uppercase tracking-wide text-ink/70">
              Couleur de la grille
            </span>
            <div className="mt-2 flex gap-2">
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  aria-label={s.label}
                  onClick={() => setGridColor(s.hex)}
                  className={`h-7 w-7 rounded-full border-2 ${gridColor === s.hex ? "border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <CustomWordsEditor
              width={POSTCARD_GRID_WIDTH}
              height={POSTCARD_GRID_HEIGHT}
              value={customClues}
              onChange={setCustomClues}
            />
          </div>
        </div>

        <div className="frame bg-background p-5">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink">Le verso</h2>
          <p className="mt-1 font-serif text-sm italic text-ink/60">
            Un mot doux et la solution de la grille.
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/70">
            Pour
          </label>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            maxLength={60}
            placeholder="Mamie"
            className="mt-1 w-full rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
          />
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/70">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Un petit jeu rien que pour toi…"
            className="mt-1 w-full rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
          />
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/70">
            Police du message
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {MESSAGE_FONTS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setMessageFont(f.key)}
                className={`border-2 px-3 py-1.5 text-sm ${f.className} ${messageFont === f.key ? "border-ink bg-gold/30" : "border-ink/30"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleGenerate} disabled={loading} className="btn-lapos rounded-none bg-brand text-brand-foreground">
            {loading ? "Génération…" : card?.grid ? "Régénérer la grille" : "Générer ma carte"}
          </Button>
          {card?.grid && (
            <Button onClick={handleSaveText} disabled={loading} variant="outline" className="rounded-none">
              Enregistrer le texte
            </Button>
          )}
        </div>
      </div>

      {/* Preview + order */}
      <div className="flex flex-col items-center gap-6">
        <PostcardPreview card={previewCard} faceW={260} />

        {card?.grid && (
          <div className="w-full max-w-sm frame bg-background p-5">
            <h3 className="font-display text-lg uppercase tracking-wide text-ink">Commander</h3>
            <p className="mt-1 font-serif text-sm italic text-ink/60">
              Carte A6 imprimée recto-verso, envoyée par la poste.
            </p>
            <a
              href={`/api/postcards/${code}/card.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-display text-sm uppercase tracking-wide text-brand underline"
            >
              Télécharger l&apos;aperçu PDF
            </a>
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="flex-1 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
              />
              <Button onClick={handleOrder} className="btn-lapos rounded-none bg-ink text-paper">
                Commander
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
