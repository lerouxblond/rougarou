import { createGameResponseSchema, gameIdSchema, joinGameResponseSchema } from '@rougarou/protocol';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { randomGameCode } from '../src/routes/games.ts';
import { ulid } from '../src/ulid.ts';
import { call, signInGuest, signUp } from './helpers.ts';

async function createGame(cookie: string) {
  const response = await call('/api/games', { method: 'POST', cookie });

  expect(response.status).toBe(201);
  return createGameResponseSchema.parse(await response.json());
}

function join(cookie: string, code: unknown) {
  return call('/api/games/join', { method: 'POST', cookie, body: JSON.stringify({ code }) });
}

describe('POST /api/games (US-10)', () => {
  it('cree une partie au salon, menee par son createur', async () => {
    const cookie = await signUp('Meneur');
    const { gameId, code } = await createGame(cookie);
    const row = await env.DB.prepare('select code, status, narrator_id from game where id = ?')
      .bind(gameId)
      .first<{ code: string; status: string; narrator_id: string }>();

    expect(row).toMatchObject({ code, status: 'lobby' });
    expect(row?.narrator_id).toBeTruthy();
  });

  it('un invite peut aussi mener (D-04)', async () => {
    await createGame(await signInGuest());
  });

  it('sans session : 401', async () => {
    expect((await call('/api/games', { method: 'POST' })).status).toBe(401);
  });
});

describe('POST /api/games/join (US-11)', () => {
  it('resout le code, saisi en minuscules', async () => {
    const { gameId, code } = await createGame(await signUp('Meneur'));
    const response = await join(await signInGuest(), code.toLowerCase());

    expect(response.status).toBe(200);
    expect(joinGameResponseSchema.parse(await response.json())).toEqual({ gameId });
  });

  it('une partie en cours reste trouvable, une partie terminee non', async () => {
    const { gameId, code } = await createGame(await signUp('Meneur'));
    const player = await signInGuest();

    await env.DB.prepare("update game set status = 'playing' where id = ?").bind(gameId).run();
    expect((await join(player, code)).status).toBe(200);

    await env.DB.prepare("update game set status = 'ended' where id = ?").bind(gameId).run();
    expect((await join(player, code)).status).toBe(404);
  });

  it('code inconnu : 404 ; corps invalide : 400 ; sans session : 401', async () => {
    const player = await signInGuest();

    expect((await join(player, 'ZZZZZZ')).status).toBe(404);
    expect((await join(player, 'O0O0O0')).status).toBe(400);
    expect((await join(player, 42)).status).toBe(400);

    const anonymous = await call('/api/games/join', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABC234' }),
    });

    expect(anonymous.status).toBe(401);
  });
});

describe('GET /api/games/:id', () => {
  it('donne le code, et dit au meneur qu il mene', async () => {
    const narrator = await signUp('Meneur');
    const { gameId, code } = await createGame(narrator);
    const player = await signInGuest();

    expect(await (await call(`/api/games/${gameId}`, { cookie: narrator })).json()).toEqual({
      gameId,
      code,
      narrator: true,
    });
    expect(await (await call(`/api/games/${gameId}`, { cookie: player })).json()).toMatchObject({
      narrator: false,
    });
    expect((await call('/api/games/01JA0000000000000000000099', { cookie: player })).status).toBe(
      404,
    );
  });
});

describe('Identifiants', () => {
  it('un ULID respecte le schema et se trie dans l ordre de creation', () => {
    const first = ulid(1_761_000_000_000);
    const second = ulid(1_761_000_000_001);

    expect(gameIdSchema.safeParse(first).success).toBe(true);
    expect(first < second).toBe(true);
  });

  it('un code tire au sort respecte l alphabet', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(randomGameCode()).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    }
  });
});
