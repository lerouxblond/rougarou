import { z } from './zod.ts';

import { errorCodeSchema, messageKeySchema } from './errors.ts';
import { gameCodeSchema, gameIdSchema } from './game-code.ts';

/**
 * Corps des routes REST (`docs/04`). Comme les messages WebSocket, ils sont
 * stricts et valides des deux cotes (`CLAUDE.md` regle 4).
 */

/** Pseudo d'un joueur ou d'un profil (US-01). */
export const displayNameSchema = z.string().trim().min(1).max(30);

/** `POST /api/games` : le meneur cree une partie (US-10). */
export const createGameResponseSchema = z.strictObject({
  gameId: gameIdSchema,
  code: gameCodeSchema,
});

export type CreateGameResponse = z.infer<typeof createGameResponseSchema>;

/** `GET /api/games/:id` : le code a afficher dans le salon, et si l'on mene la partie. */
export const gameSummaryResponseSchema = z.strictObject({
  gameId: gameIdSchema,
  code: gameCodeSchema,
  narrator: z.boolean(),
});

export type GameSummaryResponse = z.infer<typeof gameSummaryResponseSchema>;

/** `POST /api/games/join` : un joueur rejoint par code (US-11). */
export const joinGameRequestSchema = z.strictObject({ code: gameCodeSchema });

export type JoinGameRequest = z.infer<typeof joinGameRequestSchema>;

export const joinGameResponseSchema = z.strictObject({ gameId: gameIdSchema });

export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>;

/** `POST /api/games/:id/ticket` : ticket WebSocket a usage unique, valable 30 s. */
export const ticketResponseSchema = z.strictObject({
  ticket: z.string().regex(/^[A-Za-z0-9_-]{32,}$/),
  expiresAt: z.int(),
});

export type TicketResponse = z.infer<typeof ticketResponseSchema>;

/** `GET /api/me`. Un invite (D-04) n'a pas d'e-mail. */
export const meResponseSchema = z.strictObject({
  id: z.string().min(1),
  displayName: displayNameSchema,
  email: z.email().nullable(),
  guest: z.boolean(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/** `PATCH /api/me`. */
export const updateMeRequestSchema = z.strictObject({ displayName: displayNameSchema });

export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;

/** Corps de toute reponse d'erreur de l'API. */
export const apiErrorSchema = z.strictObject({
  code: errorCodeSchema,
  messageKey: messageKeySchema,
});

export type ApiError = z.infer<typeof apiErrorSchema>;
