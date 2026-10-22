import { playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState } from '../../src/index.ts';
import { setup } from '../dsl.ts';

/**
 * Non-fuite de la Sorciere (`CLAUDE.md` regle 2) : la victime n'est vue que
 * d'elle (et des loups qui l'ont choisie), ses potions et son choix d'elle
 * seule, et la cause `witch` jamais d'un joueur.
 */

const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'witch',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

const VILLAGERS = ['David', 'Eve', 'Fanny', 'Gaspard', 'Hugo', 'zz-outsider'];

function viewOf(state: GameState, playerId: string): PlayerView {
  const view = projectView(state, { kind: 'player', playerId }) as PlayerView;

  expect(playerViewSchema.safeParse(view).success).toBe(true);
  return view;
}

describe('Non-fuite : Sorciere', () => {
  it('la nuit des villageois ne bouge pas pendant son etape ni apres son choix', () => {
    const game = setup({ roles: ROLES }).advance();
    const before = new Map(VILLAGERS.map((id) => [id, JSON.stringify(viewOf(game.state, id))]));

    game.wolfVote('Alice', 'David').wolfVote('Bob', 'David');

    for (const id of VILLAGERS) {
      expect(JSON.stringify(viewOf(game.state, id)), id).toBe(before.get(id));
    }

    game.witch('Chloe', { save: true, kill: 'Alice' });

    for (const id of VILLAGERS) {
      expect(JSON.stringify(viewOf(game.state, id)), id).toBe(before.get(id));
    }
  });

  it('les loups ne voient ni son etape, ni ses potions, ni son choix', () => {
    const game = setup({ roles: ROLES })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'David');
    const before = JSON.stringify(viewOf(game.state, 'Alice'));

    expect(viewOf(game.state, 'Alice').night).toBeNull();
    game.witch('Chloe', { save: true });
    expect(JSON.stringify(viewOf(game.state, 'Alice'))).toBe(before);
  });

  it('a l aube, les joueurs voient les morts sans leur cause', () => {
    const game = setup({ roles: ROLES })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'David')
      .witch('Chloe', { kill: 'Eve' })
      .advance();

    for (const id of [...VILLAGERS, 'Alice', 'Chloe']) {
      const text = JSON.stringify(viewOf(game.state, id));

      expect(text).not.toContain('cause');
      expect(text).not.toContain('potions');
    }
  });
});
