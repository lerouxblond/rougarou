import { z } from './zod.ts';

/**
 * Alphabet des codes de partie : chiffres et majuscules, sans `0`, `O`, `1`
 * ni `I`, qu'on confond a l'oral et a l'ecran (US-10).
 */
export const GAME_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const GAME_CODE_LENGTH = 6;

/** Code a 6 caracteres, saisi en minuscules ou avec des espaces autour. */
export const gameCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${GAME_CODE_ALPHABET}]{${String(GAME_CODE_LENGTH)}}$`));

export type GameCode = z.infer<typeof gameCodeSchema>;

/** Identifiant de partie : un ULID (`docs/04` §Durable Object). */
export const gameIdSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export type GameId = z.infer<typeof gameIdSchema>;
