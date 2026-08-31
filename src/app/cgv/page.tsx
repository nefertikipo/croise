import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { getSeller } from "@/lib/billing/seller";
import { CARNET_PRICE_CENTS, formatEuros } from "@/lib/books/pricing";
import {
  CARNET_SHIPPING_OPTIONS,
  CARNET_ALLOWED_COUNTRIES,
} from "@/lib/books/shipping";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente du carnet de mots fléchés personnalisé Les Flèches : prix, livraison, garanties.",
};

const UPDATED = "31 août 2026";

/** "FR" → "France", in French, for the delivery-zone list. */
function countryNames(): string {
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  return CARNET_ALLOWED_COUNTRIES.map((c) => names.of(c) ?? c).join(", ");
}

export default function CgvPage() {
  const seller = getSeller();
  const configured = Boolean(seller.legalName && seller.siret);
  const standard = CARNET_SHIPPING_OPTIONS.find((o) => o.key === "standard")!;
  const express = CARNET_SHIPPING_OPTIONS.find((o) => o.key === "express")!;

  return (
    <LegalShell
      kicker="Conditions"
      title="Conditions générales de vente"
      updated={UPDATED}
    >
      <LegalSection title="1. Objet et vendeur">
        <p>
          Les présentes conditions générales de vente (CGV) régissent la vente
          du carnet de mots fléchés personnalisé proposé sur lesfleches.com.
          Toute commande implique leur acceptation sans réserve.
        </p>
        {configured ? (
          <p>
            Vendeur : <strong>{seller.legalName}</strong>, entrepreneur
            individuel, SIRET {seller.siret},{" "}
            {seller.addressLines.join(", ")} ; contact :{" "}
            <a className="underline" href={`mailto:${seller.email}`}>
              {seller.email}
            </a>
            .
          </p>
        ) : (
          <p>
            Vendeur : l&apos;éditeur du site (voir les{" "}
            <Link className="underline" href="/mentions-legales">
              mentions légales
            </Link>
            ) ; contact :{" "}
            <a className="underline" href={`mailto:${seller.email}`}>
              {seller.email}
            </a>
            .
          </p>
        )}
      </LegalSection>

      <LegalSection title="2. Produit">
        <p>
          Le carnet est un livre de mots fléchés et mots croisés entièrement
          personnalisé, composé par le client sur le site (grilles, mots,
          indices, dédicace, photos), puis imprimé à la demande et relié.
          L&apos;intérieur est imprimé en noir et blanc ; la couverture est en
          couleur. Le nombre de pages dépend du contenu composé par le client
          et est affiché avant la commande.
        </p>
        <p>
          Avant tout paiement, le client accède à un aperçu fidèle des
          fichiers exacts envoyés à l&apos;impression et confirme avoir
          vérifié son carnet. Le carnet est imprimé tel quel : le client est
          responsable du contenu qu&apos;il a composé (orthographe des mots et
          indices, choix des photos, textes de dédicace).
        </p>
      </LegalSection>

      <LegalSection title="3. Prix">
        <p>
          Le prix du carnet est de{" "}
          <strong>{formatEuros(CARNET_PRICE_CENTS)}</strong>, impression et
          livraison standard incluses. {seller.vatMention}. La livraison
          express est proposée en option ; son supplément dépend du pays de
          destination et est affiché avant paiement.
        </p>
        <p>
          Le prix applicable est celui affiché au moment de la commande. Le
          vendeur peut modifier ses prix à tout moment pour les commandes
          futures.
        </p>
      </LegalSection>

      <LegalSection title="4. Commande et paiement">
        <p>
          Le paiement s&apos;effectue en ligne par carte bancaire via Stripe,
          prestataire de paiement sécurisé. Aucune donnée de carte ne transite
          par nos serveurs. La commande est ferme une fois le paiement
          confirmé ; le client reçoit alors un email de confirmation valant
          facture.
        </p>
      </LegalSection>

      <LegalSection title="5. Livraison">
        <p>
          Le carnet est imprimé à la demande par notre partenaire
          d&apos;impression puis expédié à l&apos;adresse indiquée lors de la
          commande. Zones de livraison : {countryNames()}.
        </p>
        <p>
          Délais indicatifs, impression comprise : livraison standard{" "}
          {standard.minDays} à {standard.maxDays} jours ouvrés ; livraison
          express {express.minDays} à {express.maxDays} jours ouvrés. Un
          retard raisonnable d&apos;impression ou d&apos;acheminement ne peut
          donner lieu à annulation qu&apos;après mise en demeure restée sans
          effet, conformément à l&apos;article L216-6 du Code de la
          consommation.
        </p>
      </LegalSection>

      <LegalSection title="6. Droit de rétractation">
        <p>
          Le carnet est un bien confectionné selon les spécifications du
          client et nettement personnalisé. Conformément à l&apos;article
          L221-28 3° du Code de la consommation,{" "}
          <strong>
            le droit de rétractation de 14 jours ne s&apos;applique pas
          </strong>{" "}
          à ce produit. Le client en est informé avant la commande et
          l&apos;accepte en commandant.
        </p>
      </LegalSection>

      <LegalSection title="7. Garanties légales et défauts">
        <p>
          Le vendeur reste tenu de la garantie légale de conformité (articles
          L217-3 et suivants du Code de la consommation) et de la garantie des
          vices cachés (articles 1641 et suivants du Code civil).
        </p>
        <p>
          Si le carnet arrive endommagé ou présente un défaut
          d&apos;impression ou de reliure, contactez-nous à{" "}
          <a className="underline" href={`mailto:${seller.email}`}>
            {seller.email}
          </a>{" "}
          avec des photos du défaut : le carnet est réimprimé et réexpédié
          sans frais, ou remboursé. Les erreurs présentes dans le contenu
          composé et validé par le client (fautes de frappe, photos choisies)
          ne constituent pas un défaut de conformité.
        </p>
      </LegalSection>

      <LegalSection title="8. Réclamations et médiation">
        <p>
          Toute réclamation peut être adressée à{" "}
          <a className="underline" href={`mailto:${seller.email}`}>
            {seller.email}
          </a>
          . Conformément aux articles L612-1 et suivants du Code de la
          consommation, le client consommateur peut recourir gratuitement à un
          médiateur de la consommation ; les coordonnées du médiateur
          compétent sont communiquées sur demande. Le client peut également
          utiliser la plateforme européenne de règlement en ligne des litiges
          :{" "}
          <a
            className="underline"
            href="https://ec.europa.eu/consumers/odr"
            rel="noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Contenu du client">
        <p>
          Le client garantit disposer de tous les droits sur les photos et
          textes qu&apos;il intègre à son carnet et que ce contenu ne porte
          atteinte à aucun droit de tiers. Le vendeur peut refuser
          d&apos;imprimer un contenu manifestement illicite.
        </p>
      </LegalSection>

      <LegalSection title="10. Données personnelles et droit applicable">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link className="underline" href="/confidentialite">
            politique de confidentialité
          </Link>
          . Les présentes CGV sont soumises au droit français.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
