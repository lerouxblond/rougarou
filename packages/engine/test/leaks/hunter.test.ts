import { playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState } from '../../src/index.ts';
import { firstNight, setup } from '../dsl.ts';

/**
 * Non-fuite du Chasseur (`CLAUDE.md` regle 2) : son role reste secret tant
 * qu'il vit, et la cause `hunter` ne quitte jamais le serveur.
 */

const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'villager',
  David: 'hunter',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

function viewOf(state: GameState, playerId: string): PlayerView {
  const view = projectView(state, { kind: 'player', playerId }) as PlayerView;

  expect(playerViewSchema.safeParse(view).success).toBe(true);
  return view;
}

describe('Non-fuite : Chasseur', () => {
  it('vivant, son role n est vu de personne d autre, loups compris', () => {
    const game = firstNight(setup({ roles: ROLES }), 'Hugo').advance();

    for (const id of ['Alice', 'Chloe', 'Eve', 'zz-outsider']) {
      expect(viewOf(game.state, id).players.find((seen) => seen.id === 'David')?.role).toBeNull();
    }
  });

  it('la cause de la mort de sa victime n est jamais publique', () => {
    const game = firstNight(setup({ roles: ROLES }), 'David')
      .advance()
      .as('David', { type: 'HunterShoot', playerId: 'Chloe' });

    for (const id of ['Alice', 'Chloe', 'Eve', 'David', 'zz-outsider']) {
      expect(JSON.stringify(viewOf(game.state, id))).not.toContain('hunter"' + ',"cause');
      expect(JSON.stringify(viewOf(game.state, id))).not.toContain('cause');
    }
  });
});
