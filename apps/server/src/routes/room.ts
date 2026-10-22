import { gameIdSchema, ticketResponseSchema } from '@rougarou/protocol';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { apiError } from '../api-error.ts';
import type { AppEnv } from '../app-env.ts';
import { database } from '../auth.ts';
import * as schema from '../db/schema.ts';
import { requireUser } from '../session.ts';

/**
 * `POST /api/games/:id/ticket` (`docs/04` §Authentification). Le Worker
 * verifie la session et lit dans D1 qui mene la partie ; le Durable Object
 * emet le ticket et le consommera a l'ouverture du socket (P15).
 */
export const ticket = new Hono<AppEnv>().use(requireUser).post('/:id/ticket', async (context) => {
  const gameId = gameIdSchema.safeParse(context.req.param('id'));

  if (!gameId.success) {
    return context.json(apiError('NOT_FOUND'), 404);
  }

  const game = await database(context.env).query.game.findFirst({
    columns: { narratorId: true },
    where: eq(schema.game.id, gameId.data),
  });

  if (game === undefined) {
    return context.json(apiError('NOT_FOUND'), 404);
  }

  const room = context.env.GAME_ROOM.get(context.env.GAME_ROOM.idFromName(gameId.data));
  const issued = await room.issueTicket(
    gameId.data,
    context.var.user.id,
    game.narratorId === context.var.user.id,
  );

  if (issued === null) {
    return context.json(apiError('NOT_FOUND'), 404);
  }

  return context.json(ticketResponseSchema.parse(issued));
});

/**
 * `GET /ws/:gameId?ticket=…` : l'upgrade est transmis tel quel au Durable
 * Object, qui seul peut verifier le ticket. Le jeton de session n'est jamais
 * dans l'URL.
 */
export const ws = new Hono<AppEnv>().get('/:id', (context) => {
  const gameId = gameIdSchema.safeParse(context.req.param('id'));

  if (!gameId.success) {
    return context.json(apiError('NOT_FOUND'), 404);
  }

  const room = context.env.GAME_ROOM.get(context.env.GAME_ROOM.idFromName(gameId.data));

  return room.fetch(context.req.raw);
});
