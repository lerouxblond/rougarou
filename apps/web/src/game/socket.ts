import {
  clientMessageSchema,
  PROTOCOL_VERSION,
  serverMessageSchema,
  type ClientMessage,
  type CommandInput,
  type ServerMessage,
} from '@rougarou/protocol';

/** Etat de la connexion, affiche par l'indicateur (US-90). */
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** Le minimum d'une WebSocket dont la connexion a besoin. */
export interface SocketLike {
  send(data: string): void;
  close(code?: number): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
}

/** Ce que la connexion recoit de l'exterieur : le reseau et l'horloge, injectes pour les tests. */
export interface ConnectionDeps {
  /** Obtient un ticket a usage unique (`POST /api/games/:id/ticket`). */
  ticket(gameId: string): Promise<string>;
  open(url: string): SocketLike;
  /** URL de la WebSocket pour ce ticket. */
  url(gameId: string, ticket: string): string;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ConnectionHandlers {
  onMessage(message: ServerMessage): void;
  onStatus(status: ConnectionStatus): void;
}

/** Delais de reconnexion : 0,5 s, puis double a chaque echec, plafonne a 10 s (US-90). */
export function backoff(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 10_000);
}

/**
 * La connexion d'un client a une partie.
 *
 * Chaque message recu est valide par le schema partage, et un message hors
 * protocole est ignore (`CLAUDE.md` regle 4). Le serveur renvoie la vue
 * complete a chaque connexion, donc une coupure ou un trou dans `seq` se
 * resout en se reconnectant.
 */
export class GameConnection {
  private socket: SocketLike | null = null;
  private retry: unknown = null;
  private attempt = 0;
  private lastSeq: number | null = null;
  private counter = 0;
  private stopped = false;
  private readonly gameId: string;
  private readonly deps: ConnectionDeps;
  private readonly handlers: ConnectionHandlers;

  constructor(gameId: string, deps: ConnectionDeps, handlers: ConnectionHandlers) {
    this.gameId = gameId;
    this.deps = deps;
    this.handlers = handlers;
  }

  start(): void {
    this.stopped = false;
    this.handlers.onStatus('connecting');
    void this.connect();
  }

  stop(): void {
    this.stopped = true;

    if (this.retry !== null) {
      this.deps.clearTimeout(this.retry);
      this.retry = null;
    }

    this.socket?.close(1000);
    this.socket = null;
    this.handlers.onStatus('closed');
  }

  /** Envoie une commande ; renvoie son identifiant de correlation, ou `null` hors ligne. */
  send(cmd: CommandInput): string | null {
    if (this.socket === null) {
      return null;
    }

    this.counter += 1;
    const id = `c${String(this.counter)}`;
    const message: ClientMessage = clientMessageSchema.parse({
      v: PROTOCOL_VERSION,
      t: 'cmd',
      id,
      cmd,
    });

    this.socket.send(JSON.stringify(message));
    return id;
  }

  private async connect(): Promise<void> {
    let ticket: string;

    try {
      ticket = await this.deps.ticket(this.gameId);
    } catch {
      this.scheduleRetry();
      return;
    }

    if (this.stopped) {
      return;
    }

    const socket = this.deps.open(this.deps.url(this.gameId, ticket));

    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.handlers.onStatus('open');
    };
    socket.onmessage = (event) => {
      this.receive(event.data);
    };
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        this.scheduleRetry();
      }
    };
  }

  private receive(data: unknown): void {
    let parsed: ReturnType<typeof serverMessageSchema.safeParse>;

    try {
      parsed = serverMessageSchema.safeParse(JSON.parse(String(data)));
    } catch {
      return;
    }

    if (!parsed.success) {
      return;
    }

    const message = parsed.data;

    if (message.t === 'state') {
      // Un trou dans la sequence : on a manque une vue, on se resynchronise.
      if (this.lastSeq !== null && message.seq > this.lastSeq + 1) {
        this.lastSeq = null;
        this.socket?.close(4000);
        return;
      }

      this.lastSeq = message.seq;
    }

    this.handlers.onMessage(message);
  }

  private scheduleRetry(): void {
    if (this.stopped) {
      return;
    }

    this.lastSeq = null;
    this.handlers.onStatus('reconnecting');

    const delay = backoff(this.attempt);

    this.attempt += 1;
    this.retry = this.deps.setTimeout(() => {
      this.retry = null;
      void this.connect();
    }, delay);
  }
}
