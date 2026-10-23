import type { PlayerId, RoleId, TeamId } from '@rougarou/protocol';

import type { NightObserverSpec, NightStepSpec, Wakes } from '../night/types.ts';
import type { Tx } from '../tx.ts';

/**
 * Un role, sous forme de plugin (`docs/02` §Modele).
 *
 * Ajouter un role revient a ecrire un fichier qui exporte cette definition et
 * a l'inscrire au registre (`roles/index.ts`), sans toucher au coeur.
 * `onDawn`, `onVoteResolved` et `onTargeted` arrivent avec les roles qui en
 * ont besoin (M6).
 */
export interface RoleDefinition {
  readonly id: RoleId;
  readonly team: TeamId;
  /** `core` : jalon M3 (et M1 pour les loups et les villageois). `extension` : M6. */
  readonly tier: 'core' | 'extension';
  /** Ne peut etre present qu'une fois dans la composition. */
  readonly unique: boolean;
  readonly minPlayers?: number;
  readonly wakes: Wakes;
  /** Ses etapes de nuit (Cupidon en a deux : le choix, puis les amoureux). */
  readonly nightSteps?: readonly NightStepSpec[];
  /** Les etapes d'autres roles qu'il regarde sans les bloquer (la Petite fille). */
  readonly nightObservers?: readonly NightObserverSpec[];
  /**
   * A la mort d'un porteur du role, met en file ses effets (`R-42`) : le tir
   * du Chasseur. Le chagrin et la succession du Maire sont geres par le coeur.
   */
  readonly onDeath?: (tx: Tx, playerId: PlayerId) => void;
  /**
   * Ce role connait le role des autres joueurs du meme camp (les loups entre
   * eux). La projection s'en sert (`projectView`).
   */
  readonly knowsTeammates: boolean;
}
