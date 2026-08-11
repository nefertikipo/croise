"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { PostcardPreview } from "@/components/postcard/postcard-card";
import { DEDICATION_FONTS } from "@/lib/books/dedication-fonts";
import { POSTCARD_GRID_WIDTH, POSTCARD_GRID_HEIGHT } from "@/lib/postcard-pdf/geometry";
import type { PostcardData, PostcardDelivery } from "@/types/postcard";

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

/** Shared styling for the shipping-address inputs. */
const ADDR_INPUT = "rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm";

/**
 * Paid checkout is OFF until payment is wired (see the order endpoint's forced
 * "draft"). Until then the order section is a waitlist CTA. Flip
 * NEXT_PUBLIC_POSTCARD_CHECKOUT=true once Stripe is in place to reveal the
 * address form + real order.
 */
const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_POSTCARD_CHECKOUT === "true";

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
  const [delivery, setDelivery] = useState<PostcardDelivery>("direct");
  const [customClues, setCustomClues] = useState<CustomClue[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    postCode: "",
    city: "",
    country: "FR",
    email: "",
    phone: "",
  });
  const [ordering, setOrdering] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const setField =
    (key: keyof typeof address) => (e: ChangeEvent<HTMLInputElement>) =>
      setAddress((a) => ({ ...a, [key]: e.target.value }));

  const code = card?.code;

  // Live preview merges the current form fields with the (already generated) grid.
  const previewCard: PostcardData = {
    id: card?.id ?? "preview",
    code: code ?? "CARD-XXXXXXXX",
    title: title || null,
    recipientName: recipientName || null,
    message: message || null,
    messageFont,
    gridColor: card?.gridColor ?? null,
    status: card?.status ?? "draft",
    grid: card?.grid ?? null,
  };

  const fields = () => ({
    title: title || undefined,
    recipientName: recipientName || undefined,
    message: message || undefined,
    messageFont,
  });

  /** Create the card if it doesn't exist yet, else persist the latest text. */
  async function ensureCard(): Promise<string> {
    if (!code) {
      const res = await fetch("/api/postcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      // Creating a card requires an account — send anonymous makers to sign in,
      // then back to where they were.
      if (res.status === 401) {
        window.location.href = `/connexion?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        throw new Error("Connectez-vous pour créer une carte.");
      }
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
    const required: (keyof typeof address)[] = [
      "firstName",
      "lastName",
      "addressLine1",
      "postCode",
      "city",
      "email",
    ];
    if (required.some((k) => !address[k].trim())) {
      toast.error("Complétez l'adresse et l'email");
      return;
    }
    if (!code) return;
    setOrdering(true);
    try {
      const res = await fetch(`/api/postcards/${code}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery, quantity: 1, address }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Commande impossible");
      setPlaced(true);
      toast.success("Commande enregistrée !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setOrdering(false);
    }
  }

  /** Waitlist signup — the shipped CTA until paid checkout is enabled. */
  async function handleJoinWaitlist() {
    if (!waitlistEmail.trim()) {
      toast.error("Indiquez votre email");
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistEmail.trim(),
          source: `carte-waitlist:${code ?? "draft"}`,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Email invalide");
      setJoined(true);
      toast.success("Vous êtes sur la liste !");
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
            Le mot au dos et la solution de la grille.
          </p>

          {/* How the card is sent — determines what gets printed on the back. */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDelivery("self")}
              className={`border-2 p-3 text-left ${delivery === "self" ? "border-ink bg-gold/30" : "border-ink/30"}`}
            >
              <span className="block text-sm font-bold text-ink">Je l&apos;envoie moi-même</span>
              <span className="mt-0.5 block font-serif text-xs italic text-ink/60">
                Verso vierge, vous écrivez le mot à la main et postez la carte.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDelivery("direct")}
              className={`border-2 p-3 text-left ${delivery === "direct" ? "border-ink bg-gold/30" : "border-ink/30"}`}
            >
              <span className="block text-sm font-bold text-ink">Envoi direct</span>
              <span className="mt-0.5 block font-serif text-xs italic text-ink/60">
                On imprime votre message et on l&apos;envoie au destinataire.
              </span>
            </button>
          </div>

          {delivery === "direct" ? (
            <>
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
            </>
          ) : (
            <p className="mt-4 font-serif text-sm italic text-ink/60">
              Le dos de la carte est laissé vierge (lignes légères) pour votre mot
              manuscrit. La carte vous est envoyée, prête à poster.
            </p>
          )}
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
        <PostcardPreview card={previewCard} faceW={260} delivery={delivery} />

        {card?.grid && (
          <div className="w-full max-w-sm frame bg-background p-5">
            <h3 className="font-display text-lg uppercase tracking-wide text-ink">
              {CHECKOUT_ENABLED ? "Commander" : "Bientôt disponible"}
            </h3>
            <p className="mt-1 font-serif text-sm italic text-ink/60">
              {delivery === "self"
                ? "Carte A6 imprimée, envoyée chez vous, prête à poster."
                : "Carte A6 imprimée recto-verso, envoyée au destinataire par la poste."}
            </p>
            <a
              href={`/api/postcards/${code}/card.pdf?mode=${delivery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-display text-sm uppercase tracking-wide text-brand underline"
            >
              Télécharger l&apos;aperçu PDF
            </a>

            {!CHECKOUT_ENABLED ? (
              // Waitlist CTA — payment isn't wired yet, so we collect interest.
              joined ? (
                <div className="mt-4 border-2 border-ink bg-gold/20 p-4">
                  <p className="font-display text-sm uppercase tracking-wide text-ink">Merci !</p>
                  <p className="mt-1 font-serif text-sm italic text-ink/70">
                    Vous êtes sur la liste. On vous écrit dès l&apos;ouverture des commandes.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-4 font-serif text-sm italic text-ink/60">
                    Les commandes ouvrent bientôt. Laissez votre email pour être prévenu·e en
                    premier.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="votre@email.fr"
                      className={`flex-1 ${ADDR_INPUT}`}
                    />
                    <Button onClick={handleJoinWaitlist} className="btn-lapos rounded-none bg-ink text-paper">
                      Rejoindre
                    </Button>
                  </div>
                </>
              )
            ) : placed ? (
              <div className="mt-4 border-2 border-ink bg-gold/20 p-4">
                <p className="font-display text-sm uppercase tracking-wide text-ink">Merci !</p>
                <p className="mt-1 font-serif text-sm italic text-ink/70">
                  Votre commande est enregistrée. Vous recevrez un email de confirmation.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink/70">
                  {delivery === "self" ? "Votre adresse" : "Adresse du destinataire"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input value={address.firstName} onChange={setField("firstName")} placeholder="Prénom" className={ADDR_INPUT} />
                  <input value={address.lastName} onChange={setField("lastName")} placeholder="Nom" className={ADDR_INPUT} />
                  <input value={address.addressLine1} onChange={setField("addressLine1")} placeholder="Adresse" className={`col-span-2 ${ADDR_INPUT}`} />
                  <input value={address.addressLine2} onChange={setField("addressLine2")} placeholder="Complément (optionnel)" className={`col-span-2 ${ADDR_INPUT}`} />
                  <input value={address.postCode} onChange={setField("postCode")} placeholder="Code postal" className={ADDR_INPUT} />
                  <input value={address.city} onChange={setField("city")} placeholder="Ville" className={ADDR_INPUT} />
                  <input type="email" value={address.email} onChange={setField("email")} placeholder="Email de confirmation" className={`col-span-2 ${ADDR_INPUT}`} />
                </div>
                <Button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="btn-lapos mt-3 w-full rounded-none bg-ink text-paper"
                >
                  {ordering ? "Commande…" : "Commander"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
