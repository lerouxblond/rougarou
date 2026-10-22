import { playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState } from '../../src/index.ts';
import { setup } from '../dsl.ts';

/**
 * Non-fuite de la Voyante (`CLAUDE.md` regle 2) : son resultat n'est vu que
 * d'elle et du meneur, et la nuit des autres reste la meme d'un bout a l'autre.
 */

const ROLES = {
  Alice: 'werewolf',
  Bob: 'seer',
  Chloe: 'villager',
  David: 'villager',
  Eve: 'villager',
} as const;

const OTHERS = ['Alice', 'Chloe', 'David', 'Eve', 'zz-outsider'];

function viewOf(state: GameState, playerId: string): PlayerView {
  const view = projectView(state, { kind: 'player', playerId }) as PlayerView;

  expect(playerViewSchema.safeParse(view).success).toBe(true);
  return view;
}

describe('Non-fuite : Voyante', () => {
  it.each(['role', 'team'] as const)(
    'seerMode %s : personne d autre ne voit le resultat, ni le role sonde',
    (seerMode) => {
      const game = setup({ roles: ROLES, options: { seerMode } }).advance();
      const before = new Map(OTHERS.map((id) => [id, JSON.stringify(viewOf(game.state, id))]));

      game.seerProbe('Bob', 'Chloe');

      for (const id of OTHERS) {
        const view = viewOf(game.state, id);

        expect(view.me?.knowledge ?? []).toEqual([]);
        expect(view.players.find((seen) => seen.id === 'Chloe')?.role ?? null).toBe(
          id === 'Chloe' ? 'villager' : null,
        );
        // Les non-loups n'ont rien vu bouger : l'etape de la Voyante ne se trahit pas.
        if (id !== 'Alice') {
          expect(JSON.stringify(view), id).toBe(before.get(id));
        }
      }

      expect(viewOf(game.state, 'Bob').me?.knowledge).toHaveLength(1);
    },
  );

  it('le resultat reste prive au jour et le lendemain', () => {
    const game = setup({ roles: ROLES })
      .advance()
      .seerProbe('Bob', 'Alice')
      .wolfVote('Alice', 'Eve')
      .advance();

    for (const id of ['Chloe', 'David']) {
      const view = viewOf(game.state, id);

      expect(view.players.find((seen) => seen.id === 'Alice')?.role).toBeNull();
      expect(view.me?.knowledge).toEqual([]);
    }

    expect(viewOf(game.state, 'Bob').players.find((seen) => seen.id === 'Alice')?.role).toBe(
      'werewolf',
    );
  });

  it('la Voyante ne voit l etape des loups ni avant ni apres la sienne', () => {
    const game = setup({ roles: ROLES }).advance().seerProbe('Bob', 'Chloe');

    expect(viewOf(game.state, 'Bob').night).toBeNull();
    expect(viewOf(game.state, 'Bob').deadline).toBeNull();
  });
});
