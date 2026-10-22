/** Bindings et secrets du Worker (`wrangler.jsonc`, `docs/08`). */
export interface Env {
  readonly DB: D1Database;
  /** Secret de signature des sessions (`wrangler secret put BETTER_AUTH_SECRET`). */
  readonly BETTER_AUTH_SECRET: string;
  /** E-mails (ADR 0009) : absents tant qu'aucun domaine n'est verifie. */
  readonly RESEND_API_KEY?: string;
  readonly EMAIL_FROM?: string;
}
