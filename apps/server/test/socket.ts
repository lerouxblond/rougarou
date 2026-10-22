import {
  createGameResponseSchema,
  PROTOCOL_VERSION,
  serverMessageSchema,
  ticketResponseSchema,
  type ClientMessageInput,
  type CommandInput,
  type NarratorView,
  type PlayerView,
  type ServerMessage,
} from '@rougarou/protocol';
import { exports as worker } from 'cloudflare:workers';

import { call, ORIGIN, signInGuest } from './helpers.ts';

type Of<T extends ServerMessage['t']> = Extract<ServerMessage, { t: T }>;

/**
 * Un client WebSocket de test. Chaque message recu est valide par le schema
 * partage : un message hors protocole fait echouer le test.
 */
export class TestSocket {
  readonly received: ServerMessage[] = [];
  private readonly waiters: (() => void)[] = [];
  private counter = 0;
  private readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.accept();
    ws.addEventListener('message', (event) => {
      this.received.push(serverMessageSchema.parse(JSON.parse(String(event.data))));
      for (const wake of this.waiters.splice(0)) {
        wake();
      }
    });
  }

  sendRaw(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  /** Envoie une commande et attend son `ack` ou son `error`. */
  async command(cmd: CommandInput): Promise<Of<'ack'> | Of<'error'>> {
    this.counter += 1;
    const id = `c${String(this.counter)}`;
    const message: ClientMessageInput = { v: PROTOCOL_VERSION, t: 'cmd', id, cmd };

    this.sendRaw(message);
    return this.next(
      (received): received is Of<'ack'> | Of<'error'> =>
        (received.t === 'ack' || received.t === 'error') && received.id === id,
    );
  }

  /** Une commande qui doit etre acceptee. */
  async ok(cmd: CommandInput): Promise<void> {
    const reply = await this.command(cmd);

    if (reply.t === 'error') {
      throw new Error(`${cmd.type} refusee : ${reply.code} (${reply.messageKey})`);
    }
  }

  /** Le premier message (deja recu ou a venir) qui verifie `match`, en le consommant. */
  async next<T extends ServerMessage>(match: (message: ServerMessage) => message is T): Promise<T> {
    for (;;) {
      const index = this.received.findIndex(match);

      if (index >= 0) {
        return this.received.splice(index, 1)[0] as T;
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Message attendu jamais recu'));
        }, 4000);

        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** La derniere vue recue, apres avoir laisse arriver les messages en vol. */
  async view(): Promise<PlayerView | NarratorView> {
    await settle();
    const states = this.received.filter((message): message is Of<'state'> => message.t === 'state');
    const last = states.at(-1);

    if (last === undefined) {
      throw new Error('Aucune vue recue');
    }

    return last.view;
  }

  close(): void {
    this.ws.close(1000);
  }
}

/** Laisse passer les messages en transit. */
export function settle(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createGame(cookie: string): Promise<string> {
  const response = await call('/api/games', { method: 'POST', cookie });

  return createGameResponseSchema.parse(await response.json()).gameId;
}

export async function ticketFor(cookie: string, gameId: string): Promise<string> {
  const response = await call(`/api/games/${gameId}/ticket`, { method: 'POST', cookie });

  if (!response.ok) {
    throw new Error(`Ticket refuse : ${String(response.status)}`);
  }

  return ticketResponseSchema.parse(await response.json()).ticket;
}

/** Ouvre la WebSocket d'une partie avec ce ticket ; renvoie la reponse brute si l'upgrade echoue. */
export async function upgrade(gameId: string, ticket: string): Promise<Response> {
  return worker.default.fetch(`${ORIGIN}/ws/${gameId}?ticket=${ticket}`, {
    headers: { upgrade: 'websocket' },
  });
}

export async function connect(cookie: string, gameId: string): Promise<TestSocket> {
  const response = await upgrade(gameId, await ticketFor(cookie, gameId));

  if (response.webSocket === null) {
    throw new Error(`Upgrade refuse : ${String(response.status)}`);
  }

  return new TestSocket(response.webSocket);
}

/** Une partie, son meneur connecte et `names.length` invites connectes qui ont rejoint. */
export async function table(names: readonly string[]) {
  const narratorCookie = await signInGuest();
  const gameId = await createGame(narratorCookie);
  const narrator = await connect(narratorCookie, gameId);
  const players: Record<string, { cookie: string; socket: TestSocket }> = {};

  for (const name of names) {
    const cookie = await signInGuest();
    const socket = await connect(cookie, gameId);

    await socket.ok({ type: 'JoinGame', name });
    players[name] = { cookie, socket };
  }

  return { gameId, narrator, narratorCookie, players };
}
