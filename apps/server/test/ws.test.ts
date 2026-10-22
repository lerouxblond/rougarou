import { PROTOCOL_VERSION } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { call, signInGuest } from './helpers.ts';
import {
  connect,
  createGame,
  settle,
  table,
  ticketFor,
  upgrade,
  type TestSocket,
} from './socket.ts';

const v = PROTOCOL_VERSION;

describe('Tickets WebSocket (P15)', () => {
  it('un ticket ne sert qu une fois', async () => {
    const cookie = await signInGuest();
    const gameId = await createGame(cookie);
    const ticket = await ticketFor(cookie, gameId);

    expect((await upgrade(gameId, ticket)).status).toBe(101);
    expect((await upgrade(gameId, ticket)).status).toBe(401);
  });

  it('un ticket inconnu ou d une autre partie est refuse', async () => {
    const cookie = await signInGuest();
    const first = await createGame(cookie);
    const second = await createGame(cookie);
    const ticket = await ticketFor(cookie, first);

    expect((await upgrade(second, ticket)).status).toBe(401);
    expect((await upgrade(first, 'x'.repeat(43))).status).toBe(401);
  });

  it('sans session, pas de ticket ; partie inconnue : 404', async () => {
    const cookie = await signInGuest();

    expect(
      (await call('/api/games/01JA0000000000000000000099/ticket', { method: 'POST' })).status,
    ).toBe(401);
    expect(
      (await call('/api/games/01JA0000000000000000000099/ticket', { method: 'POST', cookie }))
        .status,
    ).toBe(404);
    expect((await call('/api/games/pas-un-ulid/ticket', { method: 'POST', cookie })).status).toBe(
      404,
    );
  });

  it('sans upgrade, la route WebSocket repond 426', async () => {
    const cookie = await signInGuest();
    const gameId = await createGame(cookie);

    expect((await call(`/ws/${gameId}`)).status).toBe(426);
  });
});

describe('Messages (CLAUDE.md regle 4)', () => {
  async function narratorSocket(): Promise<TestSocket> {
    return (await table([])).narrator;
  }

  it('un message invalide recoit une erreur, sans effet', async () => {
    const socket = await narratorSocket();

    socket.sendRaw({ v, t: 'cmd', id: 'x', cmd: { type: 'Nope' } });
    socket.sendRaw('pas du json');

    const first = await socket.next((message) => message.t === 'error');
    const second = await socket.next((message) => message.t === 'error');

    expect(first).toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(second).toMatchObject({ code: 'INVALID_MESSAGE' });
  });

  it('un ancien client recoit PROTOCOL_OUTDATED', async () => {
    const socket = await narratorSocket();

    socket.sendRaw({ v: v - 1, t: 'ping' });

    expect(await socket.next((message) => message.t === 'error')).toMatchObject({
      code: 'PROTOCOL_OUTDATED',
      messageKey: 'errors.protocol_outdated',
    });
  });

  it('ping, pong', async () => {
    const socket = await narratorSocket();

    socket.sendRaw({ v, t: 'ping' });
    expect(await socket.next((message) => message.t === 'pong')).toEqual({ v, t: 'pong' });
  });
});

describe('Securite (docs/04)', () => {
  it('la 11e commande dans la seconde est refusee', async () => {
    const { players } = await table(['Alice']);
    const alice = players.Alice?.socket;

    if (alice === undefined) {
      throw new Error('Alice absente');
    }

    // On laisse passer la fenetre ou Alice a envoye `JoinGame`.
    await settle(1100);

    const replies = await Promise.all(
      Array.from({ length: 11 }, () => alice.command({ type: 'Deal' })),
    );

    expect(
      replies.filter((reply) => reply.t === 'error' && reply.code === 'RATE_LIMITED'),
    ).toHaveLength(1);
  });

  it('un joueur ne peut pas envoyer une commande de meneur', async () => {
    const { players } = await table(['Alice']);

    expect(await players.Alice?.socket.command({ type: 'AdvancePhase' })).toMatchObject({
      t: 'error',
      code: 'FORBIDDEN',
    });
  });

  it('un utilisateur qui n a pas rejoint ne peut que rejoindre', async () => {
    const { gameId } = await table([]);
    const stranger = await connect(await signInGuest(), gameId);

    expect(await stranger.command({ type: 'ConfirmRoleSeen' })).toMatchObject({
      t: 'error',
      code: 'UNKNOWN_PLAYER',
    });
    await stranger.ok({ type: 'JoinGame', name: 'Inconnu' });
  });

  it('un pseudo deja pris est refuse (R-63)', async () => {
    const { gameId } = await table(['Alice']);
    const other = await connect(await signInGuest(), gameId);

    expect(await other.command({ type: 'JoinGame', name: 'alice' })).toMatchObject({
      t: 'error',
      code: 'NAME_TAKEN',
    });
  });
});

describe('Presence (P14)', () => {
  it('le meneur voit qui est connecte ; les joueurs ne recoivent jamais la presence', async () => {
    const { narrator, players } = await table(['Alice', 'Bob']);

    expect(await lastPresence(narrator)).toHaveLength(2);

    for (const { socket } of Object.values(players)) {
      expect(socket.received.some((message) => message.t === 'presence')).toBe(false);
    }

    players.Bob?.socket.close();
    await settle(100);
    expect(await lastPresence(narrator)).toHaveLength(1);
  });
});

/** Les joueurs connectes selon le dernier message `presence` recu. */
async function lastPresence(socket: TestSocket): Promise<string[]> {
  await settle();
  const last = socket.received.filter((message) => message.t === 'presence').at(-1);

  return last?.t === 'presence' ? last.connected : [];
}
