import {
  applyToRecord,
  createRecord,
  createRng,
  projectView,
  type GameRecord,
  type RecordResult,
  type Viewer,
} from '@rougarou/engine';
import {
  clientMessageSchema,
  commandSchema,
  messageVersionOf,
  PROTOCOL_VERSION,
  serverMessageSchema,
  type Actor,
  type Command,
  type ErrorCode,
  type ServerMessage,
  type TicketResponse,
} from '@rougarou/protocol';
import { DurableObject } from 'cloudflare:workers';

import { database } from '../auth.ts';
import type { Env } from '../env.ts';
import { log } from '../log.ts';
import { RateLimiter } from './rate-limit.ts';
import { RoomStorage, type MemberKind } from './storage.ts';
import { markPlaying, writeSummary } from './summary.ts';

/** Duree de validite d'un ticket WebSocket (`docs/04` §Authentification). */
export const TICKET_TTL_MS = 30_000;

/** Une partie terminee est gardee 7 jours, pour l'ecran de fin (`docs/04`). */
export const PURGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Ce que chaque socket garde a travers l'hibernation. */
interface Attachment {
  readonly userId: string;
  readonly kind: MemberKind;
}

const v = PROTOCOL_VERSION;

/**
 * Une partie : le seul endroit ou son etat fait autorite (ADR 0001).
 *
 * Il applique les commandes par le moteur, tient le journal dans son SQLite,
 * et envoie a chaque socket **sa** vue projetee (`CLAUDE.md` regles 1 et 2).
 * Les sockets passent par l'API Hibernation : le DO peut dormir entre deux
 * messages sans les fermer.
 */
