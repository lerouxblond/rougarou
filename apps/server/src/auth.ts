import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from './db/schema.ts';
import type { Env } from './env.ts';

/** Longueur minimale d'un mot de passe (US-01). */
export const MIN_PASSWORD_LENGTH = 12;

/** Origines des apps Tauri et du serveur Vite de developpement (`docs/04` §Securite). */
export const NATIVE_ORIGINS = ['tauri://localhost', 'http://tauri.localhost'];
export const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export type Database = DrizzleD1Database<typeof schema>;

export function database(env: Env): Database {
  return drizzle(env.DB, { schema });
}

/**
 * Better Auth, monte sur `/api/auth/*` (ADR 0003, ADR 0009).
 *
 * L'instance est construite par requete : les bindings D1 n'existent que dans
 * le contexte d'une requete Workers. Les e-mails restent desactives tant
 * qu'aucun domaine n'est verifie (D-18) : pas de verification d'e-mail ni de
 * reinitialisation en libre-service.
 */
export function createAuth(env: Env, origin: string) {
  const db = database(env);

  return betterAuth({
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [origin, ...NATIVE_ORIGINS, ...DEV_ORIGINS],
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      requireEmailVerification: false,
    },
    plugins: [
      anonymous({
        // Un pseudo technique : le joueur choisit le sien juste apres (D-04).
        generateName: () => `guest-${crypto.randomUUID().slice(0, 8)}`,
        // La conversion cree un nouveau compte et supprime l'invite : ses
        // lignes D1 le suivent avant la suppression (ADR 0009).
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await transferUserRows(db, anonymousUser.user.id, newUser.user.id);
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            await db
              .insert(schema.profile)
              .values({ userId: created.id, displayName: created.name.slice(0, 30) })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Les parties menees, jouees et les presets d'un invite passent au compte qui le remplace. */
export async function transferUserRows(db: Database, from: string, to: string): Promise<void> {
  await db.batch([
    db.update(schema.game).set({ narratorId: to }).where(eq(schema.game.narratorId, from)),
    db.update(schema.gamePlayer).set({ userId: to }).where(eq(schema.gamePlayer.userId, from)),
    db.update(schema.preset).set({ ownerId: to }).where(eq(schema.preset.ownerId, from)),
  ]);
}
