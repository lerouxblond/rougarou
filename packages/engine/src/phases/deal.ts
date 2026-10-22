import type { Actor } from '@rougarou/protocol';

import { isError, requirePlayer } from '../auth.ts';
import { startNight } from '../night/flow.ts';
import type { EngineError } from '../result.ts';
import { seatedPlayers } from '../state.ts';
import { clearTimer, engineError, type Push, type Tx } from '../tx.ts';

/** « J'ai vu mon role ». Une seconde confirmation ne change rien. */
export function confirmRoleSeen(tx: Tx, actor: Actor): EngineError | null {
  const player = requirePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  if (tx.state.phase !== 'DEAL') {
    return engineError('WRONG_PHASE');
  }

  if (!player.roleSeen) {
    tx.emit({ type: 'RoleSeen', playerId: player.id });
  }

  return null;
}

/**
 * Le meneur lance la premiere nuit une fois que tous ont vu leur role, ou en
 * forcant : une confirmation manquante est alors ignoree (`R-13`).
 */
export function advanceDeal(tx: Tx, push: Push): EngineError | null {
  const allSeen = seatedPlayers(tx.state).every((player) => player.roleSeen);

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
