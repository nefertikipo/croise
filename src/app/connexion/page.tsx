"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, requestPasswordReset } from "@/lib/auth-client";

type Mode = "signin" | "signup" | "forgot";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/mes-grilles";

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === "signup"
          ? await signUp.email({ name: name.trim() || email, email, password })
          : await signIn.email({ email, password });
      if (res.error) {
        setError(
          res.error.message ||
            (mode === "signup"
              ? "Impossible de créer le compte."
              : "Identifiants incorrects."),
        );
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signIn.social({ provider: "google", callbackURL: redirectTo });
    } catch {
      setError("La connexion Google est indisponible.");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await requestPasswordReset({
        email,
        redirectTo: "/reinitialiser-mot-de-passe",
      });
      if (res.error) {
        setError(res.error.message || "Impossible d'envoyer le lien.");
        return;
      }
      setResetSent(true);
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
          {mode === "signin"
            ? "Se connecter"
            : mode === "signup"
              ? "Créer un compte"
              : "Mot de passe oublié"}
        </h1>
        <p className="mt-1 font-serif text-sm italic text-ink/70">
          {mode === "forgot"
            ? "Nous vous enverrons un lien pour en choisir un nouveau."
            : "Enregistrez vos grilles et retrouvez-les partout."}
        </p>

        {mode === "forgot" ? (
          resetSent ? (
            <div className="mt-6 border-2 border-ink bg-paper p-4">
              <p className="font-sans text-sm text-ink">
                Si un compte existe pour <strong>{email}</strong>, un lien de
                réinitialisation vient d&apos;être envoyé. Vérifiez votre boîte
                de réception (et les spams).
              </p>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="btn-lapos mt-4 w-full rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="mt-6 space-y-3">
              <label className="block">
                <span className="font-display text-xs uppercase tracking-wide text-ink/70">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
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
                {loading ? "…" : "Envoyer le lien"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="w-full text-center font-display text-xs uppercase tracking-wide text-ink/60 hover:text-brand"
              >
                Annuler
              </button>
            </form>
          )
        ) : (
          <>
        {/* Mode toggle */}
        <div className="mt-5 grid grid-cols-2 border-2 border-ink">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`py-2 font-display text-xs uppercase tracking-wide transition-colors ${
              mode === "signin" ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`border-l-2 border-ink py-2 font-display text-xs uppercase tracking-wide transition-colors ${
              mode === "signup" ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            Inscription
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="btn-lapos mt-5 w-full rounded-md bg-paper px-4 py-2.5 text-sm text-ink"
        >
          Continuer avec Google
        </button>

        <div className="my-4 flex items-center gap-3 text-ink/40">
          <span className="h-px flex-1 bg-ink/20" />
          <span className="font-display text-[0.7rem] uppercase tracking-widest">
            ou
          </span>
          <span className="h-px flex-1 bg-ink/20" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="font-display text-xs uppercase tracking-wide text-ink/70">
                Prénom
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-brand"
              />
            </label>
          )}
          <label className="block">
            <span className="font-display text-xs uppercase tracking-wide text-ink/70">
              E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full border-2 border-ink bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="font-display text-xs uppercase tracking-wide text-ink/70">
              Mot de passe
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
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
            {loading
              ? "…"
              : mode === "signin"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="mt-3 w-full text-center font-display text-xs uppercase tracking-wide text-ink/60 hover:text-brand"
          >
            Mot de passe oublié ?
          </button>
        )}
          </>
        )}
      </div>

      <Link
        href="/"
        className="mt-6 text-center font-display text-xs uppercase tracking-wide text-ink/60 hover:text-brand"
      >
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
