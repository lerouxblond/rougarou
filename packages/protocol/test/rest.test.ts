import { describe, expect, it } from 'vitest';

import {
  apiErrorSchema,
  createGameResponseSchema,
  displayNameSchema,
  GAME_CODE_ALPHABET,
  gameCodeSchema,
  gameIdSchema,
  joinGameRequestSchema,
  meResponseSchema,
  ticketResponseSchema,
  updateMeRequestSchema,
} from '../src/index.ts';

const GAME_ID = '01JABCDEFGHJKMNPQRSTVWXYZ0';

describe('gameCodeSchema (US-10)', () => {
  it('accepte 6 caracteres de l alphabet, et normalise la casse et les espaces', () => {
    expect(gameCodeSchema.parse(' abc234 ')).toBe('ABC234');
  });

  it.each(['ABC23O', 'ABC230', 'ABC231', 'ABC23I'])('refuse le caractere ambigu de %s', (code) => {
    expect(gameCodeSchema.safeParse(code).success).toBe(false);
  });

  it('refuse une longueur autre que 6', () => {
    expect(gameCodeSchema.safeParse('ABC23').success).toBe(false);
    expect(gameCodeSchema.safeParse('ABC2345').success).toBe(false);
  });

  it('l alphabet exclut 0, O, 1 et I', () => {
    for (const ambiguous of ['0', 'O', '1', 'I']) {
      expect(GAME_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });
});

describe('gameIdSchema', () => {
  it('accepte un ULID', () => {
    expect(gameIdSchema.safeParse(GAME_ID).success).toBe(true);
  });

  it('refuse autre chose', () => {
    expect(gameIdSchema.safeParse('game-1').success).toBe(false);
    expect(gameIdSchema.safeParse(GAME_ID.toLowerCase()).success).toBe(false);
  });
});

describe('DTO REST', () => {
  it('creation et rejoindre', () => {
    expect(createGameResponseSchema.safeParse({ gameId: GAME_ID, code: 'ABC234' }).success).toBe(
      true,
    );
    expect(joinGameRequestSchema.parse({ code: 'abc234' })).toEqual({ code: 'ABC234' });
    expect(joinGameRequestSchema.safeParse({ code: 'ABC234', gameId: GAME_ID }).success).toBe(
      false,
    );
  });

  it('ticket', () => {
    expect(
      ticketResponseSchema.safeParse({ ticket: 'a'.repeat(43), expiresAt: 1_000 }).success,
    ).toBe(true);
    expect(ticketResponseSchema.safeParse({ ticket: 'court', expiresAt: 1_000 }).success).toBe(
      false,
    );
  });

  it('profil : un invite n a pas d e-mail', () => {
    expect(
      meResponseSchema.safeParse({ id: 'u1', displayName: 'Alice', email: null, guest: true })
        .success,
    ).toBe(true);
    expect(updateMeRequestSchema.parse({ displayName: '  Alice ' })).toEqual({
      displayName: 'Alice',
    });
    expect(updateMeRequestSchema.safeParse({ displayName: '' }).success).toBe(false);
  });

  it('le pseudo fait de 1 a 30 caracteres', () => {
    expect(displayNameSchema.safeParse('a'.repeat(30)).success).toBe(true);
    expect(displayNameSchema.safeParse('a'.repeat(31)).success).toBe(false);
    expect(displayNameSchema.safeParse('   ').success).toBe(false);
  });

  it('une erreur porte un code et une cle i18n, jamais un texte', () => {
    expect(
      apiErrorSchema.safeParse({ code: 'NOT_FOUND', messageKey: 'errors.not_found' }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({ code: 'NOT_FOUND', message: 'Route inconnue.' }).success,
    ).toBe(false);
  });
});
