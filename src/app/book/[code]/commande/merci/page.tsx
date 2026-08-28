import Link from "next/link";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { formatEuros } from "@/lib/books/pricing";

/**
 * Post-checkout landing. Stripe redirects here with `?session_id=…`; we look the
 * session up to confirm payment and show the amount + email. The order itself is
 * recorded by the webhook, not here — this page is purely the customer's
 * reassurance screen, so it degrades to a generic thank-you if the lookup fails.
 */
export default async function CarnetMerciPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { code } = await params;
  const { session_id: sessionId } = await searchParams;

  let paid = false;
  let amount: number | null = null;
  let email: string | null = null;
  if (sessionId && isStripeConfigured()) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = s.payment_status === "paid";
      amount = s.amount_total ?? null;
      email = s.customer_details?.email ?? null;
    } catch {
      // Fall through to the generic thank-you.
    }
  }

  return (
    <main className="flex-1 px-4 py-16">
      <div className="mx-auto max-w-lg space-y-6 border-2 border-ink bg-card p-8 text-center shadow-[4px_4px_0_0] shadow-ink/80">
        <h1 className="font-heading text-3xl uppercase">Merci&nbsp;!</h1>
        {paid ? (
          <p className="text-sm leading-relaxed">
            Votre carnet est confirmé{amount ? ` (${formatEuros(amount)})` : ""} et part à
            l&apos;impression. Un email de confirmation
            {email ? ` a été envoyé à ${email}` : " vous a été envoyé"}, avec votre
            facture. Vous recevrez le suivi dès l&apos;expédition.
          </p>
        ) : (
          <p className="text-sm leading-relaxed">
            Nous avons bien reçu votre commande. Un email de confirmation vous
            parvient dans un instant, avec votre facture.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/book/${code}`}
            className="btn-lapos rounded-none bg-paper px-5 py-2.5 text-sm text-ink"
          >
            Revenir à mon carnet
          </Link>
          <Link
            href="/"
            className="btn-lapos rounded-none bg-ink px-5 py-2.5 text-sm text-paper"
          >
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
