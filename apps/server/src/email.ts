import type { Env } from './env.ts';

/** Un e-mail transactionnel (verification, mot de passe oublie). */
export interface Email {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** L'envoi d'e-mails, derriere une interface pour pouvoir changer de fournisseur (ADR 0009). */
export interface EmailSender {
  send(email: Email): Promise<void>;
}

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Le client Resend, ou `null` tant que la cle et l'expediteur ne sont pas
 * configures : sans domaine verifie, les e-mails restent desactives (D-18).
 */
export function createEmailSender(
  env: Pick<Env, 'RESEND_API_KEY' | 'EMAIL_FROM'>,
  fetcher: typeof fetch = fetch,
): EmailSender | null {
  const { RESEND_API_KEY: key, EMAIL_FROM: from } = env;

  if (key === undefined || from === undefined) {
    return null;
  }

  return {
    async send(email) {
      const response = await fetcher(RESEND_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text }),
      });

      if (!response.ok) {
        throw new Error(`Resend a refuse l'e-mail : ${String(response.status)}`);
      }
    },
  };
}
