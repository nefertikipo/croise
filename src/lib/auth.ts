import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as authSchema from "@/db/schema/auth";
import { sendEmail, emailShell } from "@/lib/email";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Better Auth server instance. Email/password works out of the box; Google
 * OAuth activates only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set,
 * so the app runs fine locally without Google credentials.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisez votre mot de passe",
        html: emailShell({
          heading: "Mot de passe oublié ?",
          bodyHtml:
            "<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans une heure.</p><p style=\"font-size:14px;color:rgba(0,0,0,.55)\">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>",
          cta: { label: "Choisir un nouveau mot de passe", url },
        }),
      });
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
});
