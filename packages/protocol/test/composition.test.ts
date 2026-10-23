import { describe, expect, it } from 'vitest';

import { balanceOf, ROLE_WEIGHTS } from '../src/index.ts';

describe('Indicateur d equilibre (docs/02 §Compositions)', () => {
  it('donne aux roles classiques les poids de docs/02', () => {
    expect(ROLE_WEIGHTS).toMatchObject({
      villager: 1,
      werewolf: -6,
      seer: 7,
      witch: 4,
      hunter: 3,
      cupid: -2,
      'little-girl': 3,
    });
  });

  it.each([
    [{ werewolf: 1, villager: 4 }, -2, 'balanced'],
    [{ werewolf: 1, villager: 7 }, 1, 'balanced'],
    [{ werewolf: 2, seer: 1, witch: 1, hunter: 1, villager: 3 }, 5, 'village'],
    [{ werewolf: 2, villager: 3 }, -9, 'wolves'],
    [{ werewolf: 1, villager: 9 }, 3, 'balanced'],
    [{ werewolf: 1, villager: 2 }, -4, 'wolves'],
  ] as const)('%j vaut %i : %s', (composition, score, verdict) => {
    expect(balanceOf(composition)).toEqual({ score, verdict });
  });

  it('une composition vide est equilibree', () => {
    expect(balanceOf({})).toEqual({ score: 0, verdict: 'balanced' });
  });
});
