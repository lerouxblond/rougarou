import { playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState } from '../../src/index.ts';
import { setup, toNextNight, type GameDriver } from '../dsl.ts';

/**
 * Non-fuite de la Petite fille (`CLAUDE.md` regle 2) : jamais un identifiant
 * de loup ni un pseudo complet dans ce qu'elle voit de la meute, seuls les
 * loups recoivent les suspects, et personne ne voit la nuit bouger.
 */

const ROLES = {
  Alexane: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'little-girl',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

const WOLVES = ['Alexane', 'Bob'];
const VILLAGERS = ['David', 'Eve', 'Fanny', 'Gaspard', 'Hugo', 'zz-outsider'];

/** Graine ou elle est reperee la nuit 1 avec un risque de 50 % (voir `roles/little-girl.test.ts`). */
const CAUGHT_SEED = 2;
const RISKY = { littleGirlRisk: { base: 50, increase: 25 } };

function viewOf(state: GameState, playerId: string): PlayerView {
  const view = projectView(state, { kind: 'player', playerId }) as PlayerView;

  expect(playerViewSchema.safeParse(view).success).toBe(true);
  return view;
}

/** Ce qu'elle sait de la meute : sa vue de l'etape et ses infos. */
function spyText(game: GameDriver): string {
  const view = viewOf(game.state, 'Chloe');

  return JSON.stringify({ night: view.night, knowledge: view.me?.knowledge });
}

describe('Non-fuite : Petite fille', () => {
  it('jamais un identifiant ni un pseudo complet de loup dans ce qu elle voit', () => {
    for (let seed = 1; seed <= 6; seed += 1) {
      const game = setup({ roles: ROLES, options: RISKY, seed })
        .advance()
        .wolfVote('Alexane', 'David')
        .spy('Chloe')
        .wolfVote('Bob', 'Eve');

      for (const wolf of WOLVES) {
        expect(spyText(game)).not.toContain(`"${wolf}"`);
        expect(spyText(game)).not.toContain(wolf);
      }
    }
  });

  it('les loups ne savent pas qu elle espionne tant qu elle n est pas reperee', () => {
    const game = setup({ roles: ROLES, options: { littleGirlRisk: { base: 0, increase: 0 } } })
      .advance()
      .wolfVote('Alexane', 'David');
    const before = new Map(WOLVES.map((id) => [id, JSON.stringify(viewOf(game.state, id))]));

    game.spy('Chloe');

    for (const wolf of WOLVES) {
      expect(JSON.stringify(viewOf(game.state, wolf))).toBe(before.get(wolf));
    }
  });

  it('seuls les loups recoivent les suspects, et la nuit des autres ne bouge pas', () => {
    const game = setup({ roles: ROLES, options: RISKY, seed: CAUGHT_SEED }).advance();
    const before = new Map(VILLAGERS.map((id) => [id, JSON.stringify(viewOf(game.state, id))]));

    game.spy('Chloe');

    for (const id of VILLAGERS) {
      expect(JSON.stringify(viewOf(game.state, id)), id).toBe(before.get(id));
    }

    for (const wolf of WOLVES) {
      expect(viewOf(game.state, wolf).me?.knowledge[0]?.kind).toBe('littleGirlSuspects');
    }

    expect(JSON.stringify(viewOf(game.state, 'Chloe').me?.knowledge)).not.toContain('Suspects');
  });

  it('les suspects restent prives au jour et les nuits suivantes', () => {
    const game = setup({ roles: ROLES, options: RISKY, seed: CAUGHT_SEED })
      .advance()
      .spy('Chloe')
      .wolfVote('Alexane', 'Hugo')
      .wolfVote('Bob', 'Hugo');

    toNextNight(game);

    for (const id of ['David', 'Eve', 'Fanny', 'Gaspard', 'Chloe']) {
      expect(JSON.stringify(viewOf(game.state, id))).not.toContain('littleGirlSuspects');
    }

    expect(viewOf(game.state, 'Bob').me?.knowledge[0]?.kind).toBe('littleGirlSuspects');
  });
});
