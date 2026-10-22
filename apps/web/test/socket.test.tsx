import { catalogs } from '@rougarou/i18n';
import { PROTOCOL_VERSION, type ServerMessage } from '@rougarou/protocol';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { ConnectionIndicator } from '../src/components/ConnectionIndicator.tsx';
import {
  backoff,
  GameConnection,
  type ConnectionDeps,
  type ConnectionStatus,
  type SocketLike,
} from '../src/game/socket.ts';
import { createI18n } from '../src/i18n.ts';

afterEach(cleanup);

const v = PROTOCOL_VERSION;

class FakeSocket implements SocketLike {
  readonly sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

/** Un reseau et une horloge factices : les delais sont notes, pas attendus. */
function harness() {
  const sockets: FakeSocket[] = [];
  const delays: number[] = [];
  const timers: (() => void)[] = [];
  const messages: ServerMessage[] = [];
  const statuses: ConnectionStatus[] = [];
  const deps: ConnectionDeps = {
    ticket: () => Promise.resolve('t'.repeat(43)),
    open: () => {
      const socket = new FakeSocket();

      sockets.push(socket);
      return socket;
    },
    url: (gameId, ticket) => `ws://test/ws/${gameId}?ticket=${ticket}`,
    setTimeout: (callback, ms) => {
      delays.push(ms);
      timers.push(callback);
      return timers.length;
    },
    clearTimeout: () => undefined,
  };
  const connection = new GameConnection('01JA0000000000000000000001', deps, {
    onMessage: (message) => messages.push(message),
    onStatus: (status) => statuses.push(status),
  });

  /** Laisse la promesse du ticket se resoudre. */
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  /** Declenche le prochain minuteur de reconnexion. */
  const fire = async () => {
    timers.shift()?.();
    await flush();
  };

  return { connection, sockets, delays, messages, statuses, flush, fire };
}

const state = (seq: number) => ({
  v,
  t: 'state',
  seq,
  view: {
    kind: 'player',
    gameId: '01JA0000000000000000000001',
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
    actions: [],
  },
});

describe('GameConnection (US-90)', () => {
  it('ouvre la socket avec un ticket, puis annonce la connexion', async () => {
    const { connection, sockets, statuses, flush } = harness();

    connection.start();
    await flush();
    sockets[0]?.onopen?.();

    expect(sockets).toHaveLength(1);
    expect(statuses).toEqual(['connecting', 'open']);
  });

  it('ignore un message hors protocole (CLAUDE.md regle 4)', async () => {
    const { connection, sockets, messages, flush } = harness();

    connection.start();
    await flush();
    sockets[0]?.receive({ v, t: 'state', seq: 1, view: { kind: 'player', roles: {} } });
    sockets[0]?.onmessage?.({ data: 'pas du json' });
    sockets[0]?.receive({ v, t: 'pong' });

    expect(messages).toEqual([{ v, t: 'pong' }]);
  });

  it('se reconnecte apres une coupure, avec des delais croissants', async () => {
    const { connection, sockets, delays, statuses, flush, fire } = harness();

    connection.start();
    await flush();
    sockets[0]?.close();
    await fire();
    sockets[1]?.close();
    await fire();
    sockets[2]?.close();

    expect(delays).toEqual([500, 1000, 2000]);
    expect(statuses.filter((status) => status === 'reconnecting')).toHaveLength(3);
    expect(sockets).toHaveLength(3);

    // Une connexion reussie remet le compteur a zero.
    await fire();
    sockets[3]?.onopen?.();
    sockets[3]?.close();
    expect(delays.at(-1)).toBe(500);
  });

  it('les delais plafonnent a 10 s', () => {
    expect(backoff(0)).toBe(500);
    expect(backoff(10)).toBe(10_000);
  });

  it('un trou dans la sequence declenche une resynchronisation', async () => {
    const { connection, sockets, messages, flush } = harness();

    connection.start();
    await flush();
    sockets[0]?.receive(state(3));
    sockets[0]?.receive(state(4));
    sockets[0]?.receive(state(6));

    expect(messages.map((message) => message.t === 'state' && message.seq)).toEqual([3, 4]);
    expect(sockets[0]?.closed).toBe(true);
  });

  it('une commande part avec la version du protocole et un identifiant', async () => {
    const { connection, sockets, flush } = harness();

    expect(connection.send({ type: 'Deal' })).toBeNull();

    connection.start();
    await flush();

    const id = connection.send({ type: 'Deal' });

    expect(JSON.parse(sockets[0]?.sent[0] ?? '')).toEqual({
      v,
      t: 'cmd',
      id,
      cmd: { type: 'Deal' },
    });
  });

  it('arreter ferme la socket sans se reconnecter', async () => {
    const { connection, sockets, delays, statuses, flush } = harness();

    connection.start();
    await flush();
    connection.stop();

    expect(sockets[0]?.closed).toBe(true);
    expect(delays).toEqual([]);
    expect(statuses.at(-1)).toBe('closed');
  });
});

describe('ConnectionIndicator', () => {
  it('annonce l etat par une region status', () => {
    render(
      <I18nextProvider i18n={createI18n()}>
        <ConnectionIndicator status="reconnecting" />
      </I18nextProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe(catalogs.fr.connection.reconnecting);
  });
});
