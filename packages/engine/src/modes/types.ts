import type { Composition, ModeId, RoleId, TeamId } from '@rougarou/protocol';

import type { NightStepSpec } from '../night/types.ts';
import type { GameState, Winner } from '../state.ts';

/**
 * Un mode de jeu, sous forme de plugin (`docs/11`, ADR 0005).
 *
 * La boucle de phases, les votes, le Maire et le pipeline des morts restent
 * communs : un mode ne fait qu'ajouter des etapes de nuit, des conditions de
 * victoire et, plus tard, une retouche de la projection (`project`, M7).
 */
export interface GameModeDefinition {
  readonly id: ModeId;
  /** `disguised` : les joueurs ne voient jamais ce mode (Nuit blanche, M7). */
  readonly disclosure: 'public' | 'disguised';
  readonly teams: readonly TeamId[];
  readonly allowedRoles: readonly RoleId[] | 'all';
  readonly minPlayers: number;
  readonly maxPlayers: number;
  suggestComposition(playerCount: number): Composition;
  /** Problemes propres au mode. Les regles communes sont verifiees par le coeur. */
  validateComposition(composition: Composition, playerCount: number): ValidationIssue[];
  /** Etapes de nuit ajoutees par le mode, en plus de celles des roles. */
  readonly nightSteps: readonly NightStepSpec[];
  readonly winConditions: readonly WinCondition[];
}

/** Un probleme de composition, a traduire cote client. */
export interface ValidationIssue {
  readonly messageKey: string;
}

/**
 * Une condition de victoire. Quand plusieurs sont remplies en meme temps, la
 * plus haute priorite l'emporte (`R-06`).
 */
export interface WinCondition {
  readonly id: string;
  readonly priority: number;
  check(state: GameState): Winner | null;
}
