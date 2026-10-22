import { getPlayer } from '../state.ts';
import type { RoleDefinition } from './types.ts';

/**
 * Chasseur (`docs/02`) : a sa mort, quelle qu'en soit la cause, il tire sur
 * un vivant. Le tir attend dans la file des effets (`R-42`) et se resout par
 * `HunterShoot`, ou sans tir a la fin du minuteur (`R-46`).
 */
export const hunter: RoleDefinition = {
  id: 'hunter',
  team: 'village',
  tier: 'core',
  unique: true,
  wakes: 'never',
  knowsTeammates: false,

  onDeath(tx, playerId) {
    // `R-45` : la file est publique, son role l'est donc aussi des que le tir est attendu.
    if (!getPlayer(tx.state, playerId).roleRevealed) {
      tx.emit({ type: 'RoleRevealed', playerId });
    }

    tx.emit({ type: 'EffectQueued', effect: { kind: 'hunterShot', from: playerId } });
  },
};
