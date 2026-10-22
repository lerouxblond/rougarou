import { describe, expect, it } from 'vitest';

import { apply, createRng, emptyState, evolve, findRole, registeredRoles } from '../src/index.ts';
import { NARRATOR, setup, T0 } from './dsl.ts';

describe('Purete du moteur (CLAUDE.md regle 3, ADR 0007)', () => {
  it('apply ne modifie jamais l etat d entree', () => {
    const game = setup({
      roles: {
        Alice: 'werewolf',
        Bob: 'villager',
        Chloe: 'villager',
        David: 'villager',
        Eve: 'villager',
      },
    });
    const before = structuredClone(game.state);
    const frozen = deepFreeze(structuredClone(game.state));

    const result = apply(
      frozen,
      { actor: NARRATOR, cmd: { type: 'AdvancePhase', force: false } },
      {
        now: T0,
        rng: createRng(1),
      },
    );

    expect(result.ok).toBe(true);
    expect(frozen).toEqual(before);
  });

  it('une commande refusee ne produit ni evenement ni nouvel etat', () => {
    const state = emptyState();
    const result = apply(
      state,
      { actor: NARRATOR, cmd: { type: 'Deal' } },
      { now: T0, rng: createRng(1) },
    );

    expect(result).toEqual({
      ok: false,
      error: { code: 'WRONG_PHASE', messageKey: 'errors.wrong_phase' },
    });
  });

  it('rejouer le journal redonne l etat (ADR 0002)', () => {
    const game = setup({
      roles: {
        Alice: 'werewolf',
        Bob: 'villager',
        Chloe: 'villager',
        David: 'villager',
        Eve: 'villager',
      },
    }).advance();

    expect(game.log.reduce(evolve, emptyState())).toEqual(game.state);
  });

  it('Undo passe par le journal et non par apply (R-11)', () => {
    const result = apply(
      emptyState(),
      { actor: NARRATOR, cmd: { type: 'Undo' } },
      { now: T0, rng: createRng(1) },
    );

    expect(result.ok).toBe(false);
  });
});

describe('Registre des roles', () => {
  it('contient les roles implementes, et seulement eux', () => {
    expect(
      registeredRoles()
        .map((role) => role.id)
        .sort(),
    ).toEqual(['seer', 'villager', 'werewolf', 'witch']);
    expect(findRole('werewolf')?.team).toBe('wolves');
    expect(findRole('villager')?.team).toBe('village');
    expect(findRole('guardian')).toBeUndefined();
  });
});

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value)) {
      deepFreeze(inner);
    }

    Object.freeze(value);
  }

  return value;
}
