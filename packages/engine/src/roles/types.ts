import type { RoleId, TeamId } from '@rougarou/protocol';

import type { NightStepSpec, Wakes } from '../night/types.ts';

/**
 * Un role, sous forme de plugin (`docs/02` §Modele).
 *
 * Ajouter un role revient a ecrire un fichier qui exporte cette definition et
 * a l'inscrire au registre (`roles/index.ts`), sans toucher au coeur.
 * Les points d'accroche (`onDeath`, `onDawn`…) arrivent avec les roles qui en
 * ont besoin (M3).
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
  readonly nightStep?: NightStepSpec;
  /**
   * Ce role connait le role des autres joueurs du meme camp (les loups entre
   * eux). La projection s'en sert (`projectView`).
   */
  readonly knowsTeammates: boolean;
}
