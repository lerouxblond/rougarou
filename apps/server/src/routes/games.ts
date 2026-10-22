import {
  createGameResponseSchema,
  gameIdSchema,
  gameSummaryResponseSchema,
  GAME_CODE_ALPHABET,
  GAME_CODE_LENGTH,
  joinGameRequestSchema,
  joinGameResponseSchema,
} from '@rougarou/protocol';
import { and, eq, ne } from 'drizzle-orm';
import { Hono } from 'hono';

import { apiError } from '../api-error.ts';
import type { AppEnv } from '../app-env.ts';
import { database } from '../auth.ts';
import * as schema from '../db/schema.ts';
import { requireUser } from '../session.ts';
import { ulid } from '../ulid.ts';

/** Tentatives de tirage d'un code libre avant d'abandonner. */
const CODE_ATTEMPTS = 5;

/** Un code de partie au hasard (US-10). */
export function randomGameCode(): string {
  const bytes = new Uint8Array(GAME_CODE_LENGTH);

  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => GAME_CODE_ALPHABET[byte % GAME_CODE_ALPHABET.length]).join('');
}

/**
 * Creer et rejoindre une partie (US-10, US-11). Le salon lui-meme vit dans le
 * Durable Object : ces routes ne font que reserver un code et le resoudre.
 */
export const games = new Hono<AppEnv>()
  .use(requireUser)
  .post('/', async (context) => {
    const db = database(context.env);
    const id = ulid();

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = randomGameCode();
      // L'index unique partiel refuse un code deja pris par une partie active.
      const inserted = await db
        .insert(schema.game)
        .values({ id, code, narratorId: context.var.user.id })
        .onConflictDoNothing()
        .returning({ id: schema.game.id });

      if (inserted.length > 0) {
        return context.json(createGameResponseSchema.parse({ gameId: id, code }), 201);
      }
    }

    return context.json(apiError('CONFLICT'), 503);
  })
  .get('/:id', async (context) => {
    const gameId = gameIdSchema.safeParse(context.req.param('id'));
    const found = gameId.success
      ? await database(context.env).query.game.findFirst({
          columns: { id: true, code: true, narratorId: true },
          where: eq(schema.game.id, gameId.data),
        })
      : undefined;

    if (found === undefined) {
      return context.json(apiError('NOT_FOUND'), 404);
    }

    return context.json(
      gameSummaryResponseSchema.parse({
        gameId: found.id,
        code: found.code,
        narrator: found.narratorId === context.var.user.id,
      }),
    );
  })
  /**
   * Resout un code actif. Une partie deja distribuee reste trouvable, pour
   * qu'un joueur revienne apres un rechargement ; c'est le moteur qui refuse
   * un nouveau venu (US-11).
   */
  .post('/join', async (context) => {
    const parsed = joinGameRequestSchema.safeParse(await context.req.json().catch(() => null));

    if (!parsed.success) {
      return context.json(apiError('INVALID_MESSAGE'), 400);
    }

    const found = await database(context.env).query.game.findFirst({
      columns: { id: true },
      where: and(eq(schema.game.code, parsed.data.code), ne(schema.game.status, 'ended')),
    });

    if (found === undefined) {
      return context.json(apiError('NOT_FOUND'), 404);
    }

    return context.json(joinGameResponseSchema.parse({ gameId: found.id }));
  });
