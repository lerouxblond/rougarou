import type { Actor } from '@rougarou/protocol';

import { isError, requirePlayer } from '../auth.ts';
import { startNight } from '../night/flow.ts';
import type { EngineError } from '../result.ts';
import { seatedPlayers, type GameState } from '../state.ts';
import { clearTimer, engineError, startTimer, type Push, type Tx } from '../tx.ts';

/**
 * Distribution en ceremonie (`R-17`) : la main passe a la place `turn`, avec
 * son minuteur. Apres le dernier joueur, il n'y a plus de main ni de minuteur.
 */
export function passCeremonyTurn(tx: Tx, turn: number): void {
  tx.emit({ type: 'CeremonyTurnPassed', turn });

  if (turn < tx.state.seats.length) {
    startTimer(tx, 'ceremonyCard');
  } else {
    clearTimer(tx);
  }
}

/** La ceremonie est en cours : un joueur a la main (`R-17`). */
function ceremonyRunning(state: GameState): state is GameState & { ceremonyTurn: number } {
  return state.ceremonyTurn !== null && state.ceremonyTurn < state.seats.length;
}

/**
 * Le joueur a-t-il recu sa carte ? Toujours en distribution simultanee ; en
 * ceremonie, une fois sa main venue (`R-17`).
 */
export function cardReached(state: GameState, playerId: string): boolean {
  if (state.phase !== 'DEAL' || state.ceremonyTurn === null) {
    return true;
  }

  return state.seats.indexOf(playerId) <= state.ceremonyTurn;
}

/**
 * « J'ai vu mon role ». Une seconde confirmation ne change rien. En
 * ceremonie, elle passe la main au suivant si c'etait son tour.
 */
export function confirmRoleSeen(tx: Tx, actor: Actor): EngineError | null {
  const player = requirePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  if (tx.state.phase !== 'DEAL') {
    return engineError('WRONG_PHASE');
  }

  if (!cardReached(tx.state, player.id)) {
    return engineError('NOT_YOUR_TURN');
  }

  if (!player.roleSeen) {
    tx.emit({ type: 'RoleSeen', playerId: player.id });
  }

  const { state } = tx;

  if (ceremonyRunning(state) && state.seats[state.ceremonyTurn] === player.id) {
    passCeremonyTurn(tx, state.ceremonyTurn + 1);
  }

  return null;
}

/**
 * Le meneur lance la premiere nuit une fois que tous ont vu leur role, ou en
 * forcant : une confirmation manquante est alors ignoree (`R-13`). En
 * ceremonie, « Suivant » et la fin du minuteur passent la main (`R-17`).
 */
export function advanceDeal(tx: Tx, push: Push): EngineError | null {
  const { state } = tx;

  if (ceremonyRunning(state) && push !== 'force') {
    passCeremonyTurn(tx, state.ceremonyTurn + 1);
    return null;
  }

  const allSeen = seatedPlayers(state).every((player) => player.roleSeen);

  if (!allSeen && push === 'advance') {
    return engineError('PENDING_ACTIONS');
  }

  if (!allSeen && push === 'force') {
    tx.emit({ type: 'PhaseForced', phase: 'DEAL' });
  }

  clearTimer(tx);
  startNight(tx);
  return null;
}
