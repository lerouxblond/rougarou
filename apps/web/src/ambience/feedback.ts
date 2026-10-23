import type { Cue } from './cues.ts';

/** Motifs de vibration, en millisecondes (`docs/06` §Retours haptiques). */
const SHORT = [60];
const LONG = [400];
const DOUBLE = [80, 80, 80];

export interface FeedbackContext {
  readonly playMode: 'inPerson' | 'remote';
  /** La phase visible est `NIGHT` (aube masquee comprise, `R-12`). */
  readonly night: boolean;
}

/**
 * La vibration d'un joueur pour un moment (`docs/12` §5, D-03) : jamais la
 * nuit en presentiel, car une vibration s'entend sur une table ; « c'est ton
 * tour » seulement a distance. Aucune pour une action du joueur lui-meme.
 */
export function vibrationFor(cue: Cue, context: FeedbackContext): number[] | null {
  if (context.night && context.playMode === 'inPerson') {
    return null;
  }

  switch (cue) {
    case 'cardDealt':
    case 'voteOpen':
      return SHORT;
    case 'yourTurn':
      return context.playMode === 'remote' ? SHORT : null;
    case 'youDied':
      return DOUBLE;
    case 'victory':
      return LONG;
    case 'nightfall':
    case 'daybreak':
    case 'death':
    case 'mayor':
    case 'voteClose':
      return null;
  }
}

/** Les sons publics joues chez le meneur en M4 (P31). */
export type Sound = 'nightfall' | 'daybreak' | 'knell' | 'fanfare' | 'bell' | 'gong' | 'victory';

/** Le son public d'un moment, ou rien (`docs/12` §5). */
export function soundFor(cue: Cue): Sound | null {
  switch (cue) {
    case 'nightfall':
      return 'nightfall';
    case 'daybreak':
      return 'daybreak';
    case 'death':
      return 'knell';
    case 'mayor':
      return 'fanfare';
    case 'voteOpen':
      return 'bell';
    case 'voteClose':
      return 'gong';
    case 'victory':
      return 'victory';
    case 'cardDealt':
    case 'yourTurn':
    case 'youDied':
      // Privés, ou propres a un joueur : jamais chez le meneur.
      return null;
  }
}
