"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !token || linkError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !token) return;
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(res.error.message || "Le lien est invalide ou expiré.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/connexion"), 1500);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--ink)]">
        <h1 className="font-display text-3xl uppercase tracking-wide text-brand">
          Nouveau mot de passe
        </h1>

        {invalidLink ? (
          <div className="mt-5">
            <p className="border-2 border-brand bg-brand/10 px-3 py-2 font-sans text-sm text-brand">
              Ce lien est invalide ou a expiré. Demandez-en un nouveau.
            </p>
            <Link
              href="/connexion"
              className="btn-lapos mt-4 inline-flex w-full justify-center rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : done ? (
          <p className="mt-5 border-2 border-ink bg-paper px-3 py-3 font-sans text-sm text-ink">
            Mot de passe mis à jour. Redirection vers la connexion…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="font-display text-xs uppercase tracking-wide text-ink/70">
                Nouveau mot de passe
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="font-display text-xs uppercase tracking-wide text-ink/70">
                Confirmez
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-brand"
              />
            </label>
            {error && (
              <p className="border-2 border-brand bg-brand/10 px-3 py-2 font-sans text-sm text-brand">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-lapos w-full rounded-md bg-ink px-4 py-2.5 text-sm text-paper disabled:opacity-50"
            >
              {loading ? "…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
