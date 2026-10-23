import type { Actor, PlayerId, TimerKey } from '@rougarou/protocol';

import { isError, requireAliveTarget, requirePlayer } from './auth.ts';
import type { EngineError } from './result.ts';
import { getRole } from './roles/index.ts';
import {
  alivePlayers,
  getPlayer,
  type Death,
  type GameState,
  type PendingEffect,
} from './state.ts';
import { clearTimer, engineError, startTimer, type Push, type Tx } from './tx.ts';
import { checkVictory } from './victory.ts';

/**
 * Pipeline des morts (`R-40` a `R-46`).
 *
 * Une vague de morts (l'aube, l'execution, un tir) applique ses effets dans
 * l'ordre de `R-42` : d'abord tous les chagrins des amoureux, puis les tirs de
 * Chasseur, puis les successions du Maire. Les effets qui demandent un choix
 * attendent dans `state.pending`, et ceux d'une vague suivante s'ajoutent a la
 * fin. Quand la file est vide, on verifie la victoire (`R-05`, `R-44`).
 */
export function killPlayers(tx: Tx, deaths: readonly Death[]): void {
  const wave: PlayerId[] = [];

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
    wave.push(death.playerId);
  }

  for (const playerId of wave) {
    const { role } = getPlayer(tx.state, playerId);

    if (role !== null) {
      getRole(role).onDeath?.(tx, playerId);
    }
  }

  for (const playerId of wave) {
    if (tx.state.mayor === playerId) {
      onMayorDeath(tx, playerId);
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

/** Le minuteur de chaque genre d'effet (D-02). */
const EFFECT_TIMERS: Readonly<Record<PendingEffect['kind'], TimerKey>> = {
  hunterShot: 'hunterShot',
  mayorSuccession: 'mayorSuccessor',
};

/**
 * Resout l'effet en tete de file avec sa valeur par defaut (`R-13`, `R-46`) :
 * le Chasseur ne tire pas, le successeur du Maire est tire au sort. Aucune ne
 * tue personne.
 */
function settleByDefault(tx: Tx, effect: PendingEffect): void {
  if (effect.kind === 'mayorSuccession') {
    const successor = tx.ctx.rng.pick(alivePlayers(tx.state)).id;

    tx.emit({ type: 'MayorDesignated', from: effect.from, to: successor, drawn: true });
  }

  tx.emit({ type: 'EffectResolved' });
}

/** Resout la file d'effets jusqu'au premier qui attend un joueur, puis verifie la victoire. */
function runPipeline(tx: Tx): void {
  for (let [effect] = tx.state.pending; effect !== undefined; [effect] = tx.state.pending) {
    // `R-44` : la succession ne peut tuer personne ; inutile si la partie est jouee.
    if (effect.kind === 'mayorSuccession' && checkVictory(tx.state) !== null) {
      tx.emit({ type: 'EffectResolved' });
      tx.emit({ type: 'MayorRemoved', playerId: effect.from });
      continue;
    }

    // Plus personne a viser : le tir n'a pas lieu.
    if (effect.kind === 'hunterShot' && alivePlayers(tx.state).length === 0) {
      tx.emit({ type: 'EffectResolved' });
      continue;
    }

    startTimer(tx, EFFECT_TIMERS[effect.kind]);
    return;
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

/** L'effet en tete de file, s'il est de ce genre et attend ce joueur. */
function headEffect(
  tx: Tx,
  actor: Actor,
  kind: PendingEffect['kind'],
): { readonly player: PlayerId } | EngineError {
  const player = requirePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  const [effect] = tx.state.pending;

  return effect?.kind === kind && effect.from === player.id
    ? { player: player.id }
    : engineError('NOT_YOUR_TURN');
}

/** Le Maire mort designe son successeur parmi les vivants (`R-52`). */
export function designateSuccessor(tx: Tx, actor: Actor, target: PlayerId): EngineError | null {
  const head = headEffect(tx, actor, 'mayorSuccession');

  if (isError(head)) {
    return head;
  }

  const targetError = requireAliveTarget(tx.state, target);

  if (targetError !== null) {
    return targetError;
  }

  tx.emit({ type: 'MayorDesignated', from: head.player, to: target, drawn: false });
  tx.emit({ type: 'EffectResolved' });
  clearTimer(tx);
  runPipeline(tx);
  return null;
}

/**
 * Le Chasseur mort tire sur un vivant (`docs/02`). Sa victime meurt avec la
 * cause `hunter` et forme une nouvelle vague, dont les effets s'ajoutent a la
 * fin de la file (`R-42`).
 */
export function hunterShoot(tx: Tx, actor: Actor, target: PlayerId): EngineError | null {
  const head = headEffect(tx, actor, 'hunterShot');

  if (isError(head)) {
    return head;
  }

  const targetError = requireAliveTarget(tx.state, target);

  if (targetError !== null) {
    return targetError;
  }

  tx.emit({ type: 'HunterShot', from: head.player, target });
  tx.emit({ type: 'EffectResolved' });
  clearTimer(tx);
  killPlayers(tx, [{ playerId: target, cause: 'hunter' }]);
  return null;
}

/**
 * Le meneur veut passer alors que des effets attendent. A la fin du minuteur,
 * l'effet en tete prend sa valeur par defaut, et le suivant lance son propre
 * minuteur ; un forcage resout toute la file ainsi (`R-13`, `R-46`).
 *
 * Renvoie une erreur si l'on ne peut pas passer, `null` sinon.
 */
export function settlePendingEffects(tx: Tx, push: Push): EngineError | null {
  const [head] = tx.state.pending;

  if (head === undefined) {
    return null;
  }

  if (push === 'advance') {
    return engineError('PENDING_ACTIONS');
  }

  if (push === 'force') {
    tx.emit({ type: 'PhaseForced', phase: tx.state.phase });

    for (const effect of tx.state.pending) {
      settleByDefault(tx, effect);
    }
  } else {
    settleByDefault(tx, head);
  }

  clearTimer(tx);
  runPipeline(tx);
  return null;
}
