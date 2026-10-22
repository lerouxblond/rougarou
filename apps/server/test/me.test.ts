import { meResponseSchema } from '@rougarou/protocol';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, cookiesOf, PASSWORD, signInGuest, signUp, uniqueEmail } from './helpers.ts';

async function myId(cookie: string): Promise<string> {
  return meResponseSchema.parse(await (await call('/api/me', { cookie })).json()).id;
}

/** Une partie terminee ou `userId` a joue en place 0 et qu'il a menee. */
async function playedGame(gameId: string, userId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "insert into game (id, code, narrator_id, status) values (?, 'ABC234', ?, 'ended')",
    ).bind(gameId, userId),
    env.DB.prepare(
      "insert into game_player (game_id, user_id, seat, display_name) values (?, ?, 0, 'Alice')",
    ).bind(gameId, userId),
  ]);
}

describe('PATCH /api/me', () => {
  it('change le pseudo', async () => {
    const cookie = await signUp('Alice');
    const response = await call('/api/me', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ displayName: '  Alix ' }),
    });

    expect(response.status).toBe(204);
    expect(
      meResponseSchema.parse(await (await call('/api/me', { cookie })).json()).displayName,
    ).toBe('Alix');
  });

  it.each([
    ['vide', { displayName: '' }],
    ['trop long', { displayName: 'a'.repeat(31) }],
    ['avec une cle inconnue', { displayName: 'Alix', admin: true }],
  ])('refuse un corps %s', async (_label, body) => {
    const response = await call('/api/me', {
      method: 'PATCH',
      cookie: await signUp(),
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/me (D-21)', () => {
  it('supprime le compte, ferme la session et anonymise les parties', async () => {
    const cookie = await signUp('Alice');
    const id = await myId(cookie);

    await playedGame('01JA0000000000000000000010', id);

    const response = await call('/api/me', { method: 'DELETE', cookie });

    expect(response.status).toBe(204);
    expect((await call('/api/me', { cookie })).status).toBe(401);

    const row = await env.DB.prepare(
      "select user_id, display_name from game_player where game_id = '01JA0000000000000000000010'",
    ).first();

    expect(row).toEqual({ user_id: null, display_name: 'Alice' });
    expect(
      await env.DB.prepare('select count(*) as n from user where id = ?').bind(id).first('n'),
    ).toBe(0);
  });
});

describe('Conversion d un invite (D-04, ADR 0009)', () => {
  it('ses parties passent au nouveau compte', async () => {
    const guest = await signInGuest();
    const guestId = await myId(guest);

    await playedGame('01JA0000000000000000000011', guestId);

    const linked = await call('/api/auth/sign-up/email', {
      method: 'POST',
      cookie: guest,
      body: JSON.stringify({ email: uniqueEmail(), password: PASSWORD, name: 'Alice' }),
    });
    const accountId = await myId(cookiesOf(linked));
    const game = await env.DB.prepare(
      "select g.narrator_id as narrator, p.user_id as player from game g join game_player p on p.game_id = g.id where g.id = '01JA0000000000000000000011'",
    ).first();

    expect(game).toEqual({ narrator: accountId, player: accountId });
  });
});
