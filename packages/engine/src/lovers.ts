import type { PlayerId } from '@rougarou/protocol';

import { teamOf } from './roles/index.ts';
import { alivePlayers, type Death, type GameState, type Winner } from './state.ts';

/**
 * Les amoureux (`docs/02`, Cupidon) : ce n'est pas un role mais un lien entre
 * deux joueurs, que le coeur consulte pour le chagrin (`R-41`) et la victoire
 * du couple mixte (`R-03`).
 */

/** L'autre amoureux de `playerId`, s'il en est un. */
export function partnerOf(state: GameState, playerId: PlayerId): PlayerId | null {
  const { lovers } = state;

  if (!lovers?.includes(playerId)) {
    return null;
  }

  return lovers[0] === playerId ? lovers[1] : lovers[0];
}

/** `R-41` : a la mort d'un amoureux, l'autre meurt de chagrin, dans la meme vague (`R-42`). */
export function griefDeaths(state: GameState, dead: PlayerId): Death[] {
  const partner = partnerOf(state, dead);

  return partner !== null && state.players[partner]?.alive === true
    ? [{ playerId: partner, cause: 'grief' }]
    : [];
}

/**
 * `R-03` : un couple loup et non-loup gagne quand ses deux amoureux sont les
 * deux seuls vivants. Un couple du meme camp n'est pas un vainqueur a part.
 */
export function mixedLoversWin(state: GameState): Winner | null {
  const { lovers } = state;

  if (lovers === null) {
    return null;
  }

  const wolves = lovers.filter((id) => teamOf(state, id) === 'wolves').length;
  const alive = alivePlayers(state).map((player) => player.id);

  return wolves === 1 && alive.length === 2 && lovers.every((id) => alive.includes(id))
    ? 'lovers'
    : null;
}
