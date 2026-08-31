import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { getSeller } from "@/lib/billing/seller";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du site Les Flèches : éditeur, hébergeur et contact.",
};

const UPDATED = "31 août 2026";

export default function MentionsLegalesPage() {
  const seller = getSeller();
  const configured = Boolean(seller.legalName && seller.siret);

  return (
    <LegalShell kicker="Informations" title="Mentions légales" updated={UPDATED}>
      <LegalSection title="Éditeur du site">
        {configured ? (
          <p>
            Le site lesfleches.com est édité par{" "}
            <strong>{seller.legalName}</strong>, entrepreneur individuel
            (micro-entreprise), immatriculé sous le numéro SIRET{" "}
            {seller.siret}, dont l&apos;adresse est{" "}
            {seller.addressLines.join(", ")}.
          </p>
        ) : (
          <p>
            Le site lesfleches.com est édité par un entrepreneur individuel
            (micro-entreprise). Les informations d&apos;identification sont en
            cours de mise à jour ; pour toute question, écrivez-nous à
            l&apos;adresse ci-dessous.
          </p>
        )}
        <p>
          Directeur de la publication :{" "}
          {configured ? seller.legalName : "l'éditeur du site"}.
        </p>
        <p>{seller.vatMention}.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email :{" "}
          <a className="underline" href={`mailto:${seller.email}`}>
            {seller.email}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut,
          CA 91789, États-Unis (
          <a className="underline" href="https://vercel.com" rel="noreferrer">
            vercel.com
          </a>
          ). Les données sont stockées par Neon Inc. (base de données
          Postgres).
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La structure du site, ses textes, son identité visuelle et le
          générateur de grilles sont protégés par le droit d&apos;auteur. Les
          contenus que vous créez dans vos grilles et carnets (mots, indices,
          dédicaces, photos) restent votre propriété ; vous garantissez
          disposer des droits nécessaires sur les photos et textes que vous
          importez.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement de vos données est décrit dans notre{" "}
          <Link className="underline" href="/confidentialite">
            politique de confidentialité
          </Link>
          . Le site n&apos;utilise que des cookies essentiels (session de
          connexion), sans traceur publicitaire.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
