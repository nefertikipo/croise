import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { getSeller } from "@/lib/billing/seller";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment Les Flèches collecte, utilise et protège vos données personnelles.",
};

const UPDATED = "31 août 2026";

export default function ConfidentialitePage() {
  const seller = getSeller();

  return (
    <LegalShell
      kicker="Vos données"
      title="Politique de confidentialité"
      updated={UPDATED}
    >
      <LegalSection title="Responsable de traitement">
        <p>
          Le responsable du traitement est l&apos;éditeur du site (voir les{" "}
          <Link className="underline" href="/mentions-legales">
            mentions légales
          </Link>
          ), joignable à{" "}
          <a className="underline" href={`mailto:${seller.email}`}>
            {seller.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <p>Nous collectons uniquement ce qui est nécessaire au service :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Compte</strong> : email et mot de passe (haché), ou
            connexion Google. Finalité : accéder à vos grilles et carnets.
            Base légale : exécution du contrat.
          </li>
          <li>
            <strong>Contenu créé</strong> : mots, indices, dédicaces et photos
            de vos carnets. Finalité : composer et imprimer votre carnet. Base
            légale : exécution du contrat.
          </li>
          <li>
            <strong>Commande</strong> : nom, adresse de livraison, téléphone,
            email, montant payé. Finalité : encaissement, facturation,
            impression et livraison. Bases légales : exécution du contrat et
            obligations légales (comptabilité).
          </li>
          <li>
            <strong>Emails de service</strong> : confirmations de commande,
            réinitialisation de mot de passe. Base légale : exécution du
            contrat.
          </li>
        </ul>
        <p>
          Nous ne vendons aucune donnée et n&apos;affichons aucune publicité.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Stripe</strong> (paiement) : traite vos données bancaires ;
            aucun numéro de carte ne transite par nos serveurs.
          </li>
          <li>
            <strong>Lulu</strong> (impression et expédition) : reçoit nom,
            adresse, téléphone et email de livraison, ainsi que les fichiers du
            carnet à imprimer.
          </li>
          <li>
            <strong>Resend</strong> (envoi d&apos;emails transactionnels).
          </li>
          <li>
            <strong>Vercel</strong> (hébergement du site) et{" "}
            <strong>Neon</strong> (base de données).
          </li>
          <li>
            <strong>Google</strong> (connexion optionnelle avec un compte
            Google).
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont établis aux États-Unis ; les
          transferts sont encadrés par des clauses contractuelles types ou le
          Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Compte et contenu créé : tant que le compte est actif, puis
            supprimés à votre demande.
          </li>
          <li>
            Factures et données de commande : 10 ans (obligation comptable).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez des droits d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de
          portabilité sur vos données. Pour les exercer, écrivez à{" "}
          <a className="underline" href={`mailto:${seller.email}`}>
            {seller.email}
          </a>
          . Vous pouvez aussi adresser une réclamation à la CNIL (
          <a className="underline" href="https://www.cnil.fr" rel="noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site n&apos;utilise que des cookies strictement nécessaires au
          fonctionnement (session de connexion, sécurité). Aucun cookie
          publicitaire ni traceur tiers n&apos;est déposé ; c&apos;est
          pourquoi aucun bandeau de consentement n&apos;est affiché.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
