import { getMode } from './modes/index.ts';
import type { GameState, Winner } from './state.ts';

/**
 * Le vainqueur, s'il y en a un (`docs/01` §1). Les conditions viennent du
 * mode ; si plusieurs sont remplies en meme temps, la plus prioritaire
 * l'emporte (`R-06`).
 */
export function checkVictory(state: GameState): Winner | null {
  const conditions = [...getMode(state.options.gameMode).winConditions].sort(
    (left, right) => right.priority - left.priority,
  );

  for (const condition of conditions) {
    const winner = condition.check(state);

    if (winner !== null) {
      return winner;
    }
  }

  return null;
}
