import type { Actor, PlayerId } from '@rougarou/protocol';

import { isError, requireAliveTarget, requirePlayer } from './auth.ts';
import type { EngineError } from './result.ts';
import { alivePlayers, type Death, type GameState } from './state.ts';
import { clearTimer, engineError, startTimer, type Push, type Tx } from './tx.ts';
import { checkVictory } from './victory.ts';

/**
 * Pipeline des morts (`R-40` a `R-44`).
 *
 * Chaque mort applique ses effets « a la mort » dans l'ordre de `R-42`
 * (chagrin des amoureux et Chasseur en M3, puis succession du Maire). Les
 * effets qui demandent un choix attendent dans `state.pending`. Quand la file
 * est vide, on verifie la victoire (`R-05`, `R-44`).
 */
export function killPlayers(tx: Tx, deaths: readonly Death[]): void {
  for (const death of deaths) {
    if (tx.state.players[death.playerId]?.alive !== true) {
      continue;
    }

    tx.emit({
      type: 'PlayerKilled',
      playerId: death.playerId,
      cause: death.cause,
      roleRevealed: tx.state.options.revealRoleOnDeath,
    });

    if (tx.state.mayor === death.playerId) {
      onMayorDeath(tx, death.playerId);
    }
  }

  runPipeline(tx);
}

/** `R-52` : le Maire designe son successeur, ou le titre disparait jusqu'a la reelection. */
function onMayorDeath(tx: Tx, mayor: PlayerId): void {
  if (tx.state.options.mayorSuccession === 'designate') {
    tx.emit({ type: 'EffectQueued', effect: { kind: 'mayorSuccession', from: mayor } });
  } else {
    tx.emit({ type: 'MayorRemoved', playerId: mayor });
  }
}

/** Resout la file d'effets jusqu'au premier qui attend un joueur, puis verifie la victoire. */
function runPipeline(tx: Tx): void {
  for (const effect of tx.state.pending) {
    // `R-44` : la succession ne peut tuer personne ; inutile si la partie est jouee.
    if (checkVictory(tx.state) === null) {
      startTimer(tx, 'mayorSuccessor');
      return;
    }

    tx.emit({ type: 'EffectResolved' });
    tx.emit({ type: 'MayorRemoved', playerId: effect.from });
  }

  const winner = checkVictory(tx.state);

  if (winner !== null) {
    clearTimer(tx);
    tx.emit({ type: 'GameEnded', winner });
    tx.emit({ type: 'PhaseChanged', phase: 'ENDED' });
  }
}

/** Des effets a la mort attendent encore un joueur. */
export function hasPendingEffects(state: GameState): boolean {
  return state.pending.length > 0;
}

/** Le Maire mort designe son successeur parmi les vivants (`R-52`). */
export function designateSuccessor(tx: Tx, actor: Actor, target: PlayerId): EngineError | null {
  const player = requirePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  const [effect] = tx.state.pending;

  if (effect?.from !== player.id) {
    return engineError('NOT_YOUR_TURN');
  }

  const targetError = requireAliveTarget(tx.state, target);

  if (targetError !== null) {
    return targetError;
  }

  tx.emit({ type: 'MayorDesignated', from: player.id, to: target, drawn: false });
  tx.emit({ type: 'EffectResolved' });
  clearTimer(tx);
  runPipeline(tx);
  return null;
}

/**
 * Le meneur veut passer alors que des effets attendent : en forcant, ou a la
 * fin du minuteur, ils prennent leur valeur par defaut (`R-13`) : le
 * successeur du Maire est tire au sort.
 *
 * Renvoie une erreur si l'on ne peut pas passer, `null` sinon.
 */
export function settlePendingEffects(tx: Tx, push: Push): EngineError | null {
  if (!hasPendingEffects(tx.state)) {
    return null;
  }

  if (push === 'advance') {
    return engineError('PENDING_ACTIONS');
  }

  if (push === 'force') {
    tx.emit({ type: 'PhaseForced', phase: tx.state.phase });
  }

  for (const effect of tx.state.pending) {
    const successor = tx.ctx.rng.pick(alivePlayers(tx.state)).id;

    tx.emit({ type: 'MayorDesignated', from: effect.from, to: successor, drawn: true });
    tx.emit({ type: 'EffectResolved' });
  }

  clearTimer(tx);
  runPipeline(tx);
  return null;
}