export class GameRoom extends DurableObject<Env> {
  private readonly storage: RoomStorage;
  private readonly limiter = new RateLimiter<WebSocket>();
  private record: GameRecord | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.storage = new RoomStorage(ctx.storage.sql);
  }

  // --- RPC du Worker ---------------------------------------------------------

  /**
   * Emet un ticket a usage unique pour `userId` (P15). Le Worker a verifie la
   * session et lu dans D1 si l'utilisateur mene la partie ; le premier ticket
   * cree la partie. `null` pour une partie purgee.
   */
  issueTicket(gameId: string, userId: string, narrator: boolean): TicketResponse | null {
    // Une partie purgee ne renait pas sous le meme identifiant.
    if (this.storage.getMeta('purged') !== null) {
      return null;
    }

    if (this.load() === null) {
      const created = createRecord(gameId);

      this.storage.saveCreated(created, Date.now());
      this.storage.setMeta('gameId', gameId);
      this.record = created;
    }

    this.storage.addMember(userId, narrator ? 'narrator' : 'player');

    const bytes = new Uint8Array(32);

    crypto.getRandomValues(bytes);

    const ticket = btoa(String.fromCharCode(...bytes))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const expiresAt = Date.now() + TICKET_TTL_MS;

    this.storage.saveTicket(ticket, userId, expiresAt);
    return { ticket, expiresAt };
  }

  // --- WebSocket -------------------------------------------------------------

  override fetch(request: Request): Response {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response(null, { status: 426 });
    }

    const ticket = new URL(request.url).searchParams.get('ticket') ?? '';
    const userId = this.storage.consumeTicket(ticket, Date.now());
    const kind = userId === null ? null : this.storage.memberKind(userId);

    if (userId === null || kind === null || this.load() === null) {
      return new Response(null, { status: 401 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    const attachment: Attachment = { userId, kind };

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sendState(server);
    this.sendPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = parseJson(message);
    const version = messageVersionOf(raw);

    if (version !== null && version < PROTOCOL_VERSION) {
      this.sendError(ws, 'PROTOCOL_OUTDATED');
      return;
    }

    const parsed = clientMessageSchema.safeParse(raw);

    if (!parsed.success) {
      this.sendError(ws, 'INVALID_MESSAGE');
      return;
    }

    if (parsed.data.t === 'ping') {
      send(ws, { v, t: 'pong' });
      return;
    }

    const { id, cmd } = parsed.data;

    if (!this.limiter.allow(ws, Date.now())) {
      this.sendError(ws, 'RATE_LIMITED', id);
      return;
    }

    const result = await this.execute(actorOf(attachmentOf(ws)), cmd);

    if (result.ok) {
      send(ws, { v, t: 'ack', id });
    } else {
      this.sendError(ws, result.error.code, id, result.error.messageKey);
    }
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    // On termine la poignee de main de fermeture. Les codes reserves (1005,
    // 1006…) ne peuvent pas etre renvoyes : on repond alors par 1000.
    ws.close(code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000);
    this.sendPresence(ws);
  }

  override webSocketError(ws: WebSocket): void {
    this.sendPresence(ws);
  }

  // --- Minuteurs et purge ----------------------------------------------------

  /** Une seule alarme : l'echeance du moteur, ou la purge d'une partie terminee. */
  override async alarm(): Promise<void> {
    const now = Date.now();
    const purgeAt = Number(this.storage.getMeta('purgeAt') ?? Number.NaN);

    if (now >= purgeAt) {
      for (const ws of this.ctx.getWebSockets()) {
        ws.close(1000, 'purged');
      }

      await this.ctx.storage.deleteAll();
      this.storage.ensureSchema();
      this.storage.setMeta('purged', '1');
      this.record = null;
      return;
    }

    const deadline = this.load()?.state.deadline ?? null;

    if (deadline !== null && now >= deadline) {
      await this.execute({ kind: 'system' }, commandSchema.parse({ type: 'Timeout' }));
    } else {
      await this.scheduleAlarm();
    }
  }

  // --- Coeur -----------------------------------------------------------------

  private load(): GameRecord | null {
    this.record ??= this.storage.loadRecord();
    return this.record;
  }

  /** Applique une commande, la journalise, puis diffuse les vues. */
  private async execute(actor: Actor, cmd: Command): Promise<RecordResult> {
    const before = this.load();

    if (before === null) {
      throw new Error('Commande sur une partie qui n existe pas.');
    }

    const now = Date.now();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const result = applyToRecord(before, { actor, cmd }, { now, rng: createRng(seed) });

    if (!result.ok || (result.appended.length === 0 && result.removed === 0)) {
      return result;
    }

    this.ctx.storage.transactionSync(() => {
      this.storage.persist(before, result, now);
      this.storage.setMeta('revision', String(this.revision() + 1));
    });
    this.record = result.record;

    log({
      message: 'command',
      gameId: result.record.state.gameId,
      seq: this.revision(),
      cmd: cmd.type,
    });

    await this.afterCommit(before, result.record, now);

    for (const ws of this.ctx.getWebSockets()) {
      this.sendState(ws);
    }

    this.sendPresence();
    return result;
  }

  /** Effets hors du moteur : D1 et l'alarme. */
  private async afterCommit(before: GameRecord, after: GameRecord, now: number): Promise<void> {
    const db = database(this.env);
    const { state } = after;

    if (before.state.seed === null && state.seed !== null) {
      await markPlaying(db, state.gameId);
    }

    if (before.state.phase !== 'ENDED' && state.phase === 'ENDED') {
      await writeSummary(db, state, now);
      this.storage.setMeta('purgeAt', String(now + PURGE_AFTER_MS));
    }

    await this.scheduleAlarm();
  }

  private async scheduleAlarm(): Promise<void> {
    const candidates = [
      this.load()?.state.deadline ?? null,
      Number(this.storage.getMeta('purgeAt') ?? Number.NaN),
    ].filter((at): at is number => at !== null && Number.isFinite(at));
    const next = Math.min(...candidates);

    if (Number.isFinite(next)) {
      await this.ctx.storage.setAlarm(next);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private revision(): number {
    return Number(this.storage.getMeta('revision') ?? '0');
  }

  // --- Envois ----------------------------------------------------------------

  private sendState(ws: WebSocket): void {
    const record = this.load();

    if (record !== null) {
      send(ws, {
        v,
        t: 'state',
        seq: this.revision(),
        view: projectView(record.state, viewerOf(attachmentOf(ws))),
      });
    }
  }

  /** Les joueurs connectes, envoyes au meneur seul (P14). */
  private sendPresence(closing?: WebSocket): void {
    const sockets = this.ctx.getWebSockets().filter((ws) => ws !== closing);
    const seats = new Set(this.load()?.state.seats ?? []);
    const connected = [
      ...new Set(
        sockets
          .map(attachmentOf)
          .filter((member) => member.kind === 'player' && seats.has(member.userId))
          .map((member) => member.userId),
      ),
    ];

    for (const ws of sockets) {
      if (attachmentOf(ws).kind === 'narrator') {
        send(ws, { v, t: 'presence', connected });
      }
    }
  }

  private sendError(ws: WebSocket, code: ErrorCode, id?: string, messageKey?: string): void {
    send(ws, {
      v,
      t: 'error',
      code,
      messageKey: messageKey ?? `errors.${code.toLowerCase()}`,
      ...(id === undefined ? {} : { id }),
    });
  }
}

/** Tout message sortant est valide par son schema strict avant de partir (`CLAUDE.md` regle 4). */
function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(serverMessageSchema.parse(message)));
}

function parseJson(message: string | ArrayBuffer): unknown {
  try {
    return JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
  } catch {
    return null;
  }
}

function attachmentOf(ws: WebSocket): Attachment {
  return ws.deserializeAttachment() as Attachment;
}

/** L'acteur vient du socket authentifie, jamais du message (`docs/04` §Securite). */
function actorOf(member: Attachment): Actor {
  return member.kind === 'narrator'
    ? { kind: 'narrator' }
    : { kind: 'player', playerId: member.userId };
}

function viewerOf(member: Attachment): Viewer {
  return member.kind === 'narrator'
    ? { kind: 'narrator' }
    : { kind: 'player', playerId: member.userId };
}
