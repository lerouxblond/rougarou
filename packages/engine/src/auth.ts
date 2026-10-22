import type { Actor, PlayerId } from '@rougarou/protocol';

import type { EngineError } from './result.ts';
import type { GameState, PlayerState } from './state.ts';
import { engineError } from './tx.ts';

/**
 * Verifications d'autorisation (`docs/04` §Securite) : seul le meneur envoie
 * une commande de meneur, et seul le joueur concerne agit pour lui-meme.
 */

export function requireNarrator(actor: Actor): EngineError | null {
  return actor.kind === 'narrator' ? null : engineError('FORBIDDEN');
}

export function requireSystem(actor: Actor): EngineError | null {
  return actor.kind === 'system' ? null : engineError('FORBIDDEN');
}

/** L'acteur est un joueur de la partie. */
export function requirePlayer(state: GameState, actor: Actor): PlayerState | EngineError {
  if (actor.kind !== 'player') {
    return engineError('FORBIDDEN');
  }

  return state.players[actor.playerId] ?? engineError('UNKNOWN_PLAYER');
}

/** L'acteur est un joueur vivant : un mort n'agit plus (`R-60`). */
export function requireAlivePlayer(state: GameState, actor: Actor): PlayerState | EngineError {
  const player = requirePlayer(state, actor);

  if (isError(player)) {
    return player;
  }

  return player.alive ? player : engineError('FORBIDDEN', 'errors.dead_cannot_act');
}

/** La cible est un joueur vivant de la partie. */
export function requireAliveTarget(state: GameState, target: PlayerId): EngineError | null {
  const player = state.players[target];

  if (player === undefined) {
    return engineError('UNKNOWN_PLAYER');
  }

  return player.alive ? null : engineError('INVALID_TARGET', 'errors.target_dead');
}

export function isError(value: object): value is EngineError {
  return 'code' in value && 'messageKey' in value;
}
