import type {
  CommandInput,
  ErrorCode,
  NarratorView,
  PlayerView,
  ServerMessage,
} from '@rougarou/protocol';
import { create } from 'zustand';

import { api } from '../api.ts';
import {
  GameConnection,
  type ConnectionDeps,
  type ConnectionStatus,
  type SocketLike,
} from './socket.ts';

/** La reponse du serveur a une commande. */
export type CommandReply = { ok: true } | { ok: false; code: ErrorCode; messageKey: string };

export interface GameStore {
  readonly gameId: string | null;
  readonly status: ConnectionStatus;
  /** La derniere vue recue fait foi : aucun etat de jeu n'est calcule ici (`docs/04`). */
  readonly view: PlayerView | NarratorView | null;
  /** Joueurs connectes, connus du meneur seul (P14). */
  readonly connected: readonly string[];
  /** Derniere erreur sans commande associee (`PROTOCOL_OUTDATED`…). */
  readonly error: { code: ErrorCode; messageKey: string } | null;
}

const initial: GameStore = {
  gameId: null,
  status: 'closed',
  view: null,
  connected: [],
  error: null,
};

export const useGameStore = create<GameStore>()(() => initial);

/** Une WebSocket du navigateur, sous la forme minimale dont la connexion a besoin. */
function openBrowserSocket(url: string): SocketLike {
  const ws = new WebSocket(url);
  const socket: SocketLike = {
    send: (data) => {
      ws.send(data);
    },
    close: (code) => {
      ws.close(code);
    },
    onopen: null,
    onmessage: null,
    onclose: null,
  };

  ws.onopen = () => socket.onopen?.();
  ws.onmessage = (event) => socket.onmessage?.({ data: event.data });
  ws.onclose = () => socket.onclose?.();
  return socket;
}

/** Le reseau du navigateur. */
export const browserDeps: ConnectionDeps = {
  ticket: (gameId) => api.ticket(gameId),
  open: openBrowserSocket,
  url: (gameId, ticket) => {
    const { protocol, host } = window.location;

    return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws/${gameId}?ticket=${ticket}`;
  },
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (handle) => {
    window.clearTimeout(handle as number);
  },
};

let connection: GameConnection | null = null;
const pending = new Map<string, (reply: CommandReply) => void>();

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'state':
      useGameStore.setState({ view: message.view });
      return;
    case 'presence':
      useGameStore.setState({ connected: message.connected });
      return;
    case 'ack':
      pending.get(message.id)?.({ ok: true });
      pending.delete(message.id);
      return;
    case 'error': {
      const reply = { code: message.code, messageKey: message.messageKey };
      const resolve = message.id === undefined ? undefined : pending.get(message.id);

      if (resolve === undefined) {
        useGameStore.setState({ error: reply });
      } else {
        resolve({ ok: false, ...reply });
        pending.delete(message.id ?? '');
      }

      return;
    }
    case 'pong':
      return;
  }
}

/** Se connecte a une partie ; la connexion precedente est fermee. */
export function joinRoom(gameId: string, deps: ConnectionDeps = browserDeps): void {
  leaveRoom();
  useGameStore.setState({ ...initial, gameId });
  connection = new GameConnection(gameId, deps, {
    onMessage: receive,
    onStatus: (status) => {
      useGameStore.setState({ status });
    },
  });
  connection.start();
}

export function leaveRoom(): void {
  connection?.stop();
  connection = null;

  for (const resolve of pending.values()) {
    resolve({ ok: false, code: 'INTERNAL', messageKey: 'errors.network' });
  }

  pending.clear();
  useGameStore.setState(initial);
}

/** Envoie une commande et attend sa reponse. */
export function sendCommand(cmd: CommandInput): Promise<CommandReply> {
  const id = connection?.send(cmd) ?? null;

  if (id === null) {
    return Promise.resolve({ ok: false, code: 'INTERNAL', messageKey: 'errors.network' });
  }

  return new Promise((resolve) => {
    pending.set(id, resolve);
  });
}
