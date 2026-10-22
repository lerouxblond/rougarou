import type { CommandEnvelope } from '@rougarou/protocol';

import { apply, createGame } from './apply.ts';
import { requireNarrator } from './auth.ts';
import { REVEALING_EVENTS, type GameEvent } from './events.ts';
import { evolve } from './evolve.ts';
import type { EngineError } from './result.ts';
import { emptyState, type GameState } from './state.ts';
import { engineError, type Context } from './tx.ts';

/** Un instantane est pris tous les `SNAPSHOT_EVERY` evenements (`docs/04`). */
export const SNAPSHOT_EVERY = 50;

/** L'etat apres les `seq` premiers evenements du journal. */
export interface Snapshot {
  readonly seq: number;
  readonly state: GameState;
}

/**
 * Le journal d'une partie : les evenements, groupes par commande, l'etat
 * courant et les instantanes. C'est ce que le Durable Object conserve
 * (`docs/04`) ; `Undo` le reecrit (`R-11`).
 */
export interface GameRecord {
  readonly state: GameState;
  readonly groups: readonly (readonly GameEvent[])[];
  readonly snapshots: readonly Snapshot[];
}

export type RecordResult =
  | {
      readonly ok: true;
      readonly record: GameRecord;
      /** Evenements ajoutes au journal. */
      readonly appended: readonly GameEvent[];
      /** Nombre d'evenements retires du journal par une annulation. */
      readonly removed: number;
    }
  | { readonly ok: false; readonly error: EngineError };

/** Nombre total d'evenements d'un journal. */
export function eventCount(record: GameRecord): number {
  return record.groups.reduce((sum, group) => sum + group.length, 0);
}

/** Un nouveau journal, pour une partie dans le salon. */
export function createRecord(gameId: string): GameRecord {
  const { state, events } = createGame(gameId);

  return { state, groups: [events], snapshots: [] };
}

/**
 * Reconstruit l'etat a partir des evenements, depuis un instantane s'il y en
 * a un : `events.reduce(evolve, …)` (ADR 0002). `events` est le journal
 * complet ; seuls ceux qui suivent l'instantane sont rejoues.
 */
export function replay(events: readonly GameEvent[], from?: Snapshot): GameState {
  return events.slice(from?.seq ?? 0).reduce(evolve, from?.state ?? emptyState());
}

/**
 * Applique une commande au journal. `Undo` retire le dernier groupe
 * d'evenements et rejoue le reste ; toute autre commande passe par `apply`.
 */
export function applyToRecord(
  record: GameRecord,
  envelope: CommandEnvelope,
  ctx: Context,
): RecordResult {
  if (envelope.cmd.type === 'Undo') {
    const forbidden = requireNarrator(envelope.actor);

    return forbidden === null ? undo(record) : { ok: false, error: forbidden };
  }

  const result = apply(record.state, envelope, ctx);

  if (!result.ok) {
    return result;
  }

  // Une commande qui ne change rien (confirmation repetee) n'ouvre pas de groupe :
  // l'annulation suivante viserait sinon un groupe vide.
  if (result.events.length === 0) {
    return { ok: true, record, appended: [], removed: 0 };
  }

  const before = eventCount(record);
  const after = before + result.events.length;
  const crossed = Math.floor(after / SNAPSHOT_EVERY) > Math.floor(before / SNAPSHOT_EVERY);

  return {
    ok: true,
    record: {
      state: result.state,
      groups: [...record.groups, result.events],
      snapshots: crossed
        ? [...record.snapshots, { seq: after, state: result.state }]
        : record.snapshots,
    },
    appended: result.events,
    removed: 0,
  };
}

/**
 * `R-11` : annule le dernier groupe, sauf s'il a revele une information aux
 * joueurs (distribution, annonce des morts, cloture d'un vote, election, fin).
 */
function undo(record: GameRecord): RecordResult {
  const last = record.groups.at(-1);

  if (last === undefined || record.groups.length <= 1) {
    return { ok: false, error: engineError('NOTHING_TO_UNDO') };
  }

  if (last.some((event) => REVEALING_EVENTS.has(event.type))) {
    return { ok: false, error: engineError('UNDO_BLOCKED') };
  }

  const groups = record.groups.slice(0, -1);
  const events = groups.flat();
  const snapshots = record.snapshots.filter((snapshot) => snapshot.seq <= events.length);

  return {
    ok: true,
    record: { state: replay(events, snapshots.at(-1)), groups, snapshots },
    appended: [],
    removed: last.length,
  };
}
