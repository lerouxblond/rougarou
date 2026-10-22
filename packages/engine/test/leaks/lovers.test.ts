import { playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState } from '../../src/index.ts';
import { setup } from '../dsl.ts';

/**
 * Non-fuite de Cupidon et des amoureux (`CLAUDE.md` regle 2) : seuls les
 * amoureux (et le meneur) connaissent le couple et leurs roles ; Cupidon
 * connait le couple sans les roles ; personne d'autre ne voit rien bouger.
 */

const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'cupid',
  David: 'villager',
  Eve: 'seer',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

const OUTSIDERS = ['David', 'Gaspard', 'Hugo', 'zz-outsider'];

function viewOf(state: GameState, playerId: string): PlayerView {
  const view = projectView(state, { kind: 'player', playerId }) as PlayerView;

  expect(playerViewSchema.safeParse(view).success).toBe(true);
  return view;
}

function snapshot(state: GameState, ids: readonly string[]): Map<string, string> {
  return new Map(ids.map((id) => [id, JSON.stringify(viewOf(state, id))]));
}

describe('Non-fuite : Cupidon et amoureux', () => {
  it('les amoureux n apprennent rien pendant l etape de Cupidon', () => {
    const game = setup({ roles: ROLES }).advance();
    const before = snapshot(game.state, ['Eve', 'Fanny', ...OUTSIDERS]);

    game.link('Chloe', 'Eve', 'Fanny');

    // Les amoureux sont reveilles a l'etape suivante : seuls les autres n'ont rien vu.
    for (const id of OUTSIDERS) {
      expect(JSON.stringify(viewOf(game.state, id)), id).toBe(before.get(id));
    }
  });

  it('Cupidon connait le couple, pas leurs roles', () => {
    const game = setup({ roles: ROLES }).advance().link('Chloe', 'Eve', 'Fanny');
    const cupid = viewOf(game.state, 'Chloe');

    expect(cupid.me?.knowledge).toEqual([{ kind: 'couple', players: ['Eve', 'Fanny'] }]);
    expect(cupid.players.find((seen) => seen.id === 'Eve')?.role).toBeNull();
    expect(cupid.players.find((seen) => seen.id === 'Fanny')?.role).toBeNull();
  });

  it('personne d autre ne connait le couple, pendant la nuit comme le jour', () => {
    const game = setup({ roles: ROLES })
      .advance()
      .link('Chloe', 'Eve', 'Fanny')
      .confirmLove('Eve')
      .confirmLove('Fanny')
      .seerProbe('Eve', 'Gaspard');
    const night = snapshot(game.state, OUTSIDERS);

    game.wolfVote('Alice', 'Hugo').wolfVote('Bob', 'Hugo');

    for (const id of [...OUTSIDERS, 'Alice', 'Bob']) {
      const view = viewOf(game.state, id);

      expect(view.me?.knowledge ?? []).toEqual([]);
      expect(view.players.find((seen) => seen.id === 'Eve')?.role ?? null).toBeNull();
    }

    for (const id of ['David', 'Gaspard', 'zz-outsider']) {
      expect(JSON.stringify(viewOf(game.state, id)), id).toBe(night.get(id));
    }

    // Au jour, rien ne trahit le couple non plus.
    game.advance();

    for (const id of ['David', 'Gaspard']) {
      expect(JSON.stringify(viewOf(game.state, id))).not.toContain('lover');
      expect(JSON.stringify(viewOf(game.state, id))).not.toContain('couple');
    }
  });

  it('le meneur voit le couple', () => {
    const game = setup({ roles: ROLES }).advance().link('Chloe', 'Eve', 'Fanny');
    const view = projectView(game.state, { kind: 'narrator' });

    expect(view.kind === 'narrator' && view.lovers).toEqual(['Eve', 'Fanny']);
  });
});
