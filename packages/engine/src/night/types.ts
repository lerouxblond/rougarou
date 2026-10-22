import type {
  ActionDescriptor,
  NightAction,
  PlayerId,
  PlayerView,
  TimerKey,
} from '@rougarou/protocol';

import type { EngineError } from '../result.ts';
import type { Death, GameState, NightStepId } from '../state.ts';
import type { Tx } from '../tx.ts';

/** Quand un role se reveille (`docs/02` §Modele). */
export type Wakes = 'never' | 'firstNight' | 'everyNight' | 'everyOtherNight';

/** Ce qu'un joueur voit de l'etape de nuit en cours. */
export type PlayerNightView = NonNullable<PlayerView['night']>;

/**
 * Une sous-etape de nuit, declaree par un role ou par un mode (`R-20`).
 *
 * Le coeur du moteur ne connait que cette interface : il ordonne les etapes,
 * lance leur minuteur, et leur transmet les actions. Ce qui se passe dans une
 * etape appartient au role qui la declare.
 */
export interface NightStepSpec {
  readonly id: NightStepId;
  /** Plus petit = plus tot (`docs/02` §Ordre de nuit). */
  readonly order: number;
  readonly wakes: Wakes;
  readonly timer: TimerKey;
  /** Les joueurs vivants qui agissent pendant cette etape. */
  actors(state: GameState): PlayerId[];
  /**
   * L'etape se joue-t-elle cette nuit ? Par defaut, s'il y a des acteurs au
   * debut de la nuit. Une etape dont les acteurs ne sont connus qu'en cours de
   * nuit (les amoureux) le precise.
   */
  scheduled?(state: GameState): boolean;
  /** Ce qui se passe a l'entree dans l'etape, avant tout choix (les amoureux se decouvrent). */
  onEnter?(tx: Tx): void;
  /** Enregistre l'action d'un acteur, et resout l'etape si elle est complete. */
  submit(tx: Tx, actor: PlayerId, action: NightAction): EngineError | null;
  /** Resout l'etape avec l'action par defaut : minuteur ou forcage (`R-10`, `R-13`). */
  resolveByDefault(tx: Tx): void;
  /** Ce qu'un acteur peut faire pendant l'etape (`availableActions`). */
  actionsFor(state: GameState, actor: PlayerId): ActionDescriptor[];
  /** Ce qu'un acteur voit de l'etape. Les autres joueurs n'en voient rien (`docs/12` §4). */
  viewFor(state: GameState, actor: PlayerId): PlayerNightView;
  /**
   * Les morts de l'aube (`R-40`) : recoit celles des etapes precedentes, dans
   * l'ordre de nuit, et renvoie la liste completee ou corrigee.
   */
  dawn?(state: GameState, deaths: readonly Death[]): Death[];
}

/**
 * Un role qui regarde l'etape d'un autre sans en etre acteur (la Petite fille
 * et les loups) : il a ses propres actions et sa propre vue, voit le minuteur,
 * mais ne bloque jamais l'etape (`docs/04` §Roles en plugins).
 */
export interface NightObserverSpec {
  /** L'etape regardee. */
  readonly step: NightStepId;
  /** Les joueurs vivants qui la regardent. */
  observers(state: GameState): PlayerId[];
  submit(tx: Tx, observer: PlayerId, action: NightAction): EngineError | null;
  actionsFor(state: GameState, observer: PlayerId): ActionDescriptor[];
  viewFor(state: GameState, observer: PlayerId): PlayerNightView;
}

/** L'etape se joue-t-elle cette nuit-la ? */
export function wakesOnNight(wakes: Wakes, nightNumber: number): boolean {
  switch (wakes) {
    case 'never':
      return false;
    case 'firstNight':
      return nightNumber === 1;
    case 'everyNight':
      return true;
    case 'everyOtherNight':
      return nightNumber % 2 === 0;
  }
}
