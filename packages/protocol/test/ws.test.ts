import { describe, expect, it } from 'vitest';

import {
  clientMessageSchema,
  ENGINE_ERROR_CODES,
  ERROR_CODES,
  messageVersionOf,
  PROTOCOL_VERSION,
  serverMessageSchema,
} from '../src/index.ts';

const v = PROTOCOL_VERSION;

/** Une vue de joueur minimale, valide pour son schema strict. */
const playerView = {
  kind: 'player',
  gameId: '01JABCDEFGHJKMNPQRSTVWXYZ0',
  phase: 'LOBBY',
  me: null,
  players: [],
  options: {},
  composition: {},
  nightNumber: 0,
  deadline: null,
  pausedRemaining: null,
  night: null,
  deaths: null,
  election: null,
  vote: null,
  pending: [],
  winner: null,
  actions: [{ type: 'JoinGame' }],
};

describe('clientMessageSchema', () => {
  it.each([
    { v, t: 'cmd', id: 'c1', cmd: { type: 'JoinGame', name: 'Alice' } },
    { v, t: 'cmd', id: 'c2', cmd: { type: 'AdvancePhase' } },
    { v, t: 'ping' },
  ])('accepte $t', (message) => {
    expect(clientMessageSchema.safeParse(message).success).toBe(true);
  });

  it('refuse un message sans version', () => {
    expect(clientMessageSchema.safeParse({ t: 'ping' }).success).toBe(false);
  });

  it('refuse une autre version que la sienne', () => {
    expect(clientMessageSchema.safeParse({ v: v + 1, t: 'ping' }).success).toBe(false);
  });

  it('refuse une cle inconnue, y compris un acteur envoye par le client', () => {
    expect(
      clientMessageSchema.safeParse({
        v,
        t: 'cmd',
        id: 'c1',
        cmd: { type: 'Undo' },
        actor: { kind: 'narrator' },
      }).success,
    ).toBe(false);
  });

  it('refuse une commande invalide et un identifiant de correlation vide', () => {
    expect(
      clientMessageSchema.safeParse({ v, t: 'cmd', id: 'c1', cmd: { type: 'Nope' } }).success,
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse({ v, t: 'cmd', id: '', cmd: { type: 'Undo' } }).success,
    ).toBe(false);
  });

  it('le chat n existe pas encore (M5)', () => {
    expect(
      clientMessageSchema.safeParse({ v, t: 'chat', channel: 'village', text: 'Salut' }).success,
    ).toBe(false);
  });
});

describe('serverMessageSchema', () => {
  it.each([
    { v, t: 'state', seq: 1, view: playerView },
    { v, t: 'ack', id: 'c1' },
    { v, t: 'error', id: 'c1', code: 'FORBIDDEN', messageKey: 'errors.forbidden' },
    { v, t: 'error', code: 'PROTOCOL_OUTDATED', messageKey: 'errors.protocol_outdated' },
    { v, t: 'presence', connected: ['p1', 'p2'] },
    { v, t: 'pong' },
  ])('accepte $t', (message) => {
    expect(serverMessageSchema.safeParse(message).success).toBe(true);
  });

  it('refuse une vue qui porte un champ inattendu', () => {
    expect(
      serverMessageSchema.safeParse({
        v,
        t: 'state',
        seq: 1,
        view: { ...playerView, roles: { p1: 'werewolf' } },
      }).success,
    ).toBe(false);
  });

  it('refuse un code d erreur inconnu', () => {
    expect(
      serverMessageSchema.safeParse({ v, t: 'error', code: 'OOPS', messageKey: 'errors.x' })
        .success,
    ).toBe(false);
  });

  it('refuse un numero de sequence negatif', () => {
    expect(
      serverMessageSchema.safeParse({ v, t: 'state', seq: -1, view: playerView }).success,
    ).toBe(false);
  });
});

describe('Codes d erreur', () => {
  it('reprennent tous les codes du moteur, plus ceux du transport', () => {
    for (const code of ENGINE_ERROR_CODES) {
      expect(ERROR_CODES).toContain(code);
    }

    expect(ERROR_CODES).toEqual(
      expect.arrayContaining(['PROTOCOL_OUTDATED', 'RATE_LIMITED', 'INVALID_MESSAGE']),
    );
  });
});

describe('messageVersionOf', () => {
  it('lit la version d un message, meme d une forme inconnue', () => {
    expect(messageVersionOf({ v: 1, t: 'future', extra: true })).toBe(1);
  });

  it('renvoie null sans version entiere', () => {
    expect(messageVersionOf({ t: 'ping' })).toBeNull();
    expect(messageVersionOf('ping')).toBeNull();
    expect(messageVersionOf({ v: '2' })).toBeNull();
  });
});
