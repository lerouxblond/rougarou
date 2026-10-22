import type { Actor, PlayerId } from '@rougarou/protocol';

import { isError, requirePlayer } from '../auth.ts';
import { CLASSIC_MAX_PLAYERS } from '../modes/classic.ts';
import type { EngineError } from '../result.ts';
import type { GameState } from '../state.ts';
import { engineError, type Tx } from '../tx.ts';

/** On peut rejoindre, partir ou changer de place tant que les roles ne sont pas distribues. */
function seatingOpen(state: GameState): boolean {
  return state.phase === 'LOBBY' || state.phase === 'CONFIG';
}

export function joinGame(tx: Tx, actor: Actor, name: string): EngineError | null {
  if (actor.kind !== 'player') {
    return engineError('FORBIDDEN');
  }

  if (!seatingOpen(tx.state)) {
    return engineError('WRONG_PHASE');
  }

  if (tx.state.players[actor.playerId] !== undefined) {
    return engineError('INVALID_COMMAND', 'errors.already_joined');
  }

  if (tx.state.seats.length >= CLASSIC_MAX_PLAYERS) {
    return engineError('GAME_FULL');
  }

  tx.emit({ type: 'PlayerJoined', playerId: actor.playerId, name });
  return null;
}

export function leaveGame(tx: Tx, actor: Actor): EngineError | null {
  const player = requirePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  if (!seatingOpen(tx.state)) {
    return engineError('WRONG_PHASE');
  }

  tx.emit({ type: 'PlayerLeft', playerId: player.id, kicked: false });
  return null;
}

export function kickPlayer(tx: Tx, playerId: PlayerId): EngineError | null {
  if (!seatingOpen(tx.state)) {
    return engineError('WRONG_PHASE');
  }

  if (tx.state.players[playerId] === undefined) {
    return engineError('UNKNOWN_PLAYER');
  }

  tx.emit({ type: 'PlayerLeft', playerId, kicked: true });
  return null;
}

/** Le meneur reordonne les places : `order` doit etre une permutation des joueurs. */
export function reorderSeats(tx: Tx, order: readonly PlayerId[]): EngineError | null {
  if (!seatingOpen(tx.state)) {
    return engineError('WRONG_PHASE');
  }

  const current = new Set(tx.state.seats);
  const isPermutation =
    order.length === current.size &&
    new Set(order).size === order.length &&
    order.every((id) => current.has(id));

  if (!isPermutation) {
    return engineError('INVALID_COMMAND', 'errors.seats_not_permutation');
  }

  tx.emit({ type: 'SeatsReordered', order });
  return null;
}

/** « Configurer » : le salon passe a la configuration. */
export function openConfig(tx: Tx): EngineError | null {
  tx.emit({ type: 'PhaseChanged', phase: 'CONFIG' });
  return null;
}
