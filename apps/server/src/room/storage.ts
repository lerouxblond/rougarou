import {
  eventCount,
  replay,
  type GameEvent,
  type GameRecord,
  type RecordResult,
  type Snapshot,
} from '@rougarou/engine';

/** Qui est a la table : le meneur, ou un joueur (`docs/04` §Durable Object). */
export type MemberKind = 'narrator' | 'player';

/**
 * Le SQLite du Durable Object (`docs/04`). C'est le seul endroit du serveur
 * ou l'on ecrit du SQL a la main (`docs/05` §Interdit).
 *
 * - `events` : le journal ; `grp` numerote la commande qui a produit
 *   l'evenement, pour que `Undo` retire un groupe entier (`R-11`).
 * - `snapshot` : l'etat tous les 50 evenements (ADR 0002).
 * - `members` : le meneur et les utilisateurs qui ont ouvert la partie.
 * - `meta` : identifiant, revision et echeances de la partie.
 * - `ticket` : tickets WebSocket a usage unique (P15).
 */
const SCHEMA = `
  create table if not exists events (
    seq integer primary key,
    grp integer not null,
    type text not null,
    payload text not null,
    at integer not null
  );
  create table if not exists snapshot (seq integer primary key, state text not null);
  create table if not exists members (user_id text primary key, kind text not null);
  create table if not exists meta (key text primary key, value text not null);
  create table if not exists ticket (
    ticket text primary key,
    user_id text not null,
    expires_at integer not null
  );
`;

export class RoomStorage {
  private readonly sql: SqlStorage;

  constructor(sql: SqlStorage) {
    this.sql = sql;
    this.ensureSchema();
  }

  /** Cree les tables ; a rappeler apres `deleteAll()`. */
  ensureSchema(): void {
    this.sql.exec(SCHEMA);
  }

  // --- Meta ------------------------------------------------------------------

  getMeta(key: string): string | null {
    const [row] = this.sql
      .exec<{ value: string }>('select value from meta where key = ?', key)
      .toArray();

    return row?.value ?? null;
  }

  setMeta(key: string, value: string | null): void {
    if (value === null) {
      this.sql.exec('delete from meta where key = ?', key);
    } else {
      this.sql.exec('insert or replace into meta (key, value) values (?, ?)', key, value);
    }
  }

  // --- Membres ---------------------------------------------------------------

  memberKind(userId: string): MemberKind | null {
    const [row] = this.sql
      .exec<{ kind: MemberKind }>('select kind from members where user_id = ?', userId)
      .toArray();

    return row?.kind ?? null;
  }

  addMember(userId: string, kind: MemberKind): void {
    this.sql.exec('insert or ignore into members (user_id, kind) values (?, ?)', userId, kind);
  }

  // --- Tickets ---------------------------------------------------------------

  saveTicket(ticket: string, userId: string, expiresAt: number): void {
    this.sql.exec(
      'insert into ticket (ticket, user_id, expires_at) values (?, ?, ?)',
      ticket,
      userId,
      expiresAt,
    );
  }

  /** Consomme un ticket : il est efface au premier usage, valide ou non (P15). */
  consumeTicket(ticket: string, now: number): string | null {
    const [row] = this.sql
      .exec<{ user_id: string; expires_at: number }>(
        'delete from ticket where ticket = ? returning user_id, expires_at',
        ticket,
      )
      .toArray();

    this.sql.exec('delete from ticket where expires_at < ?', now);

    return row !== undefined && row.expires_at >= now ? row.user_id : null;
  }

  // --- Journal ---------------------------------------------------------------

  /** Le journal complet, ou `null` pour une partie jamais creee. */
  loadRecord(): GameRecord | null {
    const rows = this.sql
      .exec<{ grp: number; payload: string }>('select grp, payload from events order by seq')
      .toArray();

    if (rows.length === 0) {
      return null;
    }

    const groups: GameEvent[][] = [];
    let current = -1;

    for (const row of rows) {
      if (row.grp !== current) {
        groups.push([]);
        current = row.grp;
      }

      // Le journal n'est ecrit que par ce Durable Object, a partir d'evenements du moteur.
      groups.at(-1)?.push(JSON.parse(row.payload) as GameEvent);
    }

    const snapshots: Snapshot[] = this.sql
      .exec<{ seq: number; state: string }>('select seq, state from snapshot order by seq')
      .toArray()
      .map((row) => ({ seq: row.seq, state: JSON.parse(row.state) as Snapshot['state'] }));

    return { state: replay(groups.flat(), snapshots.at(-1)), groups, snapshots };
  }

  /** Ecrit le premier groupe d'une partie neuve. */
  saveCreated(record: GameRecord, at: number): void {
    this.appendGroup(0, record.groups[0] ?? [], at);
  }

  /** Reporte dans SQLite ce qu'une commande a change dans le journal. */
  persist(before: GameRecord, result: Extract<RecordResult, { ok: true }>, at: number): void {
    if (result.removed > 0) {
      const grp = before.groups.length - 1;

      this.sql.exec('delete from events where grp = ?', grp);
      this.sql.exec('delete from snapshot where seq > ?', eventCount(result.record));
      return;
    }

    if (result.appended.length > 0) {
      this.appendGroup(result.record.groups.length - 1, result.appended, at);
    }

    const latest = result.record.snapshots.at(-1);

    if (latest !== undefined && latest !== before.snapshots.at(-1)) {
      this.sql.exec(
        'insert or replace into snapshot (seq, state) values (?, ?)',
        latest.seq,
        JSON.stringify(latest.state),
      );
    }
  }

  private appendGroup(grp: number, events: readonly GameEvent[], at: number): void {
    for (const event of events) {
      this.sql.exec(
        'insert into events (grp, type, payload, at) values (?, ?, ?, ?)',
        grp,
        event.type,
        JSON.stringify(event),
        at,
      );
    }
  }
}
