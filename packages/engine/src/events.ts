import type {
  Ballot,
  Composition,
  GameOptions,
  Knowledge,
  Phase,
  PlayerId,
  RoleId,
  VoteOutcome,
} from '@rougarou/protocol';

import type { Death, NightStepId, PendingEffect, Winner } from './state.ts';

/**
 * Les evenements : des faits, au participe passe (`docs/09`).
 *
 * Chaque evenement porte tout ce qu'il faut pour etre rejoue sans alea : un
 * tirage au sort est enregistre avec son resultat (ADR 0002). Ils restent
 * internes au serveur et contiennent l'information cachee (ADR 0008).
 */
export type GameEvent =
  | { readonly type: 'GameCreated'; readonly gameId: string }
  // Salon
  | { readonly type: 'PlayerJoined'; readonly playerId: PlayerId; readonly name: string }
  | { readonly type: 'PlayerLeft'; readonly playerId: PlayerId; readonly kicked: boolean }
  | { readonly type: 'SeatsReordered'; readonly order: readonly PlayerId[] }
  // Configuration et distribution
  | { readonly type: 'OptionsSet'; readonly options: GameOptions }
  | { readonly type: 'CompositionSet'; readonly composition: Composition }
  | {
      readonly type: 'RolesDealt';
      readonly seed: number;
      readonly assignments: Readonly<Record<PlayerId, RoleId>>;
    }
  | { readonly type: 'RoleSeen'; readonly playerId: PlayerId }
  // Pilotage
  | { readonly type: 'PhaseChanged'; readonly phase: Phase }
  | { readonly type: 'PhaseForced'; readonly phase: Phase }
  | { readonly type: 'TimerExpired'; readonly phase: Phase }
  | { readonly type: 'DeadlineSet'; readonly deadline: number | null }
  | { readonly type: 'TimerPaused'; readonly remaining: number }
  | { readonly type: 'TimerResumed'; readonly deadline: number }
  | { readonly type: 'TimerExtended'; readonly by: number }
  // Nuit
  | {
      readonly type: 'NightStarted';
      readonly number: number;
      readonly steps: readonly NightStepId[];
    }
  | { readonly type: 'NightStepStarted'; readonly index: number }
  | { readonly type: 'WolfVoteCast'; readonly wolf: PlayerId; readonly target: PlayerId }
  | { readonly type: 'WolfTieDetected'; readonly tied: readonly PlayerId[] }
  | { readonly type: 'WolvesResolved'; readonly victim: PlayerId | null }
  // Une etape de nuit autre que celle des loups est terminee.
  | { readonly type: 'NightStepResolved' }
  | {
      readonly type: 'WitchActed';
      readonly witch: PlayerId;
      readonly save: boolean;
      readonly kill: PlayerId | null;
    }
  | { readonly type: 'NightEnded'; readonly deaths: readonly Death[] }
  // Morts
  | { readonly type: 'DeathsAnnounced' }
  | {
      readonly type: 'PlayerKilled';
      readonly playerId: PlayerId;
      readonly cause: Death['cause'];
      readonly roleRevealed: boolean;
    }
  | { readonly type: 'EffectQueued'; readonly effect: PendingEffect }
  | { readonly type: 'EffectResolved' }
  // Le role d'un vivant devient public (tir du Chasseur, `R-45`).
  | { readonly type: 'RoleRevealed'; readonly playerId: PlayerId }
  // Informations privees (ADR 0010)
  | { readonly type: 'KnowledgeGained'; readonly playerId: PlayerId; readonly knowledge: Knowledge }
  // Maire
  | {
      readonly type: 'MayorDesignated';
      readonly from: PlayerId;
      readonly to: PlayerId;
      readonly drawn: boolean;
    }
  | { readonly type: 'MayorRemoved'; readonly playerId: PlayerId }
  | { readonly type: 'HunterShot'; readonly from: PlayerId; readonly target: PlayerId }
  | { readonly type: 'ElectionStarted' }
  | { readonly type: 'CandidacyDeclared'; readonly playerId: PlayerId }
  | { readonly type: 'CandidacyWithdrawn'; readonly playerId: PlayerId }
  | {
      readonly type: 'ElectionVoteOpened';
      readonly eligible: readonly PlayerId[];
      readonly round: 1 | 2;
    }
  | { readonly type: 'ElectionVoteCast'; readonly voter: PlayerId; readonly target: PlayerId }
  | { readonly type: 'ElectionVoteClosed'; readonly tally: Readonly<Record<PlayerId, number>> }
  | { readonly type: 'MayorElected'; readonly playerId: PlayerId; readonly drawn: boolean }
  // Vote du village
  | {
      readonly type: 'VoteOpened';
      readonly candidates: readonly PlayerId[];
      readonly spare: boolean;
      readonly round: 1 | 2;
    }
  | { readonly type: 'VoteCast'; readonly voter: PlayerId; readonly ballot: Ballot }
  | {
      readonly type: 'VoteClosed';
      readonly tally: Readonly<Record<string, number>>;
      readonly outcome: VoteOutcome;
    }
  | { readonly type: 'TieBreakRequested'; readonly tied: readonly PlayerId[] }
  | { readonly type: 'TieBroken'; readonly playerId: PlayerId | null }
  | { readonly type: 'ExecutionStarted'; readonly target: PlayerId | null }
  // Fin
  | { readonly type: 'GameEnded'; readonly winner: Winner };

/** Le type d'un evenement. */
export type GameEventType = GameEvent['type'];

/**
 * Evenements qui revelent une information aux joueurs : une commande qui en a
 * produit un ne peut plus etre annulee (`R-11`).
 */
export const REVEALING_EVENTS: ReadonlySet<GameEventType> = new Set<GameEventType>([
  'GameCreated',
  'RolesDealt',
  'DeathsAnnounced',
  'RoleRevealed',
  'KnowledgeGained',
  'HunterShot',
  'ElectionVoteClosed',
  'MayorElected',
  'VoteClosed',
  'GameEnded',
]);
