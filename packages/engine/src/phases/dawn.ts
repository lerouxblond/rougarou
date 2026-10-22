import { killPlayers, settlePendingEffects } from '../deaths.ts';
import type { EngineError } from '../result.ts';
import type { Push, Tx } from '../tx.ts';
import { startDay } from './day.ts';

/**
 * L'aube en deux temps (`R-12`) :
 * 1. « Lever le jour » annonce les morts calculees a la fin de la nuit, puis
 *    les effets a la mort s'enchainent (`R-41`) ;
 * 2. une fois la file d'effets vide, le meneur passe au jour.
 */
export function advanceDawn(tx: Tx, push: Push): EngineError | null {
  const { dawn } = tx.state;

  if (dawn === null) {
    throw new Error('Aube sans morts calculees.');
  }

  if (!dawn.announced) {
    tx.emit({ type: 'DeathsAnnounced' });
    killPlayers(tx, dawn.deaths);
    return null;
  }

  const blocked = settlePendingEffects(tx, push);

  // Un minuteur expire resout l'effet en attente, mais c'est le meneur qui
  // passe au jour (`docs/12` §1).
  if (blocked !== null || push === 'timeout' || tx.state.phase === 'ENDED') {
    return blocked;
  }

  startDay(tx);
  return null;
}
